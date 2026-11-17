"""Tests for the public checks API (/api/checks/).

External services (text analysis, image analysis, Supabase storage) are always
mocked. Celery runs eagerly in tests, so creating a check runs its task inline.
"""
import importlib
import secrets
import uuid
from datetime import timedelta
from unittest.mock import patch

from celery.exceptions import SoftTimeLimitExceeded
from django.apps import apps as django_apps
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import RequestFactory, TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from core.models import Check, CheckFeedback, Fact, ImageVerification, Submission
from core.services import checks as checks_service
from core.services.checks import (
    map_image_status,
    map_text_status,
    normalize_sources,
    serialize_summary,
)
from core.tasks import SAFE_ANALYSIS_ERROR_MESSAGE, run_image_check, run_text_check


class MockSupabaseUser:
    """Mock Supabase user object, mirroring core/tests/test_views.py."""

    def __init__(self, email="testuser@example.com"):
        self.id = uuid.uuid4()
        self.email = email
        self.user_metadata = {"full_name": "Test User"}
        self.is_authenticated = True


JPEG_BYTES = b"\xff\xd8\xff\xe0" + b"\x00" * 64
PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
WEBP_BYTES = b"RIFF\x00\x00\x00\x00WEBPVP8 " + b"\x00" * 64
GIF_BYTES = b"GIF89a" + b"\x00" * 64

TEXT_RESULT = (
    {"statut": "VRAIE", "explication": "Les sources confirment l'information."},
    [
        {"title": "Article A", "link": "https://www.example.com/a", "snippet": "Extrait", "date": "2026-11-01"},
        {"url": "https://news.example.org/b"},
        "pas un dict",
        None,
    ],
)
UPLOAD_OK = {
    "success": True,
    "file_path": "anonymous/content/20261116_abcd.jpeg",
    "public_url": "https://storage.example.com/signed/abcd.jpeg",
    "bucket": "image-verifications",
}


def new_token():
    return secrets.token_hex(16)


def make_check(**overrides):
    fields = {
        "kind": "text",
        "claim": "Le barrage de Sélingué est fermé",
        "state": "done",
        "verdict": "vrai",
        "explanation": "Explication",
        "sources": [],
    }
    fields.update(overrides)
    return Check.objects.create(**fields)


def jpeg_upload(name="photo.jpg", content=JPEG_BYTES, content_type="image/jpeg"):
    return SimpleUploadedFile(name, content, content_type=content_type)


class CheckApiTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = MockSupabaseUser()
        self.token = new_token()

    def anon(self, token=None):
        """Client headers for an anonymous browser holding a token."""
        return {"HTTP_X_ANON_TOKEN": token or self.token}

    def assertError(self, response, http_status, code):
        self.assertEqual(response.status_code, http_status, response.content)
        self.assertEqual(response.json()["code"], code)
        self.assertTrue(response.json()["error"])


