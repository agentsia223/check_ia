import logging
import requests
import base64
import os
from dotenv import load_dotenv
from io import BytesIO
from PIL import Image
import json

load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Model configuration — change here to switch models globally
AI_DETECTION_MODEL = "openai/gpt-4.1-mini"
CONTENT_VERIFICATION_MODEL = "openai/gpt-4.1-mini"


def _get_openai_client():
    """Get the OpenAI client configured for OpenRouter"""
    from core.services.llm import client
    return client


def encode_image_url_to_base64(image_url):
    """
    Download an image from URL and encode it to base64
    """
    try:
        logging.info(f"Downloading image from: {image_url}")

        response = requests.get(image_url, timeout=30)

        if response.status_code != 200:
            logging.error(f"HTTP error {response.status_code}: {response.text}")
            return None

        response.raise_for_status()

        content_type = response.headers.get('content-type', '')

        if not content_type.startswith('image/'):
            logging.error(f"Invalid content type: {content_type}")
            return None

        base64_encoded = base64.b64encode(response.content).decode('utf-8')

        img = Image.open(BytesIO(response.content))
        format_lower = img.format.lower() if img.format else 'jpeg'

        data_url = f"data:image/{format_lower};base64,{base64_encoded}"

        logging.info(f"Image encoded successfully, format: {format_lower}, size: {len(response.content)} bytes")
        return data_url
    except requests.exceptions.RequestException as e:
        logging.error(f"Request error while downloading: {e}")
        return None
    except Exception as e:
        logging.error(f"Error encoding image URL: {e}")
        return None


def encode_image_to_base64(image_file):
    """
    Encode an uploaded image file to base64
    """
    try:
        image_data = image_file.read()
        base64_encoded = base64.b64encode(image_data).decode('utf-8')

        image_file.seek(0)
        img = Image.open(image_file)
        format_lower = img.format.lower() if img.format else 'jpeg'

        data_url = f"data:image/{format_lower};base64,{base64_encoded}"
        return data_url
    except Exception as e:
        logging.error(f"Error encoding image: {e}")
        return None


# --- JSON schemas for structured output ---

AI_DETECTION_SCHEMA = {
    "type": "json_schema",
    "json_schema": {
        "name": "ai_detection_result",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "statut": {
                    "type": "string",
                    "enum": ["AUTHENTIQUE", "IA_DÉTECTÉE", "INCERTAIN"],
                    "description": "Le verdict final sur l'image"
                },
                "confiance": {
                    "type": "integer",
                    "description": "Niveau de confiance dans le verdict (0-100). 100 = absolument certain du verdict."
                },
                "probabilite_ia": {
                    "type": "integer",
                    "description": "Probabilité que l'image soit générée par IA (0-100). 0 = certainement authentique, 100 = certainement IA."
                },
                "explication": {
                    "type": "string",
                    "description": "Analyse détaillée en français avec les éléments examinés, suspects et authentiques. Utiliser le markdown pour la mise en forme (gras, listes, etc)."
                },
                "elements_suspects": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Liste des éléments suspects identifiés dans l'image"
                },
                "elements_authentiques": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Liste des éléments qui suggèrent une image authentique"
                }
            },
            "required": ["statut", "confiance", "probabilite_ia", "explication", "elements_suspects", "elements_authentiques"],
            "additionalProperties": False
        }
    }
}

CONTENT_VERIFICATION_SCHEMA_WITH_CLAIM = {
    "type": "json_schema",
    "json_schema": {
        "name": "content_verification_result",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "statut": {
                    "type": "string",
                    "enum": ["VRAIE", "FAUSSE", "INDÉTERMINÉE"],
                    "description": "Le verdict sur la véracité de l'affirmation"
                },
                "confiance": {
                    "type": "integer",
                    "description": "Niveau de confiance dans le verdict (0-100)"
                },
                "explication": {
                    "type": "string",
                    "description": "Analyse détaillée en français. Utiliser le markdown pour la mise en forme."
                },
                "elements_cles": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Éléments clés identifiés dans l'image pour la vérification"
                }
            },
            "required": ["statut", "confiance", "explication", "elements_cles"],
            "additionalProperties": False
        }
    }
}

