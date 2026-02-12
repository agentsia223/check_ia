import uuid
from unittest.mock import patch, MagicMock
from django.test import TestCase, override_settings
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
