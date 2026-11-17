from types import SimpleNamespace
from unittest.mock import Mock

import pytest
import requests

from core.services import llama_verdict, llm

SOURCES = [
    {"title": f"Titre {i}", "link": f"https://s{i}.test", "date": "2026-01-0%d" % i, "snippet": f"extrait {i}"}
    for i in range(1, 7)
]
SUMMARY = "**Résumé** de la vérification [1]. Deuxième phrase [2].\n\nEXTRAITS DES SOURCES:\nà ignorer"


def _response(content, status_code=200):
    resp = Mock(status_code=status_code)
    resp.json.return_value = {"choices": [{"message": {"content": content}}]}
    resp.raise_for_status = Mock()
    return resp


@pytest.fixture
def llama_on(settings, monkeypatch):
    settings.VERDICT_ENGINE = "llama"
    settings.LLAMA_BASE_URL = "http://llama.test:8080/"
    settings.LLAMA_TIMEOUT = 30
    settings.LLAMA_WAKE_WAIT = 0
    monkeypatch.setattr(llama_verdict, "is_ready", lambda: True)


def test_passages_are_the_cleaned_summary_then_the_first_four_sources():
    passages, links = llama_verdict.build_passages(SUMMARY, SOURCES)

    assert passages[0] == "Résumé de la vérification . Deuxième phrase ."
    assert passages[1] == "Titre 1 (2026-01-01) : extrait 1"
    assert len(passages) == 5
    assert links == [None, "https://s1.test", "https://s2.test", "https://s3.test", "https://s4.test"]


def test_passages_respect_the_length_limits_and_skip_an_empty_summary():
    long_sources = [{"title": "T", "link": "https://a.test", "snippet": "mot " * 400}]
    passages, links = llama_verdict.build_passages("", long_sources)

    assert links == ["https://a.test"]
    assert len(passages[0]) <= llama_verdict.SNIPPET_CHARS + 1

    passages, _ = llama_verdict.build_passages("Phrase complète. " * 200, [])
    assert len(passages[0]) <= llama_verdict.SUMMARY_CHARS
    assert passages[0].endswith(".")


def test_messages_follow_the_training_layout():
    messages = llama_verdict.build_messages("La terre est plate", ["un", "deux"], "2026-11-17")

    assert messages[0] == {"role": "system", "content": llama_verdict.SYSTEM_PROMPT}
    assert messages[1]["content"] == (
        "Affirmation : La terre est plate\nDate de référence : 2026-11-17\n\n"
        "Passages :\n[E1] un\n[E2] deux"
    )


def test_cited_links_skip_the_summary_and_unknown_ids():
    links = [None, "https://s1.test", "https://s2.test"]

    assert llama_verdict.cited_links(["E1", "E3", "E2", "E3", "E9", 4], links) == [
        "https://s2.test",
        "https://s1.test",
    ]
    assert llama_verdict.cited_links("E2", links) == []


@pytest.mark.parametrize(
    "raw",
    ["pas du json", '{"statut": "PEUT-ÊTRE", "explication": "x"}', '{"statut": "VRAIE"}', "[]"],
)
def test_malformed_answers_are_rejected(raw):
    with pytest.raises(llama_verdict.LlamaMalformed):
        llama_verdict.parse_answer(raw)


def test_verdict_calls_the_service_with_scoring_settings_and_maps_sources(llama_on, monkeypatch):
    post = Mock(
        return_value=_response(
            '{"statut": "FAUSSE", "explication": "Le passage E3 contredit.", "evidence_ids": ["E3"]}'
        )
    )
    monkeypatch.setattr(llama_verdict.requests, "post", post)

    result = llama_verdict.verdict("Une affirmation", SOURCES, SUMMARY)

    assert result == {
        "statut": "FAUSSE",
        "explication": "Le passage E3 contredit.",
        "sources_principales": ["https://s2.test"],
    }
    url = post.call_args[0][0]
    payload = post.call_args[1]["json"]
    assert url == "http://llama.test:8080/v1/chat/completions"
    assert post.call_args[1]["timeout"] == 30
    assert payload["temperature"] == 0
    assert payload["max_tokens"] == 256
    assert payload["cache_prompt"] is False
    assert payload["messages"][1]["content"].startswith("Affirmation : Une affirmation\n")