CONTENT_VERIFICATION_SCHEMA_NO_CLAIM = {
    "type": "json_schema",
    "json_schema": {
        "name": "content_analysis_result",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "statut": {
                    "type": "string",
                    "enum": ["ANALYSÉE"],
                    "description": "Toujours ANALYSÉE pour une analyse sans affirmation"
                },
                "confiance": {
                    "type": "integer",
                    "description": "Niveau de confiance dans l'analyse (0-100)"
                },
                "explication": {
                    "type": "string",
                    "description": "Analyse détaillée en français de l'image. Utiliser le markdown pour la mise en forme."
                },
                "elements_cles": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Éléments clés identifiés dans l'image"
                }
            },
            "required": ["statut", "confiance", "explication", "elements_cles"],
            "additionalProperties": False
        }
    }
}


# --- Pixel analyzer integration (optional, can be removed) ---

def _run_pixel_analyzer(image_url):
    """
    Run pixel-level AI detection. Returns None if unavailable.
    To remove: delete core/services/pixel_analyzer.py and this function.
    """
    try:
        from core.services.pixel_analyzer import is_available, detect_ai_image
        if not is_available():
            return None
        result = detect_ai_image(image_url)
        if result["success"]:
            return result["ai_score"]
        logging.warning(f"Pixel analyzer failed: {result['error']}. Falling back to LLM-only.")
        return None
    except ImportError:
        return None
    except Exception as e:
        logging.warning(f"Pixel analyzer error: {e}. Falling back to LLM-only.")
        return None


# --- Main detection functions ---

