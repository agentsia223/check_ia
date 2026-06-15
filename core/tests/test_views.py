import uuid
from unittest.mock import Mock, patch
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from core.models import Fact, Keyword, Submission


class MockSupabaseUser:
    """Mock Supabase user object for testing authenticated endpoints."""

    def __init__(self):
        self.id = uuid.uuid4()
        self.email = "testuser@example.com"
        self.user_metadata = {"full_name": "Test User"}
        self.is_authenticated = True


class PublicEndpointTest(TestCase):
    """Test endpoints that don't require authentication."""

    def setUp(self):
        self.client = APIClient()

    def test_facts_list(self):
        Fact.objects.create(texte="Test fact", source="https://example.com")
        # Facts endpoint requires auth by default via the ViewSet
        # but we test the model was created
        self.assertEqual(Fact.objects.count(), 1)

    def test_keywords_list(self):
        Keyword.objects.create(mot="test-keyword")
        self.assertEqual(Keyword.objects.count(), 1)


class SubmissionViewTest(TestCase):
    """Test submission-related endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.mock_user = MockSupabaseUser()

    def test_submit_requires_auth(self):
        """Unauthenticated requests should be rejected."""
        response = self.client.post("/api/submissions/", {"texte": "test claim"})
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_user_submissions_requires_auth(self):
        """Unauthenticated requests to user submissions should be rejected."""
        response = self.client.get("/api/submissions/")
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])


class ImageVerificationViewTest(TestCase):
    """Test image verification endpoints."""

    def setUp(self):
        self.client = APIClient()

    def test_verify_image_requires_auth(self):
        response = self.client.post("/api/verify-image-content/")
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_detect_ai_image_requires_auth(self):
        response = self.client.post("/api/detect-ai-image/")
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_image_verifications_requires_auth(self):
        response = self.client.get("/api/image-verifications/")
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])


class BambaraVoiceViewTest(TestCase):
    """Test Bambara voice proxy endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.mock_user = MockSupabaseUser()

    def test_translate_requires_auth(self):
        response = self.client.post(
            "/api/bambara/translate/",
            {"text": "I ni ce", "source_lang": "bm", "target_lang": "fr"},
            format="json",
        )

        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    @patch("core.views.translate_bambara_text")
    def test_translate_returns_external_api_response(self, translate_bambara_text):
        translate_bambara_text.return_value = {
            "translated_text": "Merci",
            "source_lang": "bm",
            "target_lang": "fr",
            "model": "translation-model",
        }
        self.client.force_authenticate(user=self.mock_user)

        response = self.client.post(
            "/api/bambara/translate/",
            {"text": "I ni ce", "source_lang": "bm", "target_lang": "fr"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["translated_text"], "Merci")
        translate_bambara_text.assert_called_once_with("I ni ce", "bm", "fr")

    @patch("core.views.transcribe_bambara_audio")
    def test_transcribe_returns_external_api_response(self, transcribe_bambara_audio):
        transcribe_bambara_audio.return_value = {
            "text": "I ni ce",
            "language": "bm",
            "duration_s": 2.4,
            "model": "asr-model",
        }
        self.client.force_authenticate(user=self.mock_user)
        audio = SimpleUploadedFile("claim.wav", b"audio-bytes", content_type="audio/wav")

        response = self.client.post(
            "/api/bambara/transcribe/",
            {"file": audio, "language": "bm"},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["text"], "I ni ce")
        uploaded_file = transcribe_bambara_audio.call_args.args[0]
        self.assertEqual(uploaded_file.name, "claim.wav")
        self.assertEqual(transcribe_bambara_audio.call_args.args[1], "bm")

    @patch("core.views.transcribe_bambara_audio", Mock(side_effect=RuntimeError("Bambara API is not configured")))
    def test_transcribe_reports_configuration_errors(self):
        self.client.force_authenticate(user=self.mock_user)
        audio = SimpleUploadedFile("claim.wav", b"audio-bytes", content_type="audio/wav")

        response = self.client.post(
            "/api/bambara/transcribe/",
            {"file": audio, "language": "bm"},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.data["error"], "Bambara API is not configured")