# ---------------------------------------------------------------------------
# POST checks/
# ---------------------------------------------------------------------------
@patch("core.tasks.analyze_text", return_value=TEXT_RESULT)
class CreateTextCheckTest(CheckApiTestCase):
    def test_signed_in_text_check_is_created_and_analysed(self, analyze_text):
        self.client.force_authenticate(user=self.user)
        response = self.client.post("/api/checks/", {"kind": "text", "text": "  Le barrage est fermé  "}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        body = response.json()
        self.assertEqual(len(body["id"]), 10)
        self.assertEqual(body["kind"], "text")
        self.assertEqual(body["claim"], "Le barrage est fermé")
        self.assertEqual(body["state"], "done")
        self.assertEqual(body["verdict"], "vrai")
        self.assertEqual(body["explanation"], "Les sources confirment l'information.")
        self.assertEqual(
            body["sources"],
            [
                {"title": "Article A", "url": "https://www.example.com/a", "domain": "example.com",
                 "date": "2026-11-01", "snippet": "Extrait"},
                {"title": "news.example.org", "url": "https://news.example.org/b", "domain": "news.example.org",
                 "date": "", "snippet": ""},
            ],
        )
        self.assertIsNone(body["confidence"])
        self.assertIsNotNone(body["completed_at"])
        self.assertFalse(body["listed"])
        self.assertTrue(body["is_owner"])
        analyze_text.assert_called_once_with("Le barrage est fermé")

        check = Check.objects.get(public_id=body["id"])
        self.assertEqual(str(check.owner_id), str(self.user.id))
        self.assertEqual(check.anon_token, "")
        # New checks never feed the legacy fact library.
        self.assertEqual(Fact.objects.count(), 0)

    def test_anonymous_text_check_with_token(self, analyze_text):
        response = self.client.post("/api/checks/", {"kind": "text", "text": "Une affirmation"}, format="json", **self.anon())

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        self.assertTrue(response.json()["is_owner"])
        check = Check.objects.get(public_id=response.json()["id"])
        self.assertIsNone(check.owner_id)
        self.assertEqual(check.anon_token, self.token)
        self.assertEqual(len(check.ip_hash), 64)
        self.assertNotIn("127.0.0.1", check.ip_hash)

    def test_invalid_inputs_return_400_invalid(self, analyze_text):
        cases = [
            ({"kind": "text", "text": "   "}, self.anon()),
            ({"kind": "text"}, self.anon()),
            ({"kind": "text", "text": "x" * 1001}, self.anon()),
            ({"kind": "video", "text": "Une affirmation"}, self.anon()),
            ({"kind": "text", "text": "Une affirmation"}, {}),
            ({"kind": "text", "text": "Une affirmation"}, {"HTTP_X_ANON_TOKEN": "court"}),
        ]
        for payload, headers in cases:
            with self.subTest(payload=payload, headers=headers):
                response = self.client.post("/api/checks/", payload, format="json", **headers)
                self.assertError(response, status.HTTP_400_BAD_REQUEST, "invalid")
        self.assertEqual(Check.objects.count(), 0)
        analyze_text.assert_not_called()

    def test_text_of_exactly_1000_chars_is_accepted(self, analyze_text):
        response = self.client.post("/api/checks/", {"kind": "text", "text": "x" * 1000}, format="json", **self.anon())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_second_anonymous_check_hits_anon_quota(self, analyze_text):
        first = self.client.post("/api/checks/", {"kind": "text", "text": "Première"}, format="json", **self.anon())
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        second = self.client.post("/api/checks/", {"kind": "text", "text": "Deuxième"}, format="json", **self.anon())
        self.assertError(second, status.HTTP_403_FORBIDDEN, "anon_quota")
        self.assertEqual(Check.objects.count(), 1)

    def test_error_and_cancelled_do_not_use_anon_quota(self, analyze_text):
        make_check(anon_token=self.token, state="error", verdict="")
        make_check(anon_token=self.token, state="cancelled", verdict="")
        stale = make_check(anon_token=self.token, state="running", verdict="")
        Check.objects.filter(pk=stale.pk).update(created_at=timezone.now() - timedelta(seconds=301))

        response = self.client.post("/api/checks/", {"kind": "text", "text": "Une affirmation"}, format="json", **self.anon())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)

    def test_ip_daily_cap(self, analyze_text):
        for i in range(checks_service.ANON_IP_DAILY_CAP):
            response = self.client.post("/api/checks/", {"kind": "text", "text": f"Affirmation {i}"}, format="json",
                                        **self.anon(new_token()))
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        response = self.client.post("/api/checks/", {"kind": "text", "text": "Une de trop"}, format="json",
                                    **self.anon(new_token()))
        self.assertError(response, status.HTTP_429_TOO_MANY_REQUESTS, "ip_cap")

    def test_ip_cap_does_not_apply_to_signed_in_users(self, analyze_text):
        ip_hash = checks_service.hash_ip("127.0.0.1")
        for _ in range(checks_service.ANON_IP_DAILY_CAP):
            make_check(ip_hash=ip_hash)
        self.client.force_authenticate(user=self.user)
        response = self.client.post("/api/checks/", {"kind": "text", "text": "Une affirmation"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_ip_is_taken_from_last_forwarded_hop(self, analyze_text):
        self.client.post("/api/checks/", {"kind": "text", "text": "Une affirmation"}, format="json",
                         HTTP_X_FORWARDED_FOR="1.1.1.1, 203.0.113.9", **self.anon())
        self.assertEqual(Check.objects.get().ip_hash, checks_service.hash_ip("203.0.113.9"))

    def test_analysis_error_status_becomes_error_state(self, analyze_text):
        analyze_text.return_value = ({"statut": "ERREUR", "explication": "Traceback: KeyError('secret')"}, [])
        response = self.client.post("/api/checks/", {"kind": "text", "text": "Une affirmation"}, format="json", **self.anon())

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        body = response.json()
        self.assertEqual(body["state"], "error")
        self.assertIsNone(body["verdict"])
        self.assertEqual(body["explanation"], SAFE_ANALYSIS_ERROR_MESSAGE)
        self.assertNotIn("KeyError", response.content.decode())

    def test_analysis_exception_never_leaks(self, analyze_text):
        analyze_text.side_effect = RuntimeError("connexion refusée à 10.0.0.3 avec clé sk-123")
        response = self.client.post("/api/checks/", {"kind": "text", "text": "Une affirmation"}, format="json", **self.anon())

        body = response.json()
        self.assertEqual(body["state"], "error")
        self.assertEqual(body["explanation"], SAFE_ANALYSIS_ERROR_MESSAGE)
        self.assertNotIn("sk-123", response.content.decode())

    def test_soft_time_limit_becomes_error(self, analyze_text):
        analyze_text.side_effect = SoftTimeLimitExceeded()
        response = self.client.post("/api/checks/", {"kind": "text", "text": "Une affirmation"}, format="json", **self.anon())
        self.assertEqual(response.json()["state"], "error")
        self.assertEqual(response.json()["explanation"], SAFE_ANALYSIS_ERROR_MESSAGE)

    def test_queue_failure_marks_check_error(self, analyze_text):
        with patch("core.views_checks.run_text_check.delay", side_effect=ConnectionError("redis down")):
            response = self.client.post("/api/checks/", {"kind": "text", "text": "Une affirmation"}, format="json",
                                        **self.anon())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()["state"], "error")
        self.assertNotIn("redis", response.content.decode())

    def test_invalid_bearer_token_returns_french_auth_error(self, analyze_text):
        with patch("core.authentication.create_client", side_effect=RuntimeError("jwt expired: raw detail")):
            response = self.client.post("/api/checks/", {"kind": "text", "text": "Une affirmation"}, format="json",
                                        HTTP_AUTHORIZATION="Bearer bad-token")
        self.assertError(response, status.HTTP_401_UNAUTHORIZED, "auth_required")
        self.assertNotIn("raw detail", response.content.decode())

    def test_malformed_json_returns_invalid(self, analyze_text):
        response = self.client.post("/api/checks/", "{not json", content_type="application/json", **self.anon())
        self.assertError(response, status.HTTP_400_BAD_REQUEST, "invalid")


@patch("core.views_checks.upload_image_to_supabase", return_value=UPLOAD_OK)
class CreateImageCheckTest(CheckApiTestCase):
    @patch("core.tasks.verify_image_content")
    def test_anonymous_image_content_check(self, verify_image_content, upload):
        verify_image_content.return_value = {
            "statut": "FAUSSE", "explication": "La photo date de 2019.", "details": {}, "confidence": 87,
        }
        response = self.client.post(
            "/api/checks/",
            {"kind": "image_content", "image": jpeg_upload(), "claim_text": "Photo de la crue d'hier"},
            format="multipart",
            **self.anon(),
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        body = response.json()
        self.assertEqual(body["kind"], "image_content")
        self.assertEqual(body["claim"], "Photo de la crue d'hier")
        self.assertEqual(body["image_url"], UPLOAD_OK["public_url"])
        self.assertEqual(body["state"], "done")
        self.assertEqual(body["verdict"], "faux")
        self.assertEqual(body["confidence"], 87)
        self.assertEqual(body["sources"], [])
        self.assertNotIn("image_path", body)

        upload_args = upload.call_args.args
        self.assertEqual(upload_args[1], "anonymous")
        self.assertEqual(upload_args[2], "content")
        self.assertTrue(upload_args[0].name.endswith(".jpeg"))
        verify_image_content.assert_called_once_with(UPLOAD_OK["public_url"], "Photo de la crue d'hier")
        self.assertEqual(Check.objects.get().image_path, UPLOAD_OK["file_path"])

    @patch("core.tasks.detect_ai_generated_image")
    def test_signed_in_ai_detection_check(self, detect, upload):
        detect.return_value = {"statut": "AUTHENTIQUE", "explication": "Aucun artefact.", "details": {}, "confidence": 70}
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            "/api/checks/",
            {"kind": "image_ai", "image": jpeg_upload("p.png", PNG_BYTES, "image/png")},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        self.assertEqual(response.json()["verdict"], "ia_non_detectee")
        self.assertEqual(upload.call_args.args[1], str(self.user.id))
        self.assertEqual(upload.call_args.args[2], "ai_detection")
        detect.assert_called_once_with(UPLOAD_OK["public_url"])

    @patch("core.tasks.detect_ai_generated_image")
    def test_webp_is_accepted(self, detect, upload):
        detect.return_value = {"statut": "IA_DÉTECTÉE", "explication": "Mains déformées.", "details": {}, "confidence": 91}
        response = self.client.post(
            "/api/checks/", {"kind": "image_ai", "image": jpeg_upload("p.webp", WEBP_BYTES, "image/webp")},
            format="multipart", **self.anon(),
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        self.assertEqual(response.json()["verdict"], "ia_detectee")

    @patch("core.tasks.verify_image_content")
    def test_image_analysis_error(self, verify_image_content, upload):
        verify_image_content.return_value = {
            "statut": "ERREUR", "explication": "Une erreur s'est produite: boom", "details": {}, "confidence": 0,
        }
        response = self.client.post(
            "/api/checks/", {"kind": "image_content", "image": jpeg_upload()}, format="multipart", **self.anon(),
        )
        body = response.json()
        self.assertEqual(body["state"], "error")
        self.assertIsNone(body["verdict"])
        self.assertIsNone(body["confidence"])
        self.assertNotIn("boom", response.content.decode())

    def test_image_not_jpeg_png_webp_rejected(self, upload):
        cases = [
            jpeg_upload("anim.gif", GIF_BYTES, "image/gif"),
            # Declared as JPEG but the bytes are not.
            jpeg_upload("fake.jpg", GIF_BYTES, "image/jpeg"),
        ]
        for image in cases:
            with self.subTest(name=image.name):
                response = self.client.post(
                    "/api/checks/", {"kind": "image_content", "image": image}, format="multipart", **self.anon(),
                )
                self.assertError(response, status.HTTP_400_BAD_REQUEST, "invalid")
        upload.assert_not_called()

    def test_missing_image_rejected(self, upload):
        response = self.client.post("/api/checks/", {"kind": "image_ai"}, format="multipart", **self.anon())
        self.assertError(response, status.HTTP_400_BAD_REQUEST, "invalid")

    def test_image_over_10mb_rejected(self, upload):
        big = JPEG_BYTES + b"\x00" * (10 * 1024 * 1024)
        response = self.client.post(
            "/api/checks/", {"kind": "image_content", "image": jpeg_upload("big.jpg", big)},
            format="multipart", **self.anon(),
        )
        self.assertError(response, status.HTTP_400_BAD_REQUEST, "invalid")
        upload.assert_not_called()
        self.assertEqual(Check.objects.count(), 0)

    def test_upload_failure_returns_safe_error(self, upload):
        upload.return_value = {"success": False, "error": "bucket secret-bucket missing", "file_path": None,
                               "public_url": None}
        response = self.client.post(
            "/api/checks/", {"kind": "image_content", "image": jpeg_upload()}, format="multipart", **self.anon(),
        )
        self.assertError(response, status.HTTP_502_BAD_GATEWAY, "upload_failed")
        self.assertNotIn("secret-bucket", response.content.decode())
        self.assertEqual(Check.objects.count(), 0)


# ---------------------------------------------------------------------------
# GET / PATCH / DELETE checks/<id>/
# ---------------------------------------------------------------------------
class CheckDetailTest(CheckApiTestCase):
    def test_get_check_is_public(self):
        check = make_check(owner_id=self.user.id, sources=[{"title": "A", "url": "https://a.org", "domain": "a.org",
                                                              "date": "", "snippet": ""}])
        response = self.client.get(f"/api/checks/{check.public_id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertEqual(
            set(body),
            {"id", "kind", "claim", "image_url", "state", "verdict", "explanation", "sources", "confidence",
             "created_at", "completed_at", "listed", "is_owner"},
        )
        self.assertEqual(body["id"], check.public_id)
        self.assertFalse(body["is_owner"])

    def test_get_check_is_owner_for_owner_and_anon_holder(self):
        owned = make_check(owner_id=self.user.id)
        anon = make_check(anon_token=self.token)
        self.client.force_authenticate(user=self.user)
        self.assertTrue(self.client.get(f"/api/checks/{owned.public_id}/").json()["is_owner"])
        anonymous = APIClient()
        self.assertTrue(anonymous.get(f"/api/checks/{anon.public_id}/", **self.anon()).json()["is_owner"])
        self.assertFalse(anonymous.get(f"/api/checks/{anon.public_id}/", **self.anon(new_token())).json()["is_owner"])
        self.assertFalse(anonymous.get(f"/api/checks/{owned.public_id}/").json()["is_owner"])

    def test_get_unknown_check_404(self):
        response = self.client.get("/api/checks/zzzzzzzzzz/")
        self.assertError(response, status.HTTP_404_NOT_FOUND, "not_found")

    def test_stale_running_check_becomes_error_on_read(self):
        check = make_check(state="running", verdict="")
        Check.objects.filter(pk=check.pk).update(created_at=timezone.now() - timedelta(seconds=301))

        body = self.client.get(f"/api/checks/{check.public_id}/").json()
        self.assertEqual(body["state"], "error")
        self.assertIsNone(body["verdict"])
        self.assertIsNotNone(body["completed_at"])
        check.refresh_from_db()
        self.assertEqual(check.state, "error")

    def test_recent_running_check_stays_running(self):
        check = make_check(state="running", verdict="")
        self.assertEqual(self.client.get(f"/api/checks/{check.public_id}/").json()["state"], "running")

    def test_public_response_has_no_email_or_owner_id(self):
        check = make_check(owner_id=self.user.id, anon_token=self.token, ip_hash="f" * 64)
        content = self.client.get(f"/api/checks/{check.public_id}/").content.decode()
        for secret in (str(self.user.id), self.user.email, self.token, "f" * 64):
            self.assertNotIn(secret, content)
        for key in ("owner_id", "anon_token", "ip_hash", "image_path", "email"):
            self.assertNotIn(key, content)

        make_check(owner_id=self.user.id, listed=True)
        listing = self.client.get("/api/checks/?scope=library").content.decode()
        self.assertNotIn(str(self.user.id), listing)
        self.assertNotIn("owner_id", listing)

    def test_owner_can_list_and_unlist_done_check(self):
        check = make_check(owner_id=self.user.id, verdict="faux")
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(f"/api/checks/{check.public_id}/", {"listed": True}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertTrue(response.json()["listed"])

        response = self.client.patch(f"/api/checks/{check.public_id}/", {"listed": False}, format="json")
        self.assertFalse(response.json()["listed"])
        check.refresh_from_db()
        self.assertFalse(check.listed)

    def test_not_listable_checks(self):
        self.client.force_authenticate(user=self.user)
        for fields in ({"state": "running", "verdict": ""}, {"state": "error", "verdict": ""},
                       {"state": "cancelled", "verdict": ""}, {"state": "done", "verdict": "analyse"}):
            with self.subTest(**fields):
                check = make_check(owner_id=self.user.id, **fields)
                response = self.client.patch(f"/api/checks/{check.public_id}/", {"listed": True}, format="json")
                self.assertError(response, status.HTTP_400_BAD_REQUEST, "not_listable")

    def test_patch_rejects_non_boolean(self):
        check = make_check(owner_id=self.user.id)
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(f"/api/checks/{check.public_id}/", {"listed": "oui"}, format="json")
        self.assertError(response, status.HTTP_400_BAD_REQUEST, "invalid")

    def test_patch_forbidden_for_non_owner(self):
        check = make_check(owner_id=uuid.uuid4())
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(f"/api/checks/{check.public_id}/", {"listed": True}, format="json")
        self.assertError(response, status.HTTP_403_FORBIDDEN, "forbidden")

    def test_patch_by_anon_holder_requires_sign_in(self):
        check = make_check(anon_token=self.token)
        response = self.client.patch(f"/api/checks/{check.public_id}/", {"listed": True}, format="json", **self.anon())
        self.assertError(response, status.HTTP_401_UNAUTHORIZED, "auth_required")
        check.refresh_from_db()
        self.assertFalse(check.listed)

    @patch("core.views_checks.delete_image_from_supabase", return_value={"success": True})
    def test_owner_can_delete(self, delete_image):
        check = make_check(owner_id=self.user.id, kind="image_ai", image_path="u/ai_detection/x.jpeg")
        self.client.force_authenticate(user=self.user)

        response = self.client.delete(f"/api/checks/{check.public_id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Check.objects.filter(pk=check.pk).exists())
        delete_image.assert_called_once_with("u/ai_detection/x.jpeg")

    @patch("core.views_checks.delete_image_from_supabase")
    def test_delete_keeps_image_shared_with_legacy_record(self, delete_image):
        ImageVerification.objects.create(
            supabase_user_id=self.user.id, user_email=self.user.email, image_path="u/content/shared.jpeg",
            image_url="https://storage.example.com/shared.jpeg", original_filename="shared.jpeg",
            verification_type="content", status="VRAIE", explanation="ok",
        )
        check = make_check(owner_id=self.user.id, kind="image_content", image_path="u/content/shared.jpeg")
        self.client.force_authenticate(user=self.user)

        self.assertEqual(self.client.delete(f"/api/checks/{check.public_id}/").status_code, status.HTTP_204_NO_CONTENT)
        delete_image.assert_not_called()

    def test_delete_forbidden_for_non_owner_and_requires_sign_in(self):
        check = make_check(owner_id=uuid.uuid4(), anon_token=self.token)
        self.assertError(self.client.delete(f"/api/checks/{check.public_id}/", **self.anon()),
                         status.HTTP_401_UNAUTHORIZED, "auth_required")
        self.client.force_authenticate(user=self.user)
        self.assertError(self.client.delete(f"/api/checks/{check.public_id}/"), status.HTTP_403_FORBIDDEN, "forbidden")
        self.assertTrue(Check.objects.filter(pk=check.pk).exists())


# ---------------------------------------------------------------------------
# POST checks/<id>/cancel/
# ---------------------------------------------------------------------------
class CancelCheckTest(CheckApiTestCase):
    def test_owner_cancels_running_check(self):
        check = make_check(owner_id=self.user.id, state="running", verdict="")
        self.client.force_authenticate(user=self.user)

        response = self.client.post(f"/api/checks/{check.public_id}/cancel/")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.json()["state"], "cancelled")
        self.assertIsNone(response.json()["verdict"])

    def test_anon_holder_cancels_running_check(self):
        check = make_check(anon_token=self.token, state="running", verdict="")
        response = self.client.post(f"/api/checks/{check.public_id}/cancel/", **self.anon())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        check.refresh_from_db()
        self.assertEqual(check.state, "cancelled")

    def test_cancel_finished_check_is_409(self):
        check = make_check(anon_token=self.token, state="done")
        response = self.client.post(f"/api/checks/{check.public_id}/cancel/", **self.anon())
        self.assertError(response, status.HTTP_409_CONFLICT, "not_running")

    def test_stranger_cannot_cancel(self):
        check = make_check(anon_token=self.token, state="running", verdict="")
        response = self.client.post(f"/api/checks/{check.public_id}/cancel/", **self.anon(new_token()))
        self.assertError(response, status.HTTP_403_FORBIDDEN, "forbidden")
        check.refresh_from_db()
        self.assertEqual(check.state, "running")

    @patch("core.tasks.analyze_text", return_value=TEXT_RESULT)
    def test_late_result_after_cancel_is_discarded(self, analyze_text):
        check = make_check(state="cancelled", verdict="")
        run_text_check(check.pk)
        check.refresh_from_db()
        self.assertEqual(check.state, "cancelled")
        self.assertEqual(check.verdict, "")
        self.assertEqual(check.sources, [])

        # A cancel landing while the analysis runs is also respected.
        running = make_check(state="running", verdict="")

        def cancel_during_analysis(text):
            Check.objects.filter(pk=running.pk).update(state="cancelled")
            return TEXT_RESULT

        analyze_text.side_effect = cancel_during_analysis
        run_text_check(running.pk)
        running.refresh_from_db()
        self.assertEqual(running.state, "cancelled")
        self.assertEqual(running.verdict, "")

    @patch("core.tasks.verify_image_content")
    def test_late_image_result_after_cancel_is_discarded(self, verify_image_content):
        check = make_check(kind="image_content", state="running", verdict="", image_url="https://x.org/a.jpeg")

        def cancel_during_analysis(url, claim):
            Check.objects.filter(pk=check.pk).update(state="cancelled")
            return {"statut": "VRAIE", "explication": "ok", "details": {}, "confidence": 80}

        verify_image_content.side_effect = cancel_during_analysis
        run_image_check(check.pk)
        check.refresh_from_db()
        self.assertEqual(check.state, "cancelled")
        self.assertIsNone(check.confidence)

    @patch("core.tasks.detect_ai_generated_image")
    def test_image_task_failures_become_safe_errors(self, detect):
        for side_effect in (RuntimeError("clé sk-999"), SoftTimeLimitExceeded()):
            with self.subTest(side_effect=type(side_effect).__name__):
                check = make_check(kind="image_ai", state="running", verdict="", image_url="https://x.org/a.png")
                detect.side_effect = side_effect
                run_image_check(check.pk)
                check.refresh_from_db()
                self.assertEqual((check.state, check.verdict), ("error", ""))
                self.assertEqual(check.explanation, SAFE_ANALYSIS_ERROR_MESSAGE)

    @patch("core.tasks.detect_ai_generated_image")
    def test_image_task_tolerates_bad_confidence_and_empty_explanation(self, detect):
        detect.return_value = {"statut": "INCERTAIN", "explication": "", "confidence": "n/a"}
        check = make_check(kind="image_ai", state="running", verdict="", image_url="https://x.org/a.png")
        run_image_check(check.pk)
        check.refresh_from_db()
        self.assertEqual((check.state, check.verdict, check.confidence), ("done", "incertain", None))
        self.assertTrue(check.explanation)

    def test_tasks_ignore_missing_checks(self):
        self.assertFalse(run_text_check(999999)["success"])
        self.assertFalse(run_image_check(999999)["success"])


# ---------------------------------------------------------------------------
# POST checks/<id>/feedback/
# ---------------------------------------------------------------------------
class FeedbackTest(CheckApiTestCase):
    def test_feedback_is_stored(self):
        check = make_check()
        response = self.client.post(f"/api/checks/{check.public_id}/feedback/",
                                    {"helpful": False, "message": "La source 2 est ancienne."}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        feedback = CheckFeedback.objects.get()
        self.assertEqual(feedback.check_ref_id, check.pk)
        self.assertIs(feedback.helpful, False)
        self.assertEqual(feedback.message, "La source 2 est ancienne.")
        self.assertEqual(len(feedback.ip_hash), 64)

    def test_feedback_with_null_helpful_and_message(self):
        check = make_check()
        response = self.client.post(f"/api/checks/{check.public_id}/feedback/",
                                    {"helpful": None, "message": "Erreur d'affichage"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(CheckFeedback.objects.get().helpful)

    def test_invalid_feedback(self):
        check = make_check()
        for payload in ({"helpful": "oui"}, {"helpful": True, "message": "x" * 1001}, {"message": 12}, {}):
            with self.subTest(payload=payload):
                response = self.client.post(f"/api/checks/{check.public_id}/feedback/", payload, format="json")
                self.assertError(response, status.HTTP_400_BAD_REQUEST, "invalid")

    def test_feedback_on_unknown_check(self):
        response = self.client.post("/api/checks/zzzzzzzzzz/feedback/", {"helpful": True}, format="json")
        self.assertError(response, status.HTTP_404_NOT_FOUND, "not_found")

    def test_feedback_ip_cap(self):
        check = make_check()
        for _ in range(checks_service.FEEDBACK_IP_DAILY_CAP):
            response = self.client.post(f"/api/checks/{check.public_id}/feedback/", {"helpful": True}, format="json")
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        response = self.client.post(f"/api/checks/{check.public_id}/feedback/", {"helpful": True}, format="json")
        self.assertError(response, status.HTTP_429_TOO_MANY_REQUESTS, "ip_cap")


# ---------------------------------------------------------------------------
# GET checks/<id>/related/
# ---------------------------------------------------------------------------
@patch("core.views_checks.extract_keywords", return_value=["Barrage"])
class RelatedTest(CheckApiTestCase):
    def test_related_returns_up_to_three_listed_done_checks(self, extract_keywords):
        check = make_check(claim="Le barrage de Sélingué est fermé")
        for i in range(4):
            make_check(claim=f"Le barrage numéro {i} a cédé", listed=True)
        make_check(claim="Un barrage privé", listed=False)
        make_check(claim="Un barrage en cours", listed=True, state="running", verdict="")
        make_check(claim="Rien à voir", listed=True)

        response = self.client.get(f"/api/checks/{check.public_id}/related/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.json()
        self.assertEqual(len(results), 3)
        for item in results:
            self.assertIn("barrage numéro", item["claim"])
            self.assertEqual(set(item), {"id", "kind", "claim", "state", "verdict", "source_count", "created_at",
                                         "listed"})
        extract_keywords.assert_called_once_with("Le barrage de Sélingué est fermé")

    def test_related_excludes_self_and_returns_empty_list(self, extract_keywords):
        check = make_check(claim="Le barrage est fermé", listed=True)
        self.assertEqual(self.client.get(f"/api/checks/{check.public_id}/related/").json(), [])

    def test_related_without_keywords(self, extract_keywords):
        extract_keywords.return_value = []
        check = make_check()
        make_check(listed=True)
        self.assertEqual(self.client.get(f"/api/checks/{check.public_id}/related/").json(), [])

    def test_related_survives_keyword_failure(self, extract_keywords):
        extract_keywords.side_effect = OSError("modèle spaCy absent")
        check = make_check()
        self.assertEqual(self.client.get(f"/api/checks/{check.public_id}/related/").json(), [])

    def test_related_unknown_check(self, extract_keywords):
        self.assertError(self.client.get("/api/checks/zzzzzzzzzz/related/"), status.HTTP_404_NOT_FOUND, "not_found")


# ---------------------------------------------------------------------------
# GET checks/?scope=…
# ---------------------------------------------------------------------------
class ListChecksTest(CheckApiTestCase):
    def test_library_lists_only_listed_done_checks(self):
        listed = make_check(claim="Visible", listed=True)
        make_check(claim="Privée")
        make_check(claim="Listée mais erreur", listed=True, state="error", verdict="")

        response = self.client.get("/api/checks/?scope=library")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertEqual(body["count"], 1)
        self.assertEqual(body["page"], 1)
        self.assertEqual(body["page_size"], 20)
        self.assertEqual([r["id"] for r in body["results"]], [listed.public_id])

    def test_default_scope_is_library(self):
        make_check(listed=True)
        make_check()
        self.assertEqual(self.client.get("/api/checks/").json()["count"], 1)

    def test_mine_requires_sign_in(self):
        self.assertError(self.client.get("/api/checks/?scope=mine"), status.HTTP_401_UNAUTHORIZED, "auth_required")

    def test_mine_lists_every_state_for_owner_only(self):
        for state in ("running", "done", "error", "cancelled"):
            make_check(owner_id=self.user.id, state=state, verdict="vrai" if state == "done" else "")
        make_check(owner_id=uuid.uuid4())
        self.client.force_authenticate(user=self.user)

        body = self.client.get("/api/checks/?scope=mine").json()
        self.assertEqual(body["count"], 4)
        self.assertEqual({r["state"] for r in body["results"]}, {"running", "done", "error", "cancelled"})

    def test_search_and_verdict_filters(self):
        make_check(claim="Le PRIX du riz a doublé", verdict="faux", listed=True)
        make_check(claim="Le prix du mil", verdict="vrai", listed=True)
        make_check(claim="La météo", verdict="faux", listed=True)

        body = self.client.get("/api/checks/", {"scope": "library", "q": "prix"}).json()
        self.assertEqual(body["count"], 2)
        body = self.client.get("/api/checks/", {"scope": "library", "q": "prix", "verdict": "faux"}).json()
        self.assertEqual(body["count"], 1)
        self.assertEqual(body["results"][0]["claim"], "Le PRIX du riz a doublé")

    def test_pagination(self):
        for i in range(25):
            make_check(claim=f"Affirmation {i}", listed=True)
        body = self.client.get("/api/checks/?scope=library&page=2").json()
        self.assertEqual(body["count"], 25)
        self.assertEqual(body["page"], 2)
        self.assertEqual(len(body["results"]), 5)
        self.assertEqual(self.client.get("/api/checks/?page=9").json()["results"], [])

    def test_huge_page_returns_empty_results(self):
        make_check(claim="Affirmation", listed=True)
        response = self.client.get(f"/api/checks/?scope=library&page={10 ** 20}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), {"count": 1, "page": 10 ** 20, "page_size": 20, "results": []})

    def test_invalid_list_parameters(self):
        for query in ("scope=tout", "verdict=peut-etre", "page=abc", "page=0"):
            with self.subTest(query=query):
                self.assertError(self.client.get(f"/api/checks/?{query}"), status.HTTP_400_BAD_REQUEST, "invalid")

    def test_summary_shape_and_truncation(self):
        check = make_check(claim="é" * 300, sources=[{"title": "a"}, {"title": "b"}], listed=True)
        summary = serialize_summary(check)
        self.assertEqual(set(summary), {"id", "kind", "claim", "state", "verdict", "source_count", "created_at",
                                        "listed"})
        self.assertLessEqual(len(summary["claim"]), 200)
        self.assertEqual(summary["source_count"], 2)


# ---------------------------------------------------------------------------
# POST checks/claim/
# ---------------------------------------------------------------------------
class ClaimTest(CheckApiTestCase):
    def test_claim_attaches_anon_checks_to_user(self):
        mine = make_check(anon_token=self.token)
        other = make_check(anon_token=new_token())
        self.client.force_authenticate(user=self.user)

        response = self.client.post("/api/checks/claim/", **self.anon())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), {"claimed": 1})
        mine.refresh_from_db()
        other.refresh_from_db()
        self.assertEqual(str(mine.owner_id), str(self.user.id))
        self.assertEqual(mine.anon_token, "")
        self.assertIsNone(other.owner_id)

    def test_claim_without_token_claims_nothing(self):
        self.client.force_authenticate(user=self.user)
        self.assertEqual(self.client.post("/api/checks/claim/").json(), {"claimed": 0})

    def test_claim_requires_sign_in(self):
        make_check(anon_token=self.token)
        self.assertError(self.client.post("/api/checks/claim/", **self.anon()), status.HTTP_401_UNAUTHORIZED,
                         "auth_required")

    def test_wrong_method_is_french_405(self):
        self.client.force_authenticate(user=self.user)
        self.assertError(self.client.get("/api/checks/claim/"), status.HTTP_405_METHOD_NOT_ALLOWED,
                         "method_not_allowed")


class TransportTest(CheckApiTestCase):
    def test_cors_preflight_allows_anon_token_header(self):
        response = self.client.options(
            "/api/checks/",
            HTTP_ORIGIN="http://localhost:3000",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS="x-anon-token, content-type",
        )
        self.assertIn("x-anon-token", response.headers.get("Access-Control-Allow-Headers", ""))

    def test_non_object_json_body_is_invalid(self):
        check = make_check(owner_id=self.user.id)
        self.assertError(self.client.post("/api/checks/", [1, 2], format="json", **self.anon()),
                         status.HTTP_400_BAD_REQUEST, "invalid")
        self.assertError(self.client.post(f"/api/checks/{check.public_id}/feedback/", [1], format="json"),
                         status.HTTP_400_BAD_REQUEST, "invalid")
        self.client.force_authenticate(user=self.user)
        self.assertError(self.client.patch(f"/api/checks/{check.public_id}/", [True], format="json"),
                         status.HTTP_400_BAD_REQUEST, "invalid")


BAD_BEARER = {"HTTP_AUTHORIZATION": "Bearer expired-token"}


@patch("core.authentication.create_client", side_effect=RuntimeError("jwt expired: raw detail"))
class StaleBearerTokenTest(CheckApiTestCase):
    """A stale session must not block public reads; private operations stay 401."""

    def test_public_get_with_bad_token_is_anonymous(self, create_client):
        check = make_check(owner_id=self.user.id, anon_token=self.token)
        response = self.client.get(f"/api/checks/{check.public_id}/", **BAD_BEARER)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.json()["is_owner"])

        response = self.client.get(f"/api/checks/{check.public_id}/", **BAD_BEARER, **self.anon())
        self.assertTrue(response.json()["is_owner"])

    def test_library_related_and_feedback_with_bad_token(self, create_client):
        check = make_check(listed=True)
        self.assertEqual(self.client.get("/api/checks/?scope=library", **BAD_BEARER).status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get("/api/checks/", **BAD_BEARER).status_code, status.HTTP_200_OK)
        with patch("core.views_checks.extract_keywords", return_value=[]):
            self.assertEqual(self.client.get(f"/api/checks/{check.public_id}/related/", **BAD_BEARER).json(), [])
        response = self.client.post(f"/api/checks/{check.public_id}/feedback/", {"helpful": True}, format="json",
                                    **BAD_BEARER)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_private_operations_with_bad_token_stay_401(self, create_client):
        check = make_check(anon_token=self.token, state="running", verdict="")
        requests = [
            lambda: self.client.get("/api/checks/?scope=mine", **BAD_BEARER),
            lambda: self.client.patch(f"/api/checks/{check.public_id}/", {"listed": True}, format="json", **BAD_BEARER),
            lambda: self.client.delete(f"/api/checks/{check.public_id}/", **BAD_BEARER),
            lambda: self.client.post("/api/checks/claim/", **BAD_BEARER, **self.anon()),
            lambda: self.client.post(f"/api/checks/{check.public_id}/cancel/", **BAD_BEARER, **self.anon()),
        ]
        for send in requests:
            response = send()
            self.assertError(response, status.HTTP_401_UNAUTHORIZED, "auth_required")
            self.assertNotIn("raw detail", response.content.decode())
        check.refresh_from_db()
        self.assertEqual(check.state, "running")
        self.assertEqual(check.anon_token, self.token)

    def test_legacy_endpoint_still_rejects_bad_token(self, create_client):
        # Unchanged legacy behaviour (DRF answers 403 here: no authenticate_header).
        response = self.client.get("/api/submissions/", **BAD_BEARER)
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])


class ClientIpTest(TestCase):
    def setUp(self):
        self.factory = RequestFactory()

    def ip(self, **meta):
        return checks_service.client_ip(self.factory.get("/api/checks/", **meta))

    def test_x_real_ip_not_trusted_by_default(self):
        self.assertFalse(settings.CHECKS_TRUST_X_REAL_IP)
        self.assertEqual(self.ip(HTTP_X_REAL_IP="198.51.100.7", HTTP_X_FORWARDED_FOR="1.1.1.1, 2.2.2.2"),
                         "2.2.2.2")
        self.assertEqual(self.ip(HTTP_X_REAL_IP="198.51.100.7", REMOTE_ADDR="192.0.2.44"), "192.0.2.44")

    @override_settings(CHECKS_TRUST_X_REAL_IP=False, CHECKS_TRUSTED_PROXY_COUNT=2)
    def test_untrusted_x_real_ip_uses_forwarded_for_hop(self):
        self.assertEqual(self.ip(HTTP_X_REAL_IP="198.51.100.7", HTTP_X_FORWARDED_FOR="1.1.1.1, 2.2.2.2, 3.3.3.3"),
                         "2.2.2.2")

    @override_settings(CHECKS_TRUST_X_REAL_IP=True)
    def test_trusted_x_real_ip_wins(self):
        self.assertEqual(self.ip(HTTP_X_REAL_IP=" 198.51.100.7 ", HTTP_X_FORWARDED_FOR="1.1.1.1, 2.2.2.2"),
                         "198.51.100.7")

    @override_settings(CHECKS_TRUST_X_REAL_IP=True)
    def test_trusted_empty_x_real_ip_falls_through(self):
        self.assertEqual(self.ip(HTTP_X_REAL_IP="  ", HTTP_X_FORWARDED_FOR="1.1.1.1, 2.2.2.2"), "2.2.2.2")
        self.assertEqual(self.ip(HTTP_X_REAL_IP="  ", REMOTE_ADDR="192.0.2.44"), "192.0.2.44")

    def test_forwarded_for_uses_trusted_proxy_count(self):
        chain = "9.9.9.9, 1.1.1.1, 2.2.2.2, 3.3.3.3"
        for count, expected in ((1, "3.3.3.3"), (2, "2.2.2.2"), (4, "9.9.9.9"), (7, "9.9.9.9")):
            with self.subTest(count=count), override_settings(CHECKS_TRUSTED_PROXY_COUNT=count):
                self.assertEqual(self.ip(HTTP_X_FORWARDED_FOR=chain), expected)

    def test_bad_proxy_count_defaults_to_one(self):
        for value in ("abc", 0, -3, None):
            with self.subTest(value=value), override_settings(CHECKS_TRUSTED_PROXY_COUNT=value):
                self.assertEqual(self.ip(HTTP_X_FORWARDED_FOR="1.1.1.1, 2.2.2.2"), "2.2.2.2")

    def test_remote_addr_fallback(self):
        self.assertEqual(self.ip(REMOTE_ADDR="192.0.2.44"), "192.0.2.44")
        self.assertEqual(self.ip(HTTP_X_FORWARDED_FOR=" , ", REMOTE_ADDR="192.0.2.44"), "192.0.2.44")


# ---------------------------------------------------------------------------
# Services
# ---------------------------------------------------------------------------
class ServiceTest(TestCase):
    def test_text_status_mapping(self):
        self.assertEqual(map_text_status("VRAIE"), ("done", "vrai"))
        self.assertEqual(map_text_status("FAUSSE"), ("done", "faux"))
        self.assertEqual(map_text_status("INDÉTERMINÉE"), ("done", "incertain"))
        self.assertEqual(map_text_status("ERREUR"), ("error", ""))
        self.assertEqual(map_text_status("AUTRE"), ("done", "incertain"))
        self.assertEqual(map_text_status(None), ("done", "incertain"))

    def test_image_status_mapping(self):
        expected = {
            "VRAIE": ("done", "vrai"), "FAUSSE": ("done", "faux"), "INDÉTERMINÉE": ("done", "incertain"),
            "INCERTAIN": ("done", "incertain"), "IA_DÉTECTÉE": ("done", "ia_detectee"),
            "AUTHENTIQUE": ("done", "ia_non_detectee"), "ANALYSÉE": ("done", "analyse"), "ERREUR": ("error", ""),
        }
        for statut, result in expected.items():
            self.assertEqual(map_image_status(statut), result)

    def test_normalize_sources_tolerates_bad_input(self):
        self.assertEqual(normalize_sources(None), [])
        self.assertEqual(normalize_sources("https://a.org"), [])
        self.assertEqual(normalize_sources([None, 3, {}, {"snippet": "seul"}]), [])
        self.assertEqual(
            normalize_sources([{"title": "T", "url": "javascript:alert(1)"}]),
            [{"title": "T", "url": "", "domain": "", "date": "", "snippet": ""}],
        )
        self.assertEqual(
            normalize_sources(["https://www.a.org/x"]),
            [{"title": "a.org", "url": "https://www.a.org/x", "domain": "a.org", "date": "", "snippet": ""}],
        )

    def test_hash_ip_is_salted_sha256(self):
        digest = checks_service.hash_ip("203.0.113.9")
        self.assertEqual(len(digest), 64)
        self.assertNotEqual(digest, checks_service.hash_ip("203.0.113.10"))
        import hashlib
        self.assertNotEqual(digest, hashlib.sha256(b"203.0.113.9").hexdigest())

    def test_public_ids_are_lowercase_base32(self):
        ids = {make_check().public_id for _ in range(20)}
        self.assertEqual(len(ids), 20)
        for public_id in ids:
            self.assertRegex(public_id, r"^[a-z2-7]{10}$")


# ---------------------------------------------------------------------------
# Legacy behaviour and data migration
# ---------------------------------------------------------------------------
class LegacyAndMigrationTest(TestCase):
    @patch("core.tasks.analyze_text", return_value=({"statut": "INDÉTERMINÉE", "explication": "Pas assez"}, []))
    def test_legacy_submission_endpoint_unchanged(self, analyze_text):
        client = APIClient()
        client.force_authenticate(user=MockSupabaseUser())
        response = client.post("/api/submissions/", {"texte": "Une affirmation", "source": ""}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        self.assertEqual(
            set(response.json()),
            {"id", "supabase_user_id", "user_email", "user_name", "texte", "source", "date", "statut", "web_sources",
             "detailed_result", "task_id"},
        )
        self.assertEqual(Submission.objects.get().statut, "indéterminé")
        self.assertEqual(Check.objects.count(), 0)

    def test_history_copy_migration(self):
        user_id = uuid.uuid4()
        old_date = timezone.now() - timedelta(days=40)
        submission = Submission.objects.create(
            supabase_user_id=user_id, user_email="a@example.com", texte="Le riz coûte 500 F",
            statut="vérifié", web_sources=[{"title": "S", "link": "https://s.org/1"}, "bruit"],
            detailed_result="Confirmé par deux sources.",
        )
        Submission.objects.filter(pk=submission.pk).update(date=old_date)
        Submission.objects.create(
            supabase_user_id=user_id, user_email="a@example.com", texte="Ancienne erreur", statut="erreur",
            detailed_result="Traceback: secret",
        )
        verification = ImageVerification.objects.create(
            supabase_user_id=user_id, user_email="a@example.com", image_path="u/ai_detection/x.jpeg",
            image_url="https://storage.example.com/x.jpeg", original_filename="x.jpeg",
            verification_type="ai_detection", status="IA_DÉTECTÉE", explanation="Mains déformées.", confidence=88,
        )
        ImageVerification.objects.filter(pk=verification.pk).update(date=old_date)
        facts_before = Fact.objects.count()

        migration = importlib.import_module("core.migrations.0012_copy_history_to_checks")
        migration.copy_history_to_checks(django_apps, None)

        self.assertEqual(Check.objects.count(), 3)
        self.assertEqual(Fact.objects.count(), facts_before)
        for check in Check.objects.all():
            self.assertEqual(str(check.owner_id), str(user_id))
            self.assertFalse(check.listed)
            self.assertEqual(check.anon_token, "")

        text = Check.objects.get(claim="Le riz coûte 500 F")
        self.assertEqual((text.kind, text.state, text.verdict), ("text", "done", "vrai"))
        self.assertEqual(text.created_at, old_date)
        self.assertEqual(text.explanation, "Confirmé par deux sources.")
        self.assertEqual(text.sources, [{"title": "S", "url": "https://s.org/1", "domain": "s.org", "date": "",
                                         "snippet": ""}])

        errored = Check.objects.get(claim="Ancienne erreur")
        self.assertEqual((errored.state, errored.verdict), ("error", ""))
        self.assertNotIn("Traceback", errored.explanation)

        image = Check.objects.get(kind="image_ai")
        self.assertEqual((image.state, image.verdict, image.confidence), ("done", "ia_detectee", 88))
        self.assertEqual(image.image_url, "https://storage.example.com/x.jpeg")
        self.assertEqual(image.image_path, "u/ai_detection/x.jpeg")
        self.assertEqual(image.created_at, old_date)
