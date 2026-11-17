"""Client for the fine-tuned verdict model (Llama-3.2-3B-CheckIA-v1) served by llama.cpp.

The model was trained on one exact prompt layout: a fixed system prompt, then the claim, a
reference date and one to five short numbered passages. This module rebuilds that layout from
Perplexity's output, calls the private `llama-factcheck` service and maps the cited passage
numbers back to source links. The service sleeps when idle, so callers wake it first.
"""
import json
import logging
import re
import threading
import time
from datetime import date

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# Must stay identical to the prompt used for training and scoring (checkia_llama/config.py).
SYSTEM_PROMPT = (
    "Évalue l’affirmation uniquement à partir des passages numérotés fournis et de la date de "
    "référence, si elle est indiquée. Réponds en français avec un objet JSON contenant « statut » "
    "(VRAIE, FAUSSE ou INDÉTERMINÉE), « explication » et « evidence_ids » (liste des passages "
    "utilisés). Choisis INDÉTERMINÉE si les passages ne permettent pas de trancher."
)
LABELS = ("VRAIE", "FAUSSE", "INDÉTERMINÉE")
MAX_NEW_TOKENS = 256
SUMMARY_CHARS = 1200
SNIPPET_CHARS = 450
MAX_SNIPPETS = 4


class LlamaUnavailable(Exception):
    """The model could not answer in time (asleep, busy, unreachable or returned an error)."""


class LlamaMalformed(Exception):
    """The model answered, but not with the JSON object it was trained to produce."""


def _base_url():
    return (getattr(settings, "LLAMA_BASE_URL", "") or "").rstrip("/")


def _clean(text):
    text = re.sub(r"\[\d+\]", "", text or "")
    text = re.sub(r"[*#`>|]+|-{3,}", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _cut(text, limit):
    """Shorten to `limit` characters, at a sentence end when one is reasonably close."""
    if len(text) <= limit:
        return text
    text = text[:limit]
    end = max(text.rfind(". "), text.rfind(" ; "))
    return text[: end + 1] if end > limit * 0.5 else text.rsplit(" ", 1)[0] + "…"


def _snippet(source):
    head = _clean(source.get("title", ""))
    if source.get("date"):
        head += f" ({source['date']})"
    return _cut(f"{head} : {_clean(source.get('snippet', ''))}", SNIPPET_CHARS)


def _summary_body(verification_content):
    body = verification_content or ""
    return body.split("EXTRAITS DES SOURCES:")[0].split("CONTEXTE: Vérification")[0]


def build_passages(verification_content, web_sources):
    """Return (passages, links): passage texts in order, and the link behind each (None for the
    summary). Layout measured on the July evaluation: the start of Perplexity's summary, then the
    first four sources."""
    passages, links = [], []
    summary = _cut(_clean(_summary_body(verification_content)), SUMMARY_CHARS)
    if summary:
        passages.append(summary)
        links.append(None)
    for source in (web_sources or [])[:MAX_SNIPPETS]:
        passages.append(_snippet(source))
        links.append(source.get("link") or None)
    return passages, links


def build_messages(claim, passages, reference_date=None):
    reference_date = reference_date or date.today().isoformat()
    body = "\n".join(f"[E{i}] {p}" for i, p in enumerate(passages, 1))
    user = f"Affirmation : {claim}\nDate de référence : {reference_date}\n\nPassages :\n{body}"
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user},
    ]


def parse_answer(raw):
    """Return the model's JSON object, or raise LlamaMalformed."""
    text = (raw or "").replace("```json", "").replace("```", "").strip()
    try:
        answer = json.loads(text)
    except json.JSONDecodeError as exc:
        raise LlamaMalformed("réponse non JSON") from exc
    if not isinstance(answer, dict) or answer.get("statut") not in LABELS:
        raise LlamaMalformed("statut absent ou inconnu")
    if not isinstance(answer.get("explication"), str) or not answer["explication"].strip():
        raise LlamaMalformed("explication absente")
    return answer


def cited_links(evidence_ids, links):
    """Map ["E2", "E3"] back to source links, keeping order and dropping the summary."""
    out = []
    for evidence_id in evidence_ids if isinstance(evidence_ids, list) else []:
        match = re.fullmatch(r"E(\d+)", evidence_id) if isinstance(evidence_id, str) else None
        index = int(match.group(1)) - 1 if match else -1
        if 0 <= index < len(links) and links[index] and links[index] not in out:
            out.append(links[index])
    return out


def is_ready():
    """True when the service answers its health check. Never raises."""
    try:
        return requests.get(f"{_base_url()}/health", timeout=3).status_code == 200
    except requests.exceptions.RequestException:
        return False


def warm_up_async():
    """Wake the sleeping service in the background. While it wakes the connection is refused,
    then it answers 503, then 200; the request alone is what wakes it."""
    if _base_url():
        threading.Thread(target=is_ready, daemon=True).start()


def wait_until_ready(max_wait=None):
    max_wait = getattr(settings, "LLAMA_WAKE_WAIT", 15) if max_wait is None else max_wait
    deadline = time.monotonic() + max_wait
    while True:
        if is_ready():
            return True
        if time.monotonic() >= deadline:
            return False
        time.sleep(1)


def verdict(claim, web_sources, verification_content=""):
    """Ask the fine-tuned model. Returns {statut, explication, sources_principales}.

    Raises LlamaUnavailable or LlamaMalformed; the caller decides what to do then.
    """
    if not _base_url():
        raise LlamaUnavailable("LLAMA_BASE_URL non configurée")
    passages, links = build_passages(verification_content, web_sources)
    if not passages:
        raise LlamaUnavailable("aucun passage à fournir au modèle")
    if not wait_until_ready():
        raise LlamaUnavailable("modèle non prêt (réveil en cours ou service arrêté)")

    payload = {
        "messages": build_messages(claim, passages),
        "temperature": 0,
        "max_tokens": MAX_NEW_TOKENS,
        "cache_prompt": False,
    }
    started = time.monotonic()
    try:
        response = requests.post(
            f"{_base_url()}/v1/chat/completions",
            json=payload,
            timeout=getattr(settings, "LLAMA_TIMEOUT", 30),
        )
        response.raise_for_status()
        raw = response.json()["choices"][0]["message"]["content"]
    except (requests.exceptions.RequestException, KeyError, IndexError, ValueError) as exc:
        raise LlamaUnavailable(f"appel au modèle échoué: {type(exc).__name__}") from exc
    logger.info("Llama: réponse en %.1f s", time.monotonic() - started)

    answer = parse_answer(raw)
    all_links = [link for link in links if link]
    return {
        "statut": answer["statut"],
        "explication": answer["explication"].strip(),
        "sources_principales": cited_links(answer.get("evidence_ids"), links) or all_links[:3],
    }