def test_verdict_falls_back_to_the_first_sources_when_only_the_summary_is_cited(llama_on, monkeypatch):
    monkeypatch.setattr(
        llama_verdict.requests,
        "post",
        Mock(return_value=_response('{"statut": "FAUSSE", "explication": "x", "evidence_ids": ["E1"]}')),
    )

    result = llama_verdict.verdict("Une affirmation", SOURCES, SUMMARY)

    assert result["sources_principales"] == ["https://s1.test", "https://s2.test", "https://s3.test"]


def test_verdict_is_unavailable_when_the_model_is_still_waking(llama_on, monkeypatch):
    monkeypatch.setattr(llama_verdict, "is_ready", lambda: False)
    post = Mock()
    monkeypatch.setattr(llama_verdict.requests, "post", post)

    with pytest.raises(llama_verdict.LlamaUnavailable):
        llama_verdict.verdict("Une affirmation", SOURCES, SUMMARY)
    post.assert_not_called()


@pytest.mark.parametrize(
    "error", [requests.exceptions.ConnectionError("refused"), requests.exceptions.Timeout("slow")]
)
def test_verdict_is_unavailable_on_network_errors(llama_on, monkeypatch, error):
    monkeypatch.setattr(llama_verdict.requests, "post", Mock(side_effect=error))

    with pytest.raises(llama_verdict.LlamaUnavailable):
        llama_verdict.verdict("Une affirmation", SOURCES, SUMMARY)


def test_verdict_is_unavailable_without_configuration_or_passages(llama_on, settings):
    with pytest.raises(llama_verdict.LlamaUnavailable):
        llama_verdict.verdict("Une affirmation", [], "")
    settings.LLAMA_BASE_URL = ""
    with pytest.raises(llama_verdict.LlamaUnavailable):
        llama_verdict.verdict("Une affirmation", SOURCES, SUMMARY)


def test_is_ready_treats_refused_connections_and_503_as_not_ready(settings, monkeypatch):
    settings.LLAMA_BASE_URL = "http://llama.test:8080"
    monkeypatch.setattr(
        llama_verdict.requests, "get", Mock(side_effect=requests.exceptions.ConnectionError())
    )
    assert llama_verdict.is_ready() is False
    monkeypatch.setattr(llama_verdict.requests, "get", Mock(return_value=Mock(status_code=503)))
    assert llama_verdict.is_ready() is False
    monkeypatch.setattr(llama_verdict.requests, "get", Mock(return_value=Mock(status_code=200)))
    assert llama_verdict.is_ready() is True


def test_wait_until_ready_polls_until_the_deadline(monkeypatch):
    answers = iter([False, False, True])
    monkeypatch.setattr(llama_verdict, "is_ready", lambda: next(answers))
    monkeypatch.setattr(llama_verdict.time, "sleep", lambda s: None)

    assert llama_verdict.wait_until_ready(max_wait=60) is True

    monkeypatch.setattr(llama_verdict, "is_ready", lambda: False)
    assert llama_verdict.wait_until_ready(max_wait=0) is False


# --- llm_analysis: engine switch, fallback -------------------------------------------------

GPT_FAUSSE = {"statut": "FAUSSE", "explication": "gpt dit faux", "sources_principales": ["https://g.test"]}


def test_gpt_is_the_default_engine_and_the_model_is_never_called(settings, monkeypatch):
    settings.VERDICT_ENGINE = "gpt"
    llama = Mock()
    monkeypatch.setattr(llm.llama_verdict, "verdict", llama)
    monkeypatch.setattr(llm, "gpt_analysis", Mock(return_value=GPT_FAUSSE))

    assert llm.llm_analysis("claim", SOURCES, SUMMARY) == GPT_FAUSSE
    llama.assert_not_called()


