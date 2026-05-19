import io
import json
import uuid
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from django.core.files.base import ContentFile

from core.models import Fact, ImageVerification, Keyword, Submission
from core.services import image_verification, llm, perplexity_search, supabase_storage
from core.tasks import (
    analyze_submission_text_task,
    detect_ai_image_task,
    upload_and_verify_image_task,
    verify_image_content_task,
)


class FakeCompletions:
    def __init__(self, content=None, side_effect=None):
        self.content = content
        self.side_effect = side_effect
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        if self.side_effect:
            raise self.side_effect
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=self.content))]
        )


class FakeOpenAIClient:
    def __init__(self, content=None, side_effect=None):
        self.chat = SimpleNamespace(
            completions=FakeCompletions(content=content, side_effect=side_effect)
        )


class FakeStorageBucket:
    def __init__(self, signed_url=None, public_url="https://public.test/file.jpg"):
        self.signed_url = signed_url
        self.public_url = public_url
        self.upload_calls = []
        self.removed = None

    def upload(self, **kwargs):
        self.upload_calls.append(kwargs)
        return {"path": kwargs["path"]}

    def create_signed_url(self, path, expires_in):
        return self.signed_url

    def get_public_url(self, path):
        return self.public_url

    def remove(self, paths):
        self.removed = paths
        return [{"name": paths[0]}]


class FakeStorage:
    def __init__(self, bucket, buckets=None):
        self.bucket = bucket
        self.buckets = buckets or []
        self.created_bucket = None

    def from_(self, bucket_name):
        self.bucket_name = bucket_name
        return self.bucket

    def list_buckets(self):
        return self.buckets

    def create_bucket(self, bucket_name, options):
        self.created_bucket = (bucket_name, options)
        return {"name": bucket_name}


class FakeSupabaseClient:
    def __init__(self, bucket=None, buckets=None):
        self.storage = FakeStorage(bucket or FakeStorageBucket(), buckets=buckets)


def test_llm_analysis_parses_json_and_supplies_missing_fields(monkeypatch):
    response = "```json\n{\"statut\":\"VRAIE\"}\n```"
    fake_client = FakeOpenAIClient(content=response)
    monkeypatch.setattr(llm, "client", fake_client)

    result = llm.llm_analysis(
        "translated claim",
        "vérifié",
        [{"title": "Source", "link": "https://source.test", "snippet": "evidence"}],
        "verification content",
    )

    assert result == {
        "statut": "VRAIE",
        "explication": response,
        "sources_principales": ["https://source.test"],
    }
    call = fake_client.chat.completions.calls[0]
    assert call["model"] == "openai/gpt-4o-mini"
    assert "translated claim" in call["messages"][0]["content"]


def test_llm_analysis_falls_back_for_plain_text_and_api_errors(monkeypatch):
    monkeypatch.setattr(llm, "client", FakeOpenAIClient(content="Cette déclaration est fausse."))

    plain_result = llm.llm_analysis(
        "claim",
        "vérifié",
        [{"link": "https://fallback.test"}],
    )

    assert plain_result["statut"] == "FAUSSE"
    assert plain_result["sources_principales"] == ["https://fallback.test"]

    monkeypatch.setattr(llm, "client", FakeOpenAIClient(side_effect=RuntimeError("api down")))

    error_result = llm.llm_analysis("claim", "rejeté", [{"link": "https://one.test"}])

    assert error_result["statut"] == "FAUSSE"
    assert "api down" in error_result["explication"]


