import uuid
from unittest.mock import Mock, patch

from django.test import TestCase
from core.models import Fact, Keyword, Submission, ImageVerification, VerifiedMedia


class FactModelTest(TestCase):
    def test_str_representation(self):
        fact = Fact(texte="This is a test fact for verification purposes", source="https://example.com")
        self.assertEqual(str(fact), "This is a test fact for verification purposes"[:50])

    def test_str_truncates_long_text(self):
        long_text = "A" * 100
        fact = Fact(texte=long_text, source="https://example.com")
        self.assertEqual(len(str(fact)), 50)

    def test_fact_keyword_relationship(self):
        fact = Fact.objects.create(texte="Test fact", source="https://example.com")
        kw1 = Keyword.objects.create(mot="keyword1")
        kw2 = Keyword.objects.create(mot="keyword2")
        fact.mots_cles.add(kw1, kw2)
        self.assertEqual(fact.mots_cles.count(), 2)

    def test_delete_clears_keywords(self):
        fact = Fact.objects.create(texte="Test fact", source="https://example.com")
        kw = Keyword.objects.create(mot="keyword")
        fact.mots_cles.add(kw)
        fact.delete()
        # Keyword should still exist after fact deletion
        self.assertTrue(Keyword.objects.filter(pk=kw.pk).exists())

    def test_web_sources_nullable(self):
        fact = Fact.objects.create(
            texte="Test fact",
            source="https://example.com",
            web_sources=None,
        )
        self.assertIsNone(fact.web_sources)

    def test_web_sources_json(self):
        sources = [{"url": "https://example.com", "title": "Example"}]
        fact = Fact.objects.create(
            texte="Test fact",
            source="https://example.com",
            web_sources=sources,
        )
        fact.refresh_from_db()
        self.assertEqual(fact.web_sources, sources)


class KeywordModelTest(TestCase):
    def test_str_representation(self):
        kw = Keyword(mot="misinformation")
        self.assertEqual(str(kw), "misinformation")

    def test_date_auto_set(self):
        kw = Keyword.objects.create(mot="test")
        self.assertIsNotNone(kw.date)


class SubmissionModelTest(TestCase):
    def test_str_representation(self):
        sub = Submission(
            supabase_user_id=uuid.uuid4(),
            user_email="test@example.com",
            texte="Test submission text content",
        )
        result = str(sub)
        self.assertIn("test@example.com", result)
        self.assertIn("Test submission text content"[:50], result)

    def test_default_status(self):
        sub = Submission.objects.create(
            supabase_user_id=uuid.uuid4(),
            user_email="test@example.com",
            texte="Test submission",
        )
        self.assertEqual(sub.statut, "en cours")

    def test_user_fields(self):
        user_id = uuid.uuid4()
        sub = Submission.objects.create(
            supabase_user_id=user_id,
            user_email="test@example.com",
            user_name="Test User",
            texte="Test",
        )
        sub.refresh_from_db()
        self.assertEqual(sub.supabase_user_id, user_id)
        self.assertEqual(sub.user_email, "test@example.com")
        self.assertEqual(sub.user_name, "Test User")


class ImageVerificationModelTest(TestCase):
    def test_str_representation(self):
        iv = ImageVerification(
            supabase_user_id=uuid.uuid4(),
            user_email="test@example.com",
            image_path="images/test.jpg",
            image_url="https://storage.example.com/test.jpg",
            original_filename="test.jpg",
            claim_text="This is a test claim about the image",
            verification_type="content",
            status="EN_COURS",
            explanation="Analysis pending",
        )
        result = str(iv)
        self.assertIn("content", result)
        self.assertIn("test@example.com", result)

    def test_str_without_claim(self):
        iv = ImageVerification(
            supabase_user_id=uuid.uuid4(),
            user_email="test@example.com",
            image_path="images/test.jpg",
            image_url="https://storage.example.com/test.jpg",
            original_filename="test.jpg",
            claim_text=None,
            verification_type="ai_detection",
            status="EN_COURS",
            explanation="Analysis pending",
        )
        result = str(iv)
        self.assertIn("No claim", result)

    def test_ordering_by_date_desc(self):
        user_id = uuid.uuid4()
        iv1 = ImageVerification.objects.create(
            supabase_user_id=user_id,
            user_email="test@example.com",
            image_path="images/1.jpg",
            image_url="https://storage.example.com/1.jpg",
            original_filename="1.jpg",
            verification_type="content",
            status="EN_COURS",
            explanation="Test",
        )
        iv2 = ImageVerification.objects.create(
            supabase_user_id=user_id,
            user_email="test@example.com",
            image_path="images/2.jpg",
            image_url="https://storage.example.com/2.jpg",
            original_filename="2.jpg",
            verification_type="content",
            status="EN_COURS",
            explanation="Test",
        )
        verifications = list(ImageVerification.objects.all())
        self.assertEqual(verifications[0].pk, iv2.pk)

    @patch("core.services.supabase_storage.delete_image_from_supabase")
    def test_delete_removes_image_from_supabase(self, delete_image_from_supabase):
        delete_image_from_supabase.return_value = {"success": True}
        verification = ImageVerification.objects.create(
            supabase_user_id=uuid.uuid4(),
            user_email="test@example.com",
            image_path="images/delete-me.jpg",
            image_url="https://storage.example.com/delete-me.jpg",
            original_filename="delete-me.jpg",
            verification_type="content",
            status="EN_COURS",
            explanation="Test",
        )

        verification.delete()

        delete_image_from_supabase.assert_called_once_with("images/delete-me.jpg")
        self.assertFalse(ImageVerification.objects.filter(pk=verification.pk).exists())

    @patch("core.models.logger")
    @patch("core.services.supabase_storage.delete_image_from_supabase")
    def test_delete_logs_supabase_failures_without_blocking_delete(
        self,
        delete_image_from_supabase,
        logger,
    ):
        delete_image_from_supabase.return_value = {"success": False, "error": "storage down"}
        verification = ImageVerification.objects.create(
            supabase_user_id=uuid.uuid4(),
            user_email="test@example.com",
            image_path="images/fail.jpg",
            image_url="https://storage.example.com/fail.jpg",
            original_filename="fail.jpg",
            verification_type="content",
            status="EN_COURS",
            explanation="Test",
        )

        verification.delete()

        logger.warning.assert_called_once()
        self.assertFalse(ImageVerification.objects.filter(pk=verification.pk).exists())

    @patch("core.models.logger")
    @patch("core.services.supabase_storage.delete_image_from_supabase", Mock(side_effect=RuntimeError("boom")))
    def test_delete_logs_unexpected_supabase_errors_without_blocking_delete(self, logger):
        verification = ImageVerification.objects.create(
            supabase_user_id=uuid.uuid4(),
            user_email="test@example.com",
            image_path="images/error.jpg",
            image_url="https://storage.example.com/error.jpg",
            original_filename="error.jpg",
            verification_type="content",
            status="EN_COURS",
            explanation="Test",
        )

        verification.delete()

        logger.warning.assert_called_once()
        self.assertFalse(ImageVerification.objects.filter(pk=verification.pk).exists())


class VerifiedMediaModelTest(TestCase):
    def test_str_representation(self):
        fact = Fact.objects.create(texte="Test fact for media", source="https://example.com")
        vm = VerifiedMedia(fact=fact, media_type="image", description="Test image")
        result = str(vm)
        self.assertIn("image", result)
        self.assertIn("Test fact for media"[:30], result)
