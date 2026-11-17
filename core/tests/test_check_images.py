"""Stored images of web checks: removal when a check stops without a result,
and refreshing signed image links before they expire.

Supabase storage is always mocked.
"""
import base64
import json
import time
from datetime import timedelta
from unittest.mock import Mock, patch

from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from core.models import Check, ImageVerification
from core.services import checks as checks_service
from core.tasks import run_image_check
from core.tests.test_checks import UPLOAD_OK, MockSupabaseUser, jpeg_upload, make_check, new_token

IMAGE_PATH = "anonymous/ai_detection/20261116_abcd.jpeg"
IMAGE_URL = "https://storage.example.com/a.jpeg"
DELETE = "core.services.checks.delete_image_from_supabase"
SIGN = "core.services.checks.create_signed_image_url"


def image_check(**overrides):
    fields = {"kind": "image_ai", "claim": "", "state": "running", "verdict": "",
              "image_path": IMAGE_PATH, "image_url": IMAGE_URL}
    fields.update(overrides)
    return make_check(**fields)


def _b64(data):
    return base64.urlsafe_b64encode(json.dumps(data).encode()).rstrip(b"=").decode()


def signed_url(exp=None, payload=None):
    if payload is None:
        payload = {"url": "image-verifications/x.jpeg"}
        if exp is not None:
            payload["exp"] = int(exp)
    token = f"{_b64({'alg': 'HS256', 'typ': 'JWT'})}.{_b64(payload)}.c2ln"
    return f"https://test.supabase.co/storage/v1/object/sign/image-verifications/x.jpeg?token={token}"


def days_from_now(days):
    return time.time() + days * 86400