def test_perplexity_search_formats_sources_and_cleans_content(monkeypatch):
    response = Mock(status_code=200)
    response.json.return_value = {
        "choices": [
            {
                "message": {
                    "content": "<think>hidden</think><p>Confirmed with public records.</p>"
                }
            }
        ],
        "search_results": [
            {
                "title": "Official report",
                "url": "https://official.test",
                "date": "2026-05-01",
                "snippet": "The source confirms the claim.",
            },
            {"url": "https://second.test"},
        ],
        "citations": ["https://official.test"],
    }
    post = Mock(return_value=response)
    monkeypatch.setattr(perplexity_search.requests, "post", post)

    result = perplexity_search.search_with_perplexity("claim text")

    assert result["sources"][0] == {
        "title": "Official report",
        "link": "https://official.test",
        "date": "2026-05-01",
        "snippet": "The source confirms the claim.",
    }
    assert "hidden" not in result["verification_content"]
    assert "EXTRAITS DES SOURCES" in result["verification_content"]
    assert result["citations"] == ["https://official.test"]
    assert post.call_args.kwargs["headers"]["Authorization"].startswith("Bearer ")


def test_perplexity_search_handles_errors_and_helper_exceptions(monkeypatch):
    response = Mock(status_code=500, text="server error")
    monkeypatch.setattr(perplexity_search.requests, "post", Mock(return_value=response))

    assert perplexity_search.search_with_perplexity("claim") == {
        "verification_content": "",
        "sources": [],
        "citations": [],
        "raw_content": "",
    }

    monkeypatch.setattr(
        perplexity_search.requests,
        "post",
        Mock(side_effect=RuntimeError("network down")),
    )
    assert perplexity_search.search_with_perplexity("claim")["sources"] == []

    monkeypatch.setattr(
        perplexity_search.re,
        "sub",
        Mock(side_effect=RuntimeError("bad regex")),
    )
    assert perplexity_search.clean_perplexity_content("<b>raw</b>") == "<b>raw</b>"

    assert "CONTEXTE" in perplexity_search.create_enriched_content("main", [], "19/05/2026")


def test_supabase_storage_upload_delete_urls_and_bucket_paths(monkeypatch):
    bucket = FakeStorageBucket(signed_url={"signedURL": "https://signed.test/file.jpg"})
    client = FakeSupabaseClient(bucket=bucket)
    monkeypatch.setattr(supabase_storage, "get_supabase_client", Mock(return_value=client))

    upload = supabase_storage.upload_image_to_supabase(
        ContentFile(b"image-bytes", name="sample.png"),
        "user-1",
        "content",
    )

    assert upload["success"] is True
    assert upload["public_url"] == "https://signed.test/file.jpg"
    assert upload["bucket"] == "image-verifications"
    assert bucket.upload_calls[0]["file"] == b"image-bytes"
    assert bucket.upload_calls[0]["file_options"]["content-type"] == "image/png"

    assert supabase_storage.delete_image_from_supabase("path/image.png") == {
        "success": True,
        "result": [{"name": "path/image.png"}],
    }
    assert bucket.removed == ["path/image.png"]

    assert supabase_storage.get_image_url_from_supabase("path/image.png") == "https://signed.test/file.jpg"

    existing_client = FakeSupabaseClient(buckets=[SimpleNamespace(name="image-verifications")])
    monkeypatch.setattr(supabase_storage, "get_supabase_client", Mock(return_value=existing_client))
    assert supabase_storage.create_bucket_if_not_exists() == {"success": True, "created": False}

    new_client = FakeSupabaseClient(buckets=[])
    monkeypatch.setattr(supabase_storage, "get_supabase_client", Mock(return_value=new_client))
    assert supabase_storage.create_bucket_if_not_exists() == {"success": True, "created": True}
    assert new_client.storage.created_bucket[0] == "image-verifications"