def detect_ai_generated_image(image_url):
    """
    Détecte si une image est générée par IA ou est un deepfake.

    Pipeline:
    1. Pixel-level analysis (primary signal)
    2. LLM vision analysis (provides human-readable explanation)

    If pixel analyzer is unavailable, falls back to LLM-only detection.
    """
    try:
        logging.info("=== AI DETECTION START ===")
        logging.info(f"Image URL: {image_url}")

        # Step 1: Pixel-level detection (optional)
        pixel_score = _run_pixel_analyzer(image_url)
        has_pixel_analyzer = pixel_score is not None

        if has_pixel_analyzer:
            logging.info(f"Pixel analyzer AI score: {pixel_score:.2f}")

        # Step 2: Encode image for LLM analysis
        data_url = encode_image_url_to_base64(image_url)
        if not data_url:
            return {
                "statut": "ERREUR",
                "explication": "Impossible d'encoder l'image depuis l'URL",
                "details": {},
                "confidence": 0
            }

        # Build prompt — same critical analysis always, pixel analyzer context appended when available
        prompt = """Tu es un expert en analyse forensique d'images numériques, spécialisé dans la détection d'images générées par intelligence artificielle et de deepfakes.

Analyse cette image avec un regard CRITIQUE et SCEPTIQUE. Ne présume PAS qu'une image est authentique par défaut — les générateurs d'images IA modernes (Midjourney, DALL-E, Stable Diffusion, Flux, Gemini) produisent des résultats très réalistes.

IMPORTANT: Sois honnête — si tu ne vois pas de défaut clair, dis-le. Ne fabrique pas d'artefacts inexistants. Mais examine chaque catégorie avec attention.

Examine SYSTÉMATIQUEMENT chaque catégorie:

1. **Texte et inscriptions**: Cherche du texte illisible, des lettres déformées, des mots inventés ou incohérents. C'est l'un des indicateurs les PLUS FIABLES de génération IA. Lis chaque mot visible et vérifie s'il est correct (orthographe, sens).

2. **Visages et anatomie**: Asymétries faciales anormales, yeux de tailles ou couleurs différentes, dents fusionnées ou floues, oreilles incohérentes, nombre incorrect de doigts, mains déformées.

3. **Arrière-plans**: Motifs répétitifs, objets qui se fondent les uns dans les autres, architecture impossible, foules avec des visages uniformes ou flous.

4. **Éclairage et ombres**: Direction des ombres incohérente, reflets impossibles, éclairage qui ne correspond pas à la scène.

5. **Textures et matériaux**: Transitions floues entre les matériaux (peau/cheveux/vêtements), textures trop lisses ou trop uniformes, motifs de tissu incohérents.

6. **Cohérence globale**: Perspective incorrecte, proportions anormales, bordures d'objets floues ou qui saignent.

7. **Filigranes et logos**: Cherche des filigranes de générateurs IA (logos Midjourney, DALL-E, Gemini, Stable Diffusion, etc.) dans les coins ou bordures de l'image.

RÈGLES DE DÉCISION:
- Si du texte illisible/inventé est présent → forte probabilité IA
- Si les mains ont un nombre incorrect de doigts → forte probabilité IA
- Si les visages en arrière-plan sont uniformément flous/similaires → probable IA
- Si un filigrane de générateur IA est visible → certitude IA
- Si l'image semble "trop parfaite" (éclairage idéal, composition stock-photo, peau trop lisse) → suspecte
- Si AUCUN artefact n'est détecté et l'image montre des imperfections naturelles → probablement authentique
- En cas de doute, penche vers INCERTAIN plutôt que AUTHENTIQUE

Le champ "confiance" représente à quel point tu es sûr de ton verdict (pas la probabilité IA).
Le champ "probabilite_ia" représente la probabilité que l'image soit générée par IA.

Réponds en français."""

        if has_pixel_analyzer:
            pixel_pct_prompt = int(pixel_score * 100)
            prompt += f"""

NOTE ADDITIONNELLE: Notre analyseur spécialisé par analyse de pixels a estimé une probabilité de {pixel_pct_prompt}% que cette image soit générée par IA. Ce score est fiable — tu peux le mentionner dans ton explication en le référant comme "notre analyseur de pixels" ou "notre détecteur spécialisé". Cependant, effectue ta propre analyse visuelle de manière indépendante et rigoureuse. Rapporte les artefacts que TU observes, pas ce que le score suggère. Le verdict final et le score seront déterminés par le détecteur pixel, mais ton analyse visuelle doit rester ta propre expertise. Ne mentionne JAMAIS le nom d'un outil ou service tiers dans ton analyse."""

        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": data_url}}
                ]
            }
        ]

        client = _get_openai_client()

        logging.info(f"Sending AI detection request via {AI_DETECTION_MODEL}...")
        response = client.chat.completions.create(
            extra_headers={
                "HTTP-Referer": "https://check-ia.app",
                "X-Title": "Check-IA",
            },
            model=AI_DETECTION_MODEL,
            messages=messages,
            temperature=0.2,
            max_tokens=1500,
            response_format=AI_DETECTION_SCHEMA
        )

        raw_text = response.choices[0].message.content.strip()
        logging.info(f"AI detection response received: {raw_text[:300]}...")

        try:
            parsed = json.loads(raw_text)

            llm_confiance = max(0, min(100, parsed.get("confiance", 50)))
            llm_probabilite_ia = max(0, min(100, parsed.get("probabilite_ia", 50)))

            # Step 3: Determine verdict and confidence
            if has_pixel_analyzer:
                # Pixel analyzer is the authority for verdict and score
                pixel_pct = int(pixel_score * 100)
                if pixel_pct >= 60:
                    final_statut = "IA_DÉTECTÉE"
                elif pixel_pct <= 30:
                    final_statut = "AUTHENTIQUE"
                else:
                    final_statut = "INCERTAIN"
                final_probabilite_ia = pixel_pct
                final_confiance = min(95, 50 + abs(pixel_pct - 50))
            else:
                # LLM decides everything when pixel analyzer is unavailable
                final_statut = parsed["statut"]
                final_probabilite_ia = llm_probabilite_ia
                final_confiance = llm_confiance

            logging.info(
                f"Final result: statut={final_statut}, confiance={final_confiance}%, "
                f"probabilite_ia={final_probabilite_ia}% "
                f"(pixel_analyzer={'yes' if has_pixel_analyzer else 'no'})"
            )

            return {
                "statut": final_statut,
                "explication": parsed["explication"],
                "details": {
                    "type_verification": "Détection IA",
                    "probabilite_ia": final_probabilite_ia,
                    "elements_suspects": parsed.get("elements_suspects", []),
                    "elements_authentiques": parsed.get("elements_authentiques", []),
                    "model": AI_DETECTION_MODEL,
                    "pixel_analyzer_score": pixel_score if has_pixel_analyzer else None,
                    "llm_probabilite_ia": llm_probabilite_ia,
                },
                "confidence": final_confiance
            }
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            logging.warning(f"Failed to parse structured JSON response: {e}. Falling back.")
            return {
                "statut": "INCERTAIN",
                "explication": raw_text,
                "details": {
                    "type_verification": "Détection IA",
                    "erreur_parsing": True,
                    "model": AI_DETECTION_MODEL
                },
                "confidence": 50
            }

    except Exception as e:
        logging.error(f"Error during AI detection: {e}")
        import traceback
        logging.error(f"Traceback: {traceback.format_exc()}")
        return {
            "statut": "ERREUR",
            "explication": f"Une erreur s'est produite: {str(e)}",
            "details": {},
            "confidence": 0
        }


