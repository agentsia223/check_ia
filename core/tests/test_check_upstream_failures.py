"""A failed upstream call (LLM, vision model) must end a web check in `error`,
never in `done` with a verdict, and its error text must never reach the
check's explanation. The legacy Submission path keeps its behaviour.
"""
from unittest.mock import Mock, patch

from django.test import TestCase
from rest_framework.test import APIClient

from core.models import Check, Fact, Submission
from core.services import ai_analysis, image_verification, llm
from core.tasks import SAFE_ANALYSIS_ERROR_MESSAGE, analyze_submission_text_task, run_image_check, run_text_check
from core.tests.test_checks import make_check

UPSTREAM_ERROR = "Error code: 401 - {'error': {'message': 'User not found.', 'code': 401}}"


class FailingCompletions:
    def create(self, **kwargs):
        raise RuntimeError(UPSTREAM_ERROR)


class FailingClient:
    def __init__(self):
        self.chat = Mock(completions=FailingCompletions())


def no_sources(text):
    return {"verification_content": "", "sources": [], "citations": [], "raw_content": ""}


class TextCheckLlmFailureTest(TestCase):
    def assertSafeError(self, check):
        check.refresh_from_db()
        self.assertEqual((check.state, check.verdict), ("error", ""))
        self.assertEqual(check.explanation, SAFE_ANALYSIS_ERROR_MESSAGE)
        self.assertEqual(check.sources, [])
        body = APIClient().get(f"/api/checks/{check.public_id}/").content.decode()
        self.assertNotIn("401", body)
        self.assertNotIn("Erreur:", body)

    def test_llm_fallback_ends_in_error_end_to_end(self):
        check = make_check(state="running", verdict="", claim="Le fleuve Niger coule vers le nord")
        with patch.object(ai_analysis, "translate_text", return_value=None), \
                patch.object(ai_analysis, "search_with_perplexity", side_effect=no_sources), \
                patch.object(llm, "client", FailingClient()):
            result = run_text_check(check.pk)
        self.assertEqual(result["state"], "error")
        self.assertSafeError(check)

    @patch("core.tasks.analyze_text")
    def test_flagged_fallback_with_rejected_classifier_ends_in_error(self, analyze_text):
        with patch.object(llm, "client", FailingClient()):
            analysis = llm.llm_analysis("claim", "rejeté", [{"link": "https://a.org/1", "title": "A"}])
        self.assertEqual(analysis["statut"], "FAUSSE")
        analyze_text.return_value = (analysis, [{"title": "A", "link": "https://a.org/1"}])
        check = make_check(state="running", verdict="")
        run_text_check(check.pk)
        self.assertSafeError(check)

    @patch("core.tasks.analyze_text")
    def test_unflagged_result_is_still_a_verdict(self, analyze_text):
        analyze_text.return_value = ({"statut": "FAUSSE", "explication": "Contredit par A."}, [])
        check = make_check(state="running", verdict="")
        run_text_check(check.pk)
        check.refresh_from_db()
        self.assertEqual((check.state, check.verdict), ("done", "faux"))

    @patch("core.tasks.analyze_text")
    def test_legacy_submission_task_unchanged_by_the_flag(self, analyze_text):
        with patch.object(llm, "client", FailingClient()):
            analysis = llm.llm_analysis("claim", "vérifié", [])
        analyze_text.return_value = (analysis, [])
        submission = Submission.objects.create(
            supabase_user_id="00000000-0000-0000-0000-000000000001", user_email="a@example.com", texte="Une affirmation",
        )
        with patch("core.services.keywords_extractor.extract_keywords", return_value=[]):
            analyze_submission_text_task(submission.pk, "Une affirmation")

        submission.refresh_from_db()
        # Same as before the flag existed: the legacy fallback is stored as-is.
        self.assertEqual(submission.statut, "vérifié")
        self.assertEqual(submission.detailed_result, analysis["explication"])
        self.assertIn(UPSTREAM_ERROR, submission.detailed_result)
        self.assertEqual(Fact.objects.filter(texte="Une affirmation").count(), 1)


class ImageCheckUpstreamFailureTest(TestCase):
    def run_failing(self, kind, claim=""):
        check = make_check(kind=kind, claim=claim, state="running", verdict="", image_url="https://x.org/a.jpeg")
        with patch.object(image_verification, "_run_pixel_analyzer", return_value=None), \
                patch.object(image_verification, "encode_image_url_to_base64", return_value="data:image/jpeg;base64,AA"), \
                patch.object(image_verification, "_get_openai_client", return_value=FailingClient()):
            result = run_image_check(check.pk)
        self.assertEqual(result["state"], "error")
        check.refresh_from_db()
        self.assertEqual((check.state, check.verdict, check.confidence), ("error", "", None))
        self.assertEqual(check.explanation, SAFE_ANALYSIS_ERROR_MESSAGE)
        self.assertNotIn("401", APIClient().get(f"/api/checks/{check.public_id}/").content.decode())

    def test_content_check_with_failing_vision_model_ends_in_error(self):
        self.run_failing("image_content", claim="Photo de la crue")

    def test_ai_detection_with_failing_vision_model_ends_in_error(self):
        self.run_failing("image_ai")

    def test_unreachable_image_ends_in_error(self):
        check = make_check(kind="image_ai", claim="", state="running", verdict="", image_url="https://x.org/a.jpeg")
        with patch.object(image_verification, "_run_pixel_analyzer", return_value=None), \
                patch.object(image_verification, "encode_image_url_to_base64", return_value=None):
            run_image_check(check.pk)
        check.refresh_from_db()
        self.assertEqual((check.state, check.explanation), ("error", SAFE_ANALYSIS_ERROR_MESSAGE))