def test_supabase_storage_fallbacks_and_errors(monkeypatch):
    bucket = FakeStorageBucket(signed_url=None, public_url="https://public.test/file.jpg?")
    monkeypatch.setattr(
        supabase_storage,
        "get_supabase_client",
        Mock(return_value=FakeSupabaseClient(bucket=bucket)),
    )

    upload = supabase_storage.upload_image_to_supabase(b"raw-bytes", "user-2", "ai")

    assert upload["success"] is False
    assert "name" in upload["error"]

    assert supabase_storage.get_image_url_from_supabase("path/image.jpg") == "https://public.test/file.jpg"

    monkeypatch.setattr(
        supabase_storage,
        "get_supabase_client",
        Mock(side_effect=RuntimeError("supabase down")),
    )
    assert supabase_storage.delete_image_from_supabase("path") == {
        "success": False,
        "error": "supabase down",
    }
    assert supabase_storage.get_image_url_from_supabase("path") is None
    assert supabase_storage.create_bucket_if_not_exists() == {
        "success": False,
        "error": "supabase down",
    }


def test_image_encoding_and_pixel_analyzer_paths(monkeypatch):
    image = io.BytesIO()
    from PIL import Image

    Image.new("RGB", (1, 1), color="white").save(image, format="PNG")
    image_bytes = image.getvalue()

    response = Mock(status_code=200, content=image_bytes, headers={"content-type": "image/png"})
    response.raise_for_status.return_value = None
    monkeypatch.setattr(image_verification.requests, "get", Mock(return_value=response))

    data_url = image_verification.encode_image_url_to_base64("https://image.test/pic.png")
    assert data_url.startswith("data:image/png;base64,")

    uploaded = ContentFile(image_bytes, name="pic.png")
    assert image_verification.encode_image_to_base64(uploaded).startswith("data:image/png;base64,")

    bad_response = Mock(status_code=404, text="missing", headers={"content-type": "image/png"})
    monkeypatch.setattr(image_verification.requests, "get", Mock(return_value=bad_response))
    assert image_verification.encode_image_url_to_base64("https://image.test/missing.png") is None

    html_response = Mock(status_code=200, content=b"<html />", headers={"content-type": "text/html"})
    html_response.raise_for_status.return_value = None
    monkeypatch.setattr(image_verification.requests, "get", Mock(return_value=html_response))
    assert image_verification.encode_image_url_to_base64("https://image.test/not-image") is None

    monkeypatch.setattr(
        image_verification.requests,
        "get",
        Mock(side_effect=image_verification.requests.exceptions.Timeout),
    )
    assert image_verification.encode_image_url_to_base64("https://image.test/timeout") is None

    monkeypatch.setattr(image_verification, "_run_pixel_analyzer", Mock(return_value=0.72))
    assert image_verification._run_pixel_analyzer("https://image.test/pic.png") == 0.72


def test_detect_ai_generated_image_success_parse_fallback_and_errors(monkeypatch):
    parsed = {
        "statut": "AUTHENTIQUE",
        "confiance": 82,
        "probabilite_ia": 18,
        "explication": "No obvious artifacts.",
        "elements_suspects": [],
        "elements_authentiques": ["natural shadows"],
    }
    monkeypatch.setattr(image_verification, "encode_image_url_to_base64", Mock(return_value="data:image/png;base64,abc"))
    monkeypatch.setattr(image_verification, "_run_pixel_analyzer", Mock(return_value=None))
    monkeypatch.setattr(
        image_verification,
        "_get_openai_client",
        Mock(return_value=FakeOpenAIClient(content=json.dumps(parsed))),
    )

    result = image_verification.detect_ai_generated_image("https://image.test/pic.png")

    assert result["statut"] == "AUTHENTIQUE"
    assert result["confidence"] == 82
    assert result["details"]["probabilite_ia"] == 18

    monkeypatch.setattr(image_verification, "_run_pixel_analyzer", Mock(return_value=0.8))
    result = image_verification.detect_ai_generated_image("https://image.test/pic.png")
    assert result["statut"] == "IA_DÉTECTÉE"
    assert result["details"]["pixel_analyzer_score"] == 0.8

    monkeypatch.setattr(
        image_verification,
        "_get_openai_client",
        Mock(return_value=FakeOpenAIClient(content="not json")),
    )
    fallback = image_verification.detect_ai_generated_image("https://image.test/pic.png")
    assert fallback["statut"] == "INCERTAIN"
    assert fallback["details"]["erreur_parsing"] is True

    monkeypatch.setattr(image_verification, "encode_image_url_to_base64", Mock(return_value=None))
    assert image_verification.detect_ai_generated_image("https://image.test/pic.png")["statut"] == "ERREUR"

    monkeypatch.setattr(
        image_verification,
        "encode_image_url_to_base64",
        Mock(side_effect=RuntimeError("vision down")),
    )
    assert image_verification.detect_ai_generated_image("https://image.test/pic.png")["statut"] == "ERREUR"


