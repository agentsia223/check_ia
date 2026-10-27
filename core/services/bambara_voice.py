import logging
import threading
import time
from urllib.parse import urljoin

import requests
from django.conf import settings

from core.services import translation

logger = logging.getLogger(__name__)


def _base_url():
    base_url = getattr(settings, "BAMBARA_API_BASE_URL", "").strip()
    if not base_url:
        raise RuntimeError("Bambara API is not configured")
    # Tolerate a base URL configured without a scheme (e.g. a bare Railway
    # host like "checkia-ml-api-production.up.railway.app"); requests raises
    # MissingSchema otherwise, surfacing to users as a 502.
    if "://" not in base_url:
        base_url = "https://" + base_url
    return base_url.rstrip("/") + "/"


def _headers():
    api_key = getattr(settings, "BAMBARA_API_KEY", "").strip()
    if not api_key:
        return {}
    return {"Authorization": f"Bearer {api_key}"}


def _timeout():
    return getattr(settings, "BAMBARA_API_TIMEOUT", 60)


class VoiceServiceStarting(RuntimeError):
    """The voice service is asleep and did not become ready in time."""

    def __init__(self, message="Voice service is starting"):
        super().__init__(message)


_HEALTH_TIMEOUT = 5


def _probe_health():
    response = requests.get(
        urljoin(_base_url(), "health"),
        headers=_headers(),
        timeout=_HEALTH_TIMEOUT,
    )
    return response.status_code == 200


def wait_until_ready(budget_seconds=90, interval_seconds=3):
    """Poll the voice service health endpoint until it answers 200 or the budget runs out."""
    deadline = time.monotonic() + budget_seconds
    warned = False
    while True:
        try:
            if _probe_health():
                return True
        except Exception as exc:  # any probe failure means "not ready"
            logger.debug("Voice service health probe failed: %s", exc)
        if not warned:
            logger.warning("Voice service not ready (asleep?); waiting up to %ss", budget_seconds)
            warned = True
        if time.monotonic() + interval_seconds >= deadline:
            logger.warning("Voice service still not ready after %ss; giving up", budget_seconds)
            return False
        time.sleep(interval_seconds)


def warm_up():
    """Fire a single health request to wake the service; never raises."""
    try:
        _probe_health()
    except Exception as exc:
        logger.debug("Voice service warm-up failed: %s", exc)


def warm_up_async():
    threading.Thread(target=warm_up, daemon=True).start()


_RETRYABLE_STATUSES = (502, 503, 504)


def _do_post(url, **kwargs):
    return requests.post(
        url,
        headers=_headers(),
        timeout=_timeout(),
        **kwargs,
    )


def _post(endpoint, **kwargs):
    url = urljoin(_base_url(), endpoint)
    try:
        response = _do_post(url, **kwargs)
    except requests.exceptions.Timeout as exc:
        logger.warning("Bambara API request timed out: %s", exc)
        raise RuntimeError("Bambara API request timed out") from exc
    except requests.exceptions.RequestException as exc:
        logger.warning("Bambara API request failed: %s", exc)
        raise RuntimeError("Bambara API request failed") from exc

    if response.status_code in _RETRYABLE_STATUSES:
        logger.warning(
            "Bambara API returned HTTP %s for %s, retrying once",
            response.status_code,
            endpoint,
        )
        time.sleep(2)
        try:
            response = _do_post(url, **kwargs)
        except requests.exceptions.Timeout as exc:
            logger.warning("Bambara API request timed out: %s", exc)
            raise RuntimeError("Bambara API request timed out") from exc
        except requests.exceptions.RequestException as exc:
            logger.warning("Bambara API request failed: %s", exc)
            raise RuntimeError("Bambara API request failed") from exc

    if response.status_code >= 400:
        logger.warning(
            "Bambara API returned HTTP %s for %s",
            response.status_code,
            endpoint,
        )
        raise RuntimeError("Bambara API request failed")

    try:
        return response.json()
    except ValueError as exc:
        logger.warning("Bambara API returned invalid JSON")
        raise RuntimeError("Bambara API returned invalid JSON") from exc


def translate_bambara_text(text, source_lang="bm", target_lang="fr"):
    if translation.is_configured():
        translated_text = translation.translate(text, source_lang, target_lang)
        return {
            "translated_text": translated_text,
            "source_lang": source_lang,
            "target_lang": target_lang,
            "provider": "google",
        }

    return _post(
        "translate",
        json={
            "text": text,
            "source_lang": source_lang,
            "target_lang": target_lang,
        },
    )


def transcribe_bambara_audio(uploaded_file, language="bm"):
    if not wait_until_ready():
        raise VoiceServiceStarting()

    filename = getattr(uploaded_file, "name", "audio")
    content_type = getattr(uploaded_file, "content_type", "application/octet-stream")
    file_bytes = uploaded_file.read()

    data = {}
    if language:
        data["language"] = language

    return _post(
        "transcribe",
        data=data,
        files={"file": (filename, file_bytes, content_type)},
    )