def test_the_model_answers_alone_when_it_does_not_say_true(llama_on, monkeypatch):
    answer = {"statut": "INDÉTERMINÉE", "explication": "x", "sources_principales": []}
    monkeypatch.setattr(llm.llama_verdict, "verdict", Mock(return_value=answer))
    gpt = Mock()
    monkeypatch.setattr(llm, "gpt_analysis", gpt)

    assert llm.llm_analysis("claim", SOURCES, SUMMARY) == answer
    gpt.assert_not_called()


@pytest.mark.parametrize(
    "error", [llama_verdict.LlamaUnavailable("asleep"), llama_verdict.LlamaMalformed("loop")]
)
def test_gpt_answers_when_the_model_is_unavailable_or_malformed(llama_on, monkeypatch, error):
    monkeypatch.setattr(llm.llama_verdict, "verdict", Mock(side_effect=error))
    monkeypatch.setattr(llm, "gpt_analysis", Mock(return_value=GPT_FAUSSE))

    assert llm.llm_analysis("claim", SOURCES, SUMMARY) == GPT_FAUSSE


def test_the_check_ends_in_error_when_both_engines_fail(llama_on, monkeypatch):
    monkeypatch.setattr(
        llm.llama_verdict, "verdict", Mock(side_effect=llama_verdict.LlamaUnavailable("down"))
    )
    monkeypatch.setattr(llm, "gpt_analysis", Mock(side_effect=RuntimeError("api down")))

    result = llm.llm_analysis("claim", SOURCES, SUMMARY)

    assert result["statut"] == "ERREUR"


# --- safeguard: GPT-4o-mini must agree before VRAIE is shown ---------------------------------

LLAMA_VRAIE = {"statut": "VRAIE", "explication": "E2 confirme", "sources_principales": ["https://l.test"]}


def _safeguard(monkeypatch, gpt_result):
    monkeypatch.setattr(llm.llama_verdict, "verdict", Mock(return_value=dict(LLAMA_VRAIE)))
    if isinstance(gpt_result, Exception):
        monkeypatch.setattr(llm, "gpt_analysis", Mock(side_effect=gpt_result))
    else:
        monkeypatch.setattr(llm, "gpt_analysis", Mock(return_value=gpt_result))
    return llm.llm_analysis("claim", SOURCES, SUMMARY)


def test_true_is_shown_when_gpt_agrees_with_the_models_own_explanation(llama_on, monkeypatch):
    gpt = {"statut": "VRAIE", "explication": "gpt confirme", "sources_principales": []}

    assert _safeguard(monkeypatch, gpt) == LLAMA_VRAIE


def test_disagreement_becomes_undetermined_with_a_neutral_explanation(llama_on, monkeypatch):
    result = _safeguard(monkeypatch, GPT_FAUSSE)

    assert result["statut"] == "INDÉTERMINÉE"
    assert result["explication"] == llm.DISAGREEMENT_EXPLANATION
    assert result["sources_principales"] == ["https://g.test"]


def test_disagreement_keeps_the_models_sources_when_gpt_gives_none(llama_on, monkeypatch):
    result = _safeguard(monkeypatch, {"statut": "FAUSSE", "explication": "x", "sources_principales": []})

    assert result["sources_principales"] == ["https://l.test"]


def test_gpt_undetermined_wins_over_the_models_true(llama_on, monkeypatch):
    gpt = {"statut": "INDÉTERMINÉE", "explication": "pas assez", "sources_principales": []}

    assert _safeguard(monkeypatch, gpt) == gpt


def test_true_is_never_shown_when_the_safeguard_itself_fails(llama_on, monkeypatch):
    result = _safeguard(monkeypatch, RuntimeError("api down"))

    assert result["statut"] == "ERREUR"