def test_verify_image_content_with_claim_without_claim_and_fallbacks(monkeypatch):
    monkeypatch.setattr(image_verification, "encode_image_url_to_base64", Mock(return_value="data:image/png;base64,abc"))

    claim_payload = {
        "statut": "VRAIE",
        "confiance": 70,
        "explication": "The image matches the claim.",
        "elements_cles": ["visible banner"],
    }
    fake_client = FakeOpenAIClient(content=json.dumps(claim_payload))
    monkeypatch.setattr(image_verification, "_get_openai_client", Mock(return_value=fake_client))

    with_claim = image_verification.verify_image_content("https://image.test/pic.png", "claim")

    assert with_claim["statut"] == "VRAIE"
    assert with_claim["details"]["affirmation"] == "claim"
    assert fake_client.chat.completions.calls[0]["response_format"] == image_verification.CONTENT_VERIFICATION_SCHEMA_WITH_CLAIM

    no_claim_payload = {
        "statut": "ANALYSÉE",
        "confiance": 120,
        "explication": "General image analysis.",
        "elements_cles": [],
    }
    fake_client = FakeOpenAIClient(content=json.dumps(no_claim_payload))
    monkeypatch.setattr(image_verification, "_get_openai_client", Mock(return_value=fake_client))

    no_claim = image_verification.verify_image_content("https://image.test/pic.png")

    assert no_claim["statut"] == "ANALYSÉE"
    assert no_claim["confidence"] == 100
    assert fake_client.chat.completions.calls[0]["response_format"] == image_verification.CONTENT_VERIFICATION_SCHEMA_NO_CLAIM

    monkeypatch.setattr(
        image_verification,
        "_get_openai_client",
        Mock(return_value=FakeOpenAIClient(content="plain analysis")),
    )
    fallback = image_verification.verify_image_content("https://image.test/pic.png", "claim")
    assert fallback["statut"] == "INDÉTERMINÉE"
    assert fallback["details"]["erreur_parsing"] is True

    monkeypatch.setattr(image_verification, "encode_image_url_to_base64", Mock(return_value=None))
    assert image_verification.verify_image_content("https://image.test/pic.png")["statut"] == "ERREUR"

    monkeypatch.setattr(
        image_verification,
        "encode_image_url_to_base64",
        Mock(side_effect=RuntimeError("encoding exploded")),
    )
    assert image_verification.verify_image_content("https://image.test/pic.png")["statut"] == "ERREUR"


@pytest.mark.django_db
def test_analyze_submission_task_updates_submission_and_creates_fact(monkeypatch):
    user_id = uuid.uuid4()
    submission = Submission.objects.create(
        supabase_user_id=user_id,
        user_email="user@example.com",
        user_name="User",
        texte="Claim to verify",
        source="https://submitted.test",
    )
    monkeypatch.setattr(
        "core.tasks.analyze_text",
        Mock(
            return_value=(
                {
                    "statut": "VRAIE",
                    "explication": "Verified with sources",
                    "sources_principales": ["https://primary.test"],
                },
                [{"url": "https://web-source.test"}],
            )
        ),
    )
    monkeypatch.setattr("core.services.keywords_extractor.extract_keywords", Mock(return_value=["Health"]))

    result = analyze_submission_text_task.run(submission.id, "Claim to verify")

    submission.refresh_from_db()
    assert result["success"] is True
    assert submission.statut == "vérifié"
    assert submission.detailed_result == "Verified with sources"
    fact = Fact.objects.get()
    assert fact.source == "https://primary.test"
    assert Keyword.objects.filter(mot="health").exists()


