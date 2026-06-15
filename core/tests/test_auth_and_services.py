import json
from types import SimpleNamespace
from unittest.mock import Mock, patch

import pytest
from django.test import RequestFactory, TestCase, override_settings
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.test import APIRequestFactory, force_authenticate

from core.authentication import SimpleSupabaseUser, SupabaseAuthentication
from core.middleware import SupabaseAuthMiddleware
from core.models import Fact
from core.services import bambara_voice, keywords_extractor, pixel_analyzer, web_scraper
from core.services.deep_translator import get_facts_translated


class SupabaseAuthenticationTest(TestCase):
    def setUp(self):
        self.factory = RequestFactory()

    def test_simple_supabase_user_exposes_auth_fields(self):
        raw_user = SimpleNamespace(
            id="user-1",
            email="user@example.com",
            user_metadata={"name": "Test User"},
        )

        user = SimpleSupabaseUser(raw_user)

        self.assertEqual(user.id, "user-1")
        self.assertEqual(user.email, "user@example.com")
        self.assertTrue(user.is_authenticated)
        self.assertEqual(str(user), "user@example.com")

    def test_authenticate_returns_none_without_bearer_header(self):
        request = self.factory.get("/api/facts/")

        self.assertIsNone(SupabaseAuthentication().authenticate(request))

    @override_settings(SUPABASE_URL="https://test.supabase.co", SUPABASE_ANON_KEY="anon")
    @patch("core.authentication.create_client")
    def test_authenticate_returns_supabase_user_for_valid_token(self, create_client):
        raw_user = SimpleNamespace(
            id="user-1",
            email="user@example.com",
            user_metadata={"name": "Test User"},
        )
        client = Mock()
        client.auth.get_user.return_value = SimpleNamespace(user=raw_user)
        create_client.return_value = client
        request = self.factory.get(
            "/api/facts/",
            HTTP_AUTHORIZATION="Bearer valid-token",
        )

        user, token = SupabaseAuthentication().authenticate(request)

        self.assertEqual(user.email, "user@example.com")
        self.assertEqual(token, "valid-token")
        client.auth.get_user.assert_called_once_with("valid-token")

    @override_settings(SUPABASE_URL="https://test.supabase.co", SUPABASE_ANON_KEY="anon")
    @patch("core.authentication.create_client")
    def test_authenticate_raises_when_supabase_rejects_token(self, create_client):
        client = Mock()
        client.auth.get_user.return_value = SimpleNamespace(user=None)
        create_client.return_value = client
        request = self.factory.get(
            "/api/facts/",
            HTTP_AUTHORIZATION="Bearer invalid-token",
        )

        with self.assertRaises(AuthenticationFailed):
            SupabaseAuthentication().authenticate(request)