# ---------------------------------------------------------------------------
# Removing the image of a check that ends in error or cancelled
# ---------------------------------------------------------------------------
@patch(DELETE, return_value={"success": True})
class ImageRemovalTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.token = new_token()

    def assertImageCleared(self, check):
        check.refresh_from_db()
        self.assertEqual((check.image_path, check.image_url), ("", ""))

    @patch("core.tasks.detect_ai_generated_image", side_effect=RuntimeError("boom"))
    def test_task_exception_removes_image(self, detect, delete):
        check = image_check()
        self.assertEqual(run_image_check(check.pk)["state"], "error")
        delete.assert_called_once_with(IMAGE_PATH)
        self.assertImageCleared(check)

    @patch("core.tasks.verify_image_content")
    def test_task_error_status_removes_image(self, verify, delete):
        verify.return_value = {"statut": "ERREUR", "explication": "x", "confidence": 0}
        check = image_check(kind="image_content")
        run_image_check(check.pk)
        delete.assert_called_once_with(IMAGE_PATH)
        self.assertImageCleared(check)

    @patch("core.tasks.detect_ai_generated_image")
    def test_successful_check_keeps_image(self, detect, delete):
        detect.return_value = {"statut": "AUTHENTIQUE", "explication": "ok", "confidence": 70}
        check = image_check()
        run_image_check(check.pk)
        delete.assert_not_called()
        check.refresh_from_db()
        self.assertEqual((check.state, check.image_path, check.image_url), ("done", IMAGE_PATH, IMAGE_URL))

    @patch("core.tasks.detect_ai_generated_image", side_effect=RuntimeError("boom"))
    def test_image_shared_with_legacy_record_is_kept(self, detect, delete):
        ImageVerification.objects.create(
            supabase_user_id=MockSupabaseUser().id, user_email="a@example.com", image_path=IMAGE_PATH,
            image_url=IMAGE_URL, original_filename="a.jpeg", verification_type="ai_detection",
            status="ERREUR", explanation="x",
        )
        check = image_check()
        run_image_check(check.pk)
        delete.assert_not_called()
        self.assertImageCleared(check)

    @patch("core.tasks.detect_ai_generated_image", side_effect=RuntimeError("boom"))
    def test_storage_failure_never_breaks_the_task(self, detect, delete):
        for failure in ({"side_effect": RuntimeError("storage down")},
                        {"return_value": {"success": False, "error": "nope"}}):
            with self.subTest(**{k: str(v) for k, v in failure.items()}):
                delete.reset_mock(side_effect=True, return_value=True)
                delete.configure_mock(**failure)
                check = image_check()
                with self.assertLogs("core.services.checks", level="WARNING"):
                    result = run_image_check(check.pk)
                self.assertEqual(result["state"], "error")
                check.refresh_from_db()
                self.assertEqual(check.state, "error")
                # The path is kept so a later delete of the check can retry.
                self.assertEqual(check.image_path, IMAGE_PATH)

    def test_text_check_without_image_never_touches_storage(self, delete):
        check = make_check(state="running", verdict="")
        Check.objects.filter(pk=check.pk).update(created_at=timezone.now() - timedelta(seconds=301))
        self.assertEqual(self.client.get(f"/api/checks/{check.public_id}/").json()["state"], "error")
        delete.assert_not_called()

    def test_cancel_removes_image(self, delete):
        check = image_check(anon_token=self.token)
        response = self.client.post(f"/api/checks/{check.public_id}/cancel/", HTTP_X_ANON_TOKEN=self.token)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.json()["state"], "cancelled")
        self.assertEqual(response.json()["image_url"], "")
        delete.assert_called_once_with(IMAGE_PATH)
        self.assertImageCleared(check)

    def test_cancel_storage_failure_still_cancels(self, delete):
        delete.side_effect = RuntimeError("storage down")
        check = image_check(anon_token=self.token)
        response = self.client.post(f"/api/checks/{check.public_id}/cancel/", HTTP_X_ANON_TOKEN=self.token)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.json()["state"], "cancelled")

    def test_stale_expiry_on_read_removes_image(self, delete):
        check = image_check()
        Check.objects.filter(pk=check.pk).update(created_at=timezone.now() - timedelta(seconds=301))
        body = self.client.get(f"/api/checks/{check.public_id}/").json()
        self.assertEqual((body["state"], body["image_url"]), ("error", ""))
        delete.assert_called_once_with(IMAGE_PATH)
        self.assertImageCleared(check)

    def test_stale_expiry_in_quota_check_removes_image(self, delete):
        stale = image_check(anon_token=self.token)
        fresh = image_check(anon_token=self.token, image_path="anonymous/ai_detection/fresh.jpeg")
        Check.objects.filter(pk=stale.pk).update(created_at=timezone.now() - timedelta(seconds=301))
        self.assertTrue(checks_service.anon_quota_reached(self.token))  # the fresh one still counts
        delete.assert_called_once_with(IMAGE_PATH)
        self.assertImageCleared(stale)
        fresh.refresh_from_db()
        self.assertEqual(fresh.image_path, "anonymous/ai_detection/fresh.jpeg")

    def test_expire_stale_checks_without_stale_rows_is_a_noop(self, delete):
        image_check()
        self.assertEqual(checks_service.expire_stale_checks(Check.objects.all()), 0)
        delete.assert_not_called()

    @patch("core.views_checks.upload_image_to_supabase", return_value=UPLOAD_OK)
    @patch("core.views_checks.run_image_check")
    def test_failed_enqueue_removes_uploaded_image(self, task, upload, delete):
        task.delay.side_effect = RuntimeError("broker down")
        response = self.client.post(
            "/api/checks/", {"kind": "image_ai", "image": jpeg_upload()}, format="multipart",
            HTTP_X_ANON_TOKEN=self.token,
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        body = response.json()
        self.assertEqual((body["state"], body["image_url"]), ("error", ""))
        delete.assert_called_once_with(UPLOAD_OK["file_path"])
        self.assertImageCleared(Check.objects.get())

    def test_delete_view_uses_the_same_rule(self, delete):
        user = MockSupabaseUser()
        check = image_check(owner_id=user.id, state="done", verdict="ia_detectee")
        self.client.force_authenticate(user=user)
        self.assertEqual(self.client.delete(f"/api/checks/{check.public_id}/").status_code,
                         status.HTTP_204_NO_CONTENT)
        delete.assert_called_once_with(IMAGE_PATH)
        self.assertFalse(Check.objects.exists())

    def test_delete_view_storage_failure_still_deletes(self, delete):
        delete.side_effect = RuntimeError("storage down")
        user = MockSupabaseUser()
        check = image_check(owner_id=user.id, state="done", verdict="ia_detectee")
        self.client.force_authenticate(user=user)
        self.assertEqual(self.client.delete(f"/api/checks/{check.public_id}/").status_code,
                         status.HTTP_204_NO_CONTENT)
        self.assertFalse(Check.objects.exists())

    def test_discard_check_image_never_raises(self, delete):
        check = image_check()
        broken = Mock()
        broken.filter.side_effect = RuntimeError("db down")
        with patch.object(ImageVerification, "objects", broken), \
                self.assertLogs("core.services.checks", level="ERROR"):
            checks_service.discard_check_image(check)
        delete.assert_not_called()
        check.refresh_from_db()
        self.assertEqual(check.image_path, IMAGE_PATH)


# ---------------------------------------------------------------------------
# Refreshing signed image links
# ---------------------------------------------------------------------------
class SignedUrlRefreshTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        checks_service._SIGNING_FAILURES.clear()

    def get(self, check):
        response = self.client.get(f"/api/checks/{check.public_id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        return response.json()

    @patch(SIGN)
    def test_fresh_signed_url_makes_no_signing_call(self, sign):
        url = signed_url(days_from_now(200))
        check = image_check(state="done", verdict="ia_detectee", image_url=url)
        self.assertEqual(self.get(check)["image_url"], url)
        sign.assert_not_called()

    @patch(SIGN, return_value=signed_url(days_from_now(365)))
    def test_expiring_missing_or_past_expiry_is_refreshed_and_saved(self, sign):
        for label, url in (("soon", signed_url(days_from_now(10))),
                           ("past", signed_url(days_from_now(-3))),
                           ("missing", signed_url())):
            with self.subTest(label):
                sign.reset_mock()
                check = image_check(state="done", verdict="ia_detectee", image_url=url)
                self.assertEqual(self.get(check)["image_url"], sign.return_value)
                sign.assert_called_once_with(IMAGE_PATH)
                check.refresh_from_db()
                self.assertEqual(check.image_url, sign.return_value)

    @patch(SIGN)
    def test_unsigned_or_unparseable_urls_are_left_alone(self, sign):
        cases = [
            IMAGE_URL,
            "https://test.supabase.co/storage/v1/object/sign/b/x.jpeg?token=not-a-jwt",
            "https://test.supabase.co/storage/v1/object/sign/b/x.jpeg?token=a.%%%.c",
            signed_url(payload=["not", "an", "object"]),
            "",
        ]
        for url in cases:
            with self.subTest(url=url):
                check = image_check(state="done", verdict="ia_detectee", image_url=url)
                self.assertEqual(self.get(check)["image_url"], url)
        sign.assert_not_called()

    @patch(SIGN)
    def test_check_without_image_path_is_left_alone(self, sign):
        url = signed_url(days_from_now(1))
        check = image_check(state="done", verdict="ia_detectee", image_url=url, image_path="")
        self.assertEqual(self.get(check)["image_url"], url)
        sign.assert_not_called()

    @patch(SIGN, side_effect=RuntimeError("Object not found"))
    def test_signing_failure_returns_old_url_and_is_not_retried_within_the_hour(self, sign):
        url = signed_url(days_from_now(5))
        check = image_check(state="done", verdict="ia_detectee", image_url=url)
        now = 1000.0
        with patch("core.services.checks._monotonic", side_effect=lambda: now):
            with self.assertLogs("core.services.checks", level="WARNING"):
                self.assertEqual(self.get(check)["image_url"], url)
            self.assertEqual(self.get(check)["image_url"], url)
            self.assertEqual(sign.call_count, 1)

            now += checks_service.SIGNING_RETRY_SECONDS + 1
            sign.side_effect = None
            sign.return_value = signed_url(days_from_now(365))
            self.assertEqual(self.get(check)["image_url"], sign.return_value)
            self.assertEqual(sign.call_count, 2)
        self.assertNotIn(check.pk, checks_service._SIGNING_FAILURES)

    @patch(SIGN, return_value="")
    def test_empty_signing_result_counts_as_failure(self, sign):
        url = signed_url(days_from_now(5))
        check = image_check(state="done", verdict="ia_detectee", image_url=url)
        with self.assertLogs("core.services.checks", level="WARNING"):
            self.assertEqual(self.get(check)["image_url"], url)
        check.refresh_from_db()
        self.assertEqual(check.image_url, url)

    @patch(SIGN)
    def test_list_views_never_sign(self, sign):
        for _ in range(3):
            image_check(state="done", verdict="ia_detectee", listed=True, image_url=signed_url(days_from_now(1)))
        response = self.client.get("/api/checks/?scope=library")
        self.assertEqual(len(response.json()["results"]), 3)
        sign.assert_not_called()


class CreateSignedImageUrlTest(TestCase):
    @patch("core.services.supabase_storage.get_supabase_client")
    def test_returns_signed_url(self, get_client):
        from core.services.supabase_storage import create_signed_image_url

        bucket = get_client.return_value.storage.from_.return_value
        bucket.create_signed_url.return_value = {"signedURL": "https://s/x?token=t"}
        self.assertEqual(create_signed_image_url("a/b.jpeg"), "https://s/x?token=t")
        get_client.return_value.storage.from_.assert_called_with("image-verifications")
        bucket.create_signed_url.assert_called_once_with("a/b.jpeg", 31536000)

    @patch("core.services.supabase_storage.get_supabase_client")
    def test_missing_signed_url_raises(self, get_client):
        from core.services.supabase_storage import create_signed_image_url

        get_client.return_value.storage.from_.return_value.create_signed_url.return_value = {}
        with self.assertRaises(RuntimeError):
            create_signed_image_url("a/b.jpeg")