def verify_image_content(image_url, claim_text=""):
    """
    Vérifie le contenu d'une image et analyse les affirmations à son sujet.
    Utilise un modèle de vision via OpenRouter avec sortie JSON structurée.
    """
    try:
        logging.info("=== IMAGE CONTENT VERIFICATION START ===")
        logging.info(f"Image URL: {image_url}")
        logging.info(f"Claim text: {claim_text}")

        from datetime import datetime
        current_date = datetime.now().strftime("%d/%m/%Y")
        current_year = datetime.now().year

        # Encoder l'image depuis l'URL
        data_url = encode_image_url_to_base64(image_url)
        if not data_url:
            return {
                "statut": "ERREUR",
                "explication": "Impossible d'encoder l'image depuis l'URL",
                "details": {},
                "confidence": 0
            }

        if claim_text:
            prompt = f"""Tu es un expert en vérification de faits par l'image. Nous sommes le {current_date} (année {current_year}).

Analyse cette image et vérifie si l'affirmation suivante est VRAIE ou FAUSSE:

**AFFIRMATION À VÉRIFIER:** {claim_text}

Instructions:
1. Décris en détail ce que tu vois dans l'image
2. Analyse si l'affirmation correspond à ce qui est visible
3. Vérifie la cohérence temporelle (dates, événements mentionnés) avec la date actuelle ({current_date})
4. Cherche des incohérences, des manipulations ou des éléments suspects
5. Évalue la crédibilité de l'image (qualité, contexte, cohérence)

IMPORTANT: Prends en compte que nous sommes en {current_year} pour évaluer toute référence temporelle.

Le champ "confiance" représente à quel point tu es sûr de ton verdict (0-100).

Réponds en français."""
            response_format = CONTENT_VERIFICATION_SCHEMA_WITH_CLAIM
        else:
            prompt = f"""Tu es un expert en analyse d'images. Nous sommes le {current_date} (année {current_year}).

Analyse cette image en détail et fournis:
1. Une description complète de ce qui est visible
2. Une analyse de l'authenticité de l'image
3. La détection d'éventuelles manipulations ou incohérences
4. Le contexte probable de l'image
5. Des éléments qui pourraient aider à vérifier son origine

Le champ "confiance" représente à quel point tu es sûr de ton analyse (0-100).

Réponds en français."""
            response_format = CONTENT_VERIFICATION_SCHEMA_NO_CLAIM

        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": data_url}}
                ]
            }
        ]

        client = _get_openai_client()

        logging.info(f"Sending content verification request via {CONTENT_VERIFICATION_MODEL}...")
        response = client.chat.completions.create(
            extra_headers={
                "HTTP-Referer": "https://check-ia.app",
                "X-Title": "Check-IA",
            },
            model=CONTENT_VERIFICATION_MODEL,
            messages=messages,
            temperature=0.3,
            max_tokens=1500,
            response_format=response_format
        )

        raw_text = response.choices[0].message.content.strip()
        logging.info(f"Content verification response received: {raw_text[:300]}...")

        try:
            parsed = json.loads(raw_text)

            confiance = max(0, min(100, parsed.get("confiance", 50)))

            return {
                "statut": parsed["statut"],
                "explication": parsed["explication"],
                "details": {
                    "type_verification": "Contenu d'image",
                    "affirmation": claim_text,
                    "elements_cles": parsed.get("elements_cles", []),
                    "model": CONTENT_VERIFICATION_MODEL
                },
                "confidence": confiance
            }
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            logging.warning(f"Failed to parse structured JSON response: {e}. Falling back.")
            return {
                "statut": "INDÉTERMINÉE" if claim_text else "ANALYSÉE",
                "explication": raw_text,
                "details": {
                    "type_verification": "Contenu d'image",
                    "affirmation": claim_text,
                    "erreur_parsing": True,
                    "model": CONTENT_VERIFICATION_MODEL
                },
                "confidence": 50
            }

    except Exception as e:
        logging.error(f"Error during image content verification: {e}")
        import traceback
        logging.error(f"Traceback: {traceback.format_exc()}")
        return {
            "statut": "ERREUR",
            "explication": f"Une erreur s'est produite: {str(e)}",
            "details": {},
            "confidence": 0
        }
