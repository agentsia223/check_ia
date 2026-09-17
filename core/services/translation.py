import html
import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

GOOGLE_TRANSLATE_URL = "https://translation.googleapis.com/language/translate/v2"


def is_configured():
    return bool(getattr(settings, "GOOGLE_TRANSLATE_API_KEY", "").strip())


def _timeout():
    return getattr(settings, "GOOGLE_TRANSLATE_TIMEOUT", 15)


def translate(text, source_lang, target_lang):
    if not text or not text.strip():
        return ""

    api_key = getattr(settings, "GOOGLE_TRANSLATE_API_KEY", "").strip()

    try:
        response = requests.post(
            GOOGLE_TRANSLATE_URL,
            params={"key": api_key},
            json={
                "q": text,
                "source": source_lang,
                "target": target_lang,
                "format": "text",
            },
            timeout=_timeout(),
        )
    except requests.exceptions.RequestException as exc:
        logger.warning("Google Translate request failed: %s", type(exc).__name__)
        raise RuntimeError("Translation request failed") from exc

    if response.status_code >= 300:
        logger.warning(
            "Google Translate returned HTTP %s", response.status_code
        )
        raise RuntimeError("Translation request failed")

    try:
        data = response.json()
        translated_text = data["data"]["translations"][0]["translatedText"]
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        logger.warning(
            "Google Translate returned unexpected payload: %s", type(exc).__name__
        )
        raise RuntimeError("Translation request failed") from exc

    return html.unescape(translated_text)
