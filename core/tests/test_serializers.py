import uuid
from django.test import TestCase
from core.models import Fact, Keyword, Submission, VerifiedMedia
from core.serializers import FactSerializer, KeywordSerializer, SubmissionSerializer, VerifiedMediaSerializer


class KeywordSerializerTest(TestCase):
    def test_serialization(self):
        kw = Keyword.objects.create(mot="test-keyword")
        serializer = KeywordSerializer(kw)
        self.assertEqual(serializer.data["mot"], "test-keyword")

    def test_fields(self):
        kw = Keyword.objects.create(mot="test")
        serializer = KeywordSerializer(kw)
        self.assertIn("mot", serializer.data)


class FactSerializerTest(TestCase):
    def test_serialization_with_keywords(self):
        fact = Fact.objects.create(texte="Test fact", source="https://example.com")
        kw = Keyword.objects.create(mot="keyword1")
        fact.mots_cles.add(kw)
        serializer = FactSerializer(fact)
        data = serializer.data
        self.assertEqual(data["texte"], "Test fact")
        self.assertEqual(data["source"], "https://example.com")
        self.assertEqual(len(data["mots_cles"]), 1)
        self.assertEqual(data["mots_cles"][0]["mot"], "keyword1")

    def test_serialization_without_keywords(self):
        fact = Fact.objects.create(texte="Test fact", source="https://example.com")
        serializer = FactSerializer(fact)
        self.assertEqual(serializer.data["mots_cles"], [])


class SubmissionSerializerTest(TestCase):
    def test_serialization(self):
        sub = Submission.objects.create(
            supabase_user_id=uuid.uuid4(),
            user_email="test@example.com",
            user_name="Test User",
            texte="Test submission",
            statut="en cours",
        )
        serializer = SubmissionSerializer(sub)
        data = serializer.data
        self.assertEqual(data["texte"], "Test submission")
        self.assertEqual(data["user_email"], "test@example.com")
        self.assertEqual(data["statut"], "en cours")

    def test_read_only_fields(self):
        serializer = SubmissionSerializer()
        read_only = serializer.Meta.read_only_fields
        self.assertIn("supabase_user_id", read_only)
        self.assertIn("user_email", read_only)
        self.assertIn("user_name", read_only)


class VerifiedMediaSerializerTest(TestCase):
    def test_serialization(self):
        fact = Fact.objects.create(texte="Test fact", source="https://example.com")
        vm = VerifiedMedia.objects.create(
            fact=fact,
            media_type="image",
            description="Test media",
        )
        serializer = VerifiedMediaSerializer(vm)
        data = serializer.data
        self.assertEqual(data["media_type"], "image")
        self.assertEqual(data["description"], "Test media")
        self.assertEqual(data["fact"], fact.pk)
