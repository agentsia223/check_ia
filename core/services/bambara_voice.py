import logging
from urllib.parse import urljoin

import requests
from django.conf import settings

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


def _post(endpoint, **kwargs):
    url = urljoin(_base_url(), endpoint)
    try:
        response = requests.post(
            url,
            headers=_headers(),
            timeout=_timeout(),
            **kwargs,
        )
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
    return _post(
        "translate",
        json={
            "text": text,
            "source_lang": source_lang,
            "target_lang": target_lang,
        },
    )


def transcribe_bambara_audio(uploaded_file, language="bm"):
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