class SupabaseAuthMiddlewareTest(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.middleware = SupabaseAuthMiddleware(lambda request: None)

    def test_api_paths_are_skipped(self):
        request = self.factory.get("/api/facts/", HTTP_AUTHORIZATION="Bearer token")

        self.assertIsNone(self.middleware.process_request(request))
        self.assertFalse(hasattr(request, "supabase_user"))

    @override_settings(SUPABASE_URL="https://test.supabase.co", SUPABASE_ANON_KEY="anon")
    @patch("core.middleware.create_client")
    def test_non_api_bearer_token_sets_supabase_user(self, create_client):
        raw_user = SimpleNamespace(id="user-1", email="user@example.com")
        client = Mock()
        client.auth.get_user.return_value = SimpleNamespace(user=raw_user)
        create_client.return_value = client
        request = self.factory.get("/", HTTP_AUTHORIZATION="Bearer token")

        self.assertIsNone(self.middleware.process_request(request))

        self.assertEqual(request.supabase_user, raw_user)
        self.assertEqual(request.supabase_token, "token")

    @override_settings(SUPABASE_URL="https://test.supabase.co", SUPABASE_ANON_KEY="anon")
    @patch("core.middleware.create_client")
    def test_middleware_ignores_supabase_errors(self, create_client):
        client = Mock()
        client.auth.get_user.side_effect = RuntimeError("supabase down")
        create_client.return_value = client
        request = self.factory.get("/", HTTP_AUTHORIZATION="Bearer token")

        self.assertIsNone(self.middleware.process_request(request))
        self.assertFalse(hasattr(request, "supabase_user"))


class BambaraVoiceServiceTest(TestCase):
    @override_settings(BAMBARA_API_BASE_URL="https://ml-api.railway.app/")
    def test_translate_posts_to_translate_endpoint(self):
        response = Mock(status_code=200)
        response.json.return_value = {
            "translated_text": "Merci",
            "source_lang": "bm",
            "target_lang": "fr",
            "model": "translation-model",
        }

        with patch("core.services.bambara_voice.requests.post", return_value=response) as post:
            result = bambara_voice.translate_bambara_text("I ni ce", "bm", "fr")

        self.assertEqual(result["translated_text"], "Merci")
        post.assert_called_once_with(
            "https://ml-api.railway.app/translate",
            json={"text": "I ni ce", "source_lang": "bm", "target_lang": "fr"},
            headers={},
            timeout=60,
        )

    @override_settings(BAMBARA_API_BASE_URL="https://ml-api.railway.app", BAMBARA_API_KEY="secret")
    def test_transcribe_posts_multipart_audio_with_optional_api_key(self):
        response = Mock(status_code=200)
        response.json.return_value = {
            "text": "I ni ce",
            "language": "bm",
            "duration_s": 2.4,
            "model": "asr-model",
        }
        upload = SimpleNamespace(
            name="claim.wav",
            content_type="audio/wav",
            read=Mock(return_value=b"audio-bytes"),
        )

        with patch("core.services.bambara_voice.requests.post", return_value=response) as post:
            result = bambara_voice.transcribe_bambara_audio(upload, "bm")

        self.assertEqual(result["text"], "I ni ce")
        post.assert_called_once()
        _, kwargs = post.call_args
        self.assertEqual(kwargs["headers"], {"Authorization": "Bearer secret"})
        self.assertEqual(kwargs["data"], {"language": "bm"})
        self.assertEqual(kwargs["files"]["file"], ("claim.wav", b"audio-bytes", "audio/wav"))

    @override_settings(BAMBARA_API_BASE_URL="")
    def test_translate_requires_configured_base_url(self):
        with self.assertRaisesRegex(RuntimeError, "Bambara API is not configured"):
            bambara_voice.translate_bambara_text("I ni ce", "bm", "fr")

    @override_settings(BAMBARA_API_BASE_URL="https://ml-api.railway.app")
    def test_upstream_errors_are_sanitized(self):
        response = Mock(status_code=503, text="traceback with internals")

        with patch("core.services.bambara_voice.requests.post", return_value=response):
            with self.assertRaisesRegex(RuntimeError, "Bambara API request failed"):
                bambara_voice.translate_bambara_text("I ni ce", "bm", "fr")


def test_extract_keywords_filters_tokens_and_entities(monkeypatch):
    class FakeToken:
        def __init__(self, text, pos_, is_stop=False):
            self.text = text
            self.pos_ = pos_
            self.is_stop = is_stop

    class FakeEntity:
        def __init__(self, text):
            self.text = text

    class FakeDoc(list):
        ents = [FakeEntity("Bamako")]

    def fake_nlp(text):
        return FakeDoc(
            [
                FakeToken("Santé", "NOUN"),
                FakeToken("santé", "NOUN"),
                FakeToken("est", "VERB", is_stop=True),
                FakeToken("rapidement", "ADV"),
                FakeToken("fiable", "ADJ"),
            ]
        )

    monkeypatch.setattr(keywords_extractor, "nlp", fake_nlp)

    assert set(keywords_extractor.extract_keywords("texte", num_keywords=2)) == {
        "Santé",
        "Fiable",
        "Bamako",
    }


def test_scrape_web_sources_returns_google_results(monkeypatch):
    html = """
    <html>
      <div class="tF2Cxc"><a href="https://one.test"><h3>First result</h3></a></div>
      <div class="tF2Cxc"><a href="https://two.test"><h3>Second result</h3></a></div>
    </html>
    """
    response = Mock(text=html)
    response.raise_for_status.return_value = None
    get = Mock(return_value=response)
    monkeypatch.setattr(web_scraper.requests, "get", get)

    sources = web_scraper.scrape_web_sources("check ia")

    assert sources == [
        {"title": "First result", "link": "https://one.test"},
        {"title": "Second result", "link": "https://two.test"},
    ]
    get.assert_called_once()


def test_scrape_web_sources_returns_empty_list_on_errors(monkeypatch):
    monkeypatch.setattr(
        web_scraper.requests,
        "get",
        Mock(side_effect=RuntimeError("network down")),
    )

    assert web_scraper.scrape_web_sources("check ia") == []


def test_pixel_analyzer_reports_unavailable_without_credentials(monkeypatch):
    monkeypatch.setattr(pixel_analyzer, "PIXEL_ANALYZER_API_USER", None)
    monkeypatch.setattr(pixel_analyzer, "PIXEL_ANALYZER_API_SECRET", None)

    assert pixel_analyzer.is_available() is False
    assert pixel_analyzer.detect_ai_image("https://image.test/pic.jpg") == {
        "success": False,
        "ai_score": None,
        "error": "Credentials not configured",
    }


def test_pixel_analyzer_returns_ai_score(monkeypatch):
    monkeypatch.setattr(pixel_analyzer, "PIXEL_ANALYZER_API_USER", "user")
    monkeypatch.setattr(pixel_analyzer, "PIXEL_ANALYZER_API_SECRET", "secret")
    response = Mock(status_code=200)
    response.json.return_value = {
        "status": "success",
        "type": {"ai_generated": "0.87"},
    }
    get = Mock(return_value=response)
    monkeypatch.setattr(pixel_analyzer.requests, "get", get)

    result = pixel_analyzer.detect_ai_image("https://image.test/pic.jpg")

    assert result == {"success": True, "ai_score": 0.87, "error": None}
    get.assert_called_once_with(
        pixel_analyzer.PIXEL_ANALYZER_API_URL,
        params={
            "url": "https://image.test/pic.jpg",
            "models": "genai",
            "api_user": "user",
            "api_secret": "secret",
        },
        timeout=30,
    )


@pytest.mark.parametrize(
    ("response_data", "expected_error"),
    [
        ({"status": "failure", "error": {"message": "bad request"}}, "bad request"),
        ({"status": "success", "type": {}}, "Score not found in response"),
    ],
)
def test_pixel_analyzer_handles_api_error_payloads(monkeypatch, response_data, expected_error):
    monkeypatch.setattr(pixel_analyzer, "PIXEL_ANALYZER_API_USER", "user")
    monkeypatch.setattr(pixel_analyzer, "PIXEL_ANALYZER_API_SECRET", "secret")
    response = Mock(status_code=200)
    response.json.return_value = response_data
    monkeypatch.setattr(pixel_analyzer.requests, "get", Mock(return_value=response))

    assert pixel_analyzer.detect_ai_image("https://image.test/pic.jpg") == {
        "success": False,
        "ai_score": None,
        "error": expected_error,
    }


def test_pixel_analyzer_handles_http_and_timeout_errors(monkeypatch):
    monkeypatch.setattr(pixel_analyzer, "PIXEL_ANALYZER_API_USER", "user")
    monkeypatch.setattr(pixel_analyzer, "PIXEL_ANALYZER_API_SECRET", "secret")
    response = Mock(status_code=500, text="server error")
    monkeypatch.setattr(pixel_analyzer.requests, "get", Mock(return_value=response))

    assert pixel_analyzer.detect_ai_image("https://image.test/pic.jpg") == {
        "success": False,
        "ai_score": None,
        "error": "HTTP 500",
    }

    monkeypatch.setattr(
        pixel_analyzer.requests,
        "get",
        Mock(side_effect=pixel_analyzer.requests.exceptions.Timeout),
    )
    assert pixel_analyzer.detect_ai_image("https://image.test/pic.jpg") == {
        "success": False,
        "ai_score": None,
        "error": "Request timed out",
    }


def test_pixel_analyzer_handles_request_exception(monkeypatch):
    monkeypatch.setattr(pixel_analyzer, "PIXEL_ANALYZER_API_USER", "user")
    monkeypatch.setattr(pixel_analyzer, "PIXEL_ANALYZER_API_SECRET", "secret")
    monkeypatch.setattr(
        pixel_analyzer.requests,
        "get",
        Mock(side_effect=pixel_analyzer.requests.exceptions.RequestException("bad network")),
    )

    assert pixel_analyzer.detect_ai_image("https://image.test/pic.jpg") == {
        "success": False,
        "ai_score": None,
        "error": "bad network",
    }


@pytest.mark.django_db
@patch("core.services.deep_translator.GoogleTranslator")
def test_get_facts_translated_deduplicates_translated_text(translator_cls):
    translator = Mock()
    translator.translate.side_effect = ["Texte commun", "Texte commun", "Texte unique"]
    translator_cls.return_value = translator
    Fact.objects.create(texte="First fact", source="https://one.test")
    Fact.objects.create(texte="Second fact", source="https://two.test")
    Fact.objects.create(texte="Third fact", source="https://three.test")
    request = APIRequestFactory().get("/translated-facts/")
    user = SimpleNamespace(is_authenticated=True)
    force_authenticate(request, user=user)

    response = get_facts_translated(request)

    assert response.status_code == 200
    payload = json.loads(response.content)
    assert len(payload) == 2
    assert {item["texte"] for item in payload} == {"Texte commun", "Texte unique"}
