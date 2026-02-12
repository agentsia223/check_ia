"""
Pixel-level AI image detection API integration.

This module is self-contained and can be removed entirely without affecting
the rest of the application. The detect_ai_generated_image() function in
image_verification.py will gracefully fall back to LLM-only detection.

To remove: delete this file and remove the import in image_verification.py.
"""

import logging
import os
import requests

logger = logging.getLogger(__name__)

PIXEL_ANALYZER_API_USER = os.getenv("PIXEL_ANALYZER_API_USER")
PIXEL_ANALYZER_API_SECRET = os.getenv("PIXEL_ANALYZER_API_SECRET")
PIXEL_ANALYZER_API_URL = "https://api.sightengine.com/1.0/check.json"


def is_available():
    """Check if pixel analyzer credentials are configured."""
    return bool(PIXEL_ANALYZER_API_USER and PIXEL_ANALYZER_API_SECRET)


def detect_ai_image(image_url):
    """
    Call pixel analysis API to detect AI-generated images.

    Args:
        image_url: Public URL of the image to analyze.

    Returns:
        dict with:
            - success (bool): Whether the API call succeeded
            - ai_score (float): 0.0 to 1.0 (higher = more likely AI), or None on failure
            - error (str): Error message if failed, or None on success
    """
    if not is_available():
        logger.warning("Pixel analyzer credentials not configured, skipping.")
        return {"success": False, "ai_score": None, "error": "Credentials not configured"}

    try:
        logger.info(f"Pixel analyzer: analyzing image {image_url[:80]}...")

        params = {
            "url": image_url,
            "models": "genai",
            "api_user": PIXEL_ANALYZER_API_USER,
            "api_secret": PIXEL_ANALYZER_API_SECRET,
        }

        response = requests.get(PIXEL_ANALYZER_API_URL, params=params, timeout=30)

        if response.status_code != 200:
            logger.error(f"Pixel analyzer HTTP error {response.status_code}: {response.text}")
            return {"success": False, "ai_score": None, "error": f"HTTP {response.status_code}"}

        data = response.json()

        if data.get("status") != "success":
            error_msg = data.get("error", {}).get("message", "Unknown error")
            logger.error(f"Pixel analyzer API error: {error_msg}")
            return {"success": False, "ai_score": None, "error": error_msg}

        ai_score = data.get("type", {}).get("ai_generated", None)

        if ai_score is None:
            logger.error(f"Pixel analyzer: ai_generated score not found in response: {data}")
            return {"success": False, "ai_score": None, "error": "Score not found in response"}

        logger.info(f"Pixel analyzer result: ai_generated={ai_score}")

        return {"success": True, "ai_score": float(ai_score), "error": None}

    except requests.exceptions.Timeout:
        logger.error("Pixel analyzer: request timed out")
        return {"success": False, "ai_score": None, "error": "Request timed out"}
    except requests.exceptions.RequestException as e:
        logger.error(f"Pixel analyzer: request error: {e}")
        return {"success": False, "ai_score": None, "error": str(e)}
    except Exception as e:
        logger.error(f"Pixel analyzer: unexpected error: {e}")
        return {"success": False, "ai_score": None, "error": str(e)}