@pytest.mark.django_db
def test_analyze_submission_task_handles_legacy_and_errors(monkeypatch):
    user_id = uuid.uuid4()
    submission = Submission.objects.create(
        supabase_user_id=user_id,
        user_email="user@example.com",
        texte="Legacy claim",
        source="",
    )
    monkeypatch.setattr("core.tasks.analyze_text", Mock(return_value=("rejeté", [])))

    legacy = analyze_submission_text_task.run(submission.id, "Legacy claim")

    assert legacy["success"] is True
    submission.refresh_from_db()
    assert submission.statut == "rejeté"
    assert submission.detailed_result == "Résultat d'analyse: rejeté"

    monkeypatch.setattr("core.tasks.analyze_text", Mock(side_effect=RuntimeError("analysis failed")))
    failed = analyze_submission_text_task.run(submission.id, "Legacy claim")

    assert failed["success"] is False
    submission.refresh_from_db()
    assert submission.statut == "rejeté"
    assert "analysis failed" in submission.detailed_result


@pytest.mark.django_db
def test_image_tasks_update_success_error_and_upload_paths(monkeypatch):
    verification = ImageVerification.objects.create(
        supabase_user_id=uuid.uuid4(),
        user_email="user@example.com",
        image_path="path/pic.png",
        image_url="https://image.test/pic.png",
        original_filename="pic.png",
        verification_type="content",
        status="EN_COURS",
        explanation="pending",
    )
    monkeypatch.setattr(
        "core.tasks.verify_image_content",
        Mock(
            return_value={
                "statut": "VRAIE",
                "explication": "verified",
                "confidence": 88,
                "details": {"model": "vision-model"},
            }
        ),
    )

    result = verify_image_content_task.run(verification.id, verification.image_url, "claim")

    verification.refresh_from_db()
    assert result["success"] is True
    assert verification.status == "VRAIE"
    assert verification.model_used == "vision-model"

    monkeypatch.setattr(
        "core.tasks.detect_ai_generated_image",
        Mock(
            return_value={
                "statut": "ERREUR",
                "explication": "cannot inspect",
                "confidence": 0,
                "details": {},
            }
        ),
    )
    error = detect_ai_image_task.run(verification.id, verification.image_url)
    verification.refresh_from_db()
    assert error["success"] is False
    assert verification.status == "ERREUR"

    monkeypatch.setattr("core.tasks.create_bucket_if_not_exists", Mock(return_value={"success": True}))
    monkeypatch.setattr(
        "core.tasks.upload_image_to_supabase",
        Mock(
            return_value={
                "success": True,
                "file_path": "user/content/pic.png",
                "public_url": "https://image.test/uploaded.png",
            }
        ),
    )
    monkeypatch.setattr(
        verify_image_content_task,
        "delay",
        Mock(return_value=SimpleNamespace(id="verify-task")),
    )

    upload = upload_and_verify_image_task.run(
        str(uuid.uuid4()),
        "user@example.com",
        "User",
        b"image",
        "pic.png",
        "claim",
        "content",
    )

    assert upload["success"] is True
    assert upload["task_id"] == "verify-task"

    monkeypatch.setattr(
        "core.tasks.upload_image_to_supabase",
        Mock(return_value={"success": False, "error": "upload failed"}),
    )
    failed_upload = upload_and_verify_image_task.run(
        str(uuid.uuid4()),
        "user@example.com",
        "User",
        b"image",
        "pic.png",
        "",
        "ai_detection",
    )
    assert failed_upload == {"success": False, "error": "Erreur lors de l'upload: upload failed"}
