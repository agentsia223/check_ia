"""Signed storage links are credentials: they must never reach the logs."""
import logging
from unittest.mock import Mock

from django.core.files.base import ContentFile

from core.services import image_verification, pixel_analyzer, supabase_storage
from core.services.log_safety import loggable_url
from core.tests.test_services_and_tasks_coverage import FakeStorageBucket, FakeSupabaseClient

SIGNED = "https://x.supabase.co/storage/v1/object/sign/image-verifications/u1/content/a.jpeg?token=SECRET.TOKEN.VALUE"


def test_loggable_url_drops_the_token_and_keeps_the_file():
    shown = loggable_url(SIGNED)
    assert "SECRET" not in shown and "token" not in shown
    assert shown.startswith("https://x.supabase.co/storage/v1/object/sign/image-verifications/u1/content/a.jpeg")
    assert "masqués" in shown


def test_loggable_url_leaves_plain_urls_alone_and_handles_junk():
    assert loggable_url("https://example.org/a.jpg") == "https://example.org/a.jpg"
    assert loggable_url("") == ""
    assert loggable_url(None) == ""
    assert "SECRET" not in loggable_url("https://example.org/a#SECRET")
    assert loggable_url("http://[bad") == "<url illisible>"


def test_upload_and_url_lookup_never_log_the_signed_link(monkeypatch, caplog):
    bucket = FakeStorageBucket(signed_url={"signedURL": SIGNED})
    monkeypatch.setattr(supabase_storage, "get_supabase_client", Mock(return_value=FakeSupabaseClient(bucket=bucket)))

    with caplog.at_level(logging.DEBUG):
        upload = supabase_storage.upload_image_to_supabase(ContentFile(b"bytes", name="a.jpeg"), "u1", "content")
        looked_up = supabase_storage.get_image_url_from_supabase("u1/content/a.jpeg")

    # Callers still get the full link; only the log line is shortened.
    assert upload["public_url"] == SIGNED
    assert looked_up == SIGNED
    assert "SECRET" not in caplog.text
    assert "image-verifications/u1/content/a.jpeg" in caplog.text


def test_image_services_never_log_the_signed_link(monkeypatch, caplog):
    monkeypatch.setattr(image_verification.requests, "get", Mock(side_effect=RuntimeError("offline")))
    monkeypatch.setattr(pixel_analyzer, "PIXEL_ANALYZER_API_USER", "user")
    monkeypatch.setattr(pixel_analyzer, "PIXEL_ANALYZER_API_SECRET", "secret")
    monkeypatch.setattr(pixel_analyzer.requests, "get", Mock(side_effect=RuntimeError("offline")))

    with caplog.at_level(logging.DEBUG):
        assert image_verification.encode_image_url_to_base64(SIGNED) is None
        assert pixel_analyzer.detect_ai_image(SIGNED)["success"] is False

    assert "Downloading image from" in caplog.text
    assert "Pixel analyzer: analyzing image" in caplog.text
    assert "SECRET" not in caplog.text
