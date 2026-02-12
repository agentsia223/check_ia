import logging
from dotenv import load_dotenv
import os
from openai import OpenAI

load_dotenv()

API_TOKEN = os.getenv("OPENROUTER_API_KEY")
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Initialiser le client OpenRouter avec l'API OpenAI
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=API_TOKEN,
)

# Fonction pour utiliser l'API OpenRouter pour l'analyse combinée
def llm_analysis(translated_text, initial_result, web_sources, perplexity_verification=""):
    try:
        logging.info("Utilisation de l'API OpenRouter pour l'analyse combinée...")
        logging.info(f"Résultat initial du modèle RoBERTa: {initial_result}")
        logging.info(f"Nombre de sources reçues: {len(web_sources)}")
        
        # Obtenir la date actuelle
        from datetime import datetime
        current_date = datetime.now().strftime("%d/%m/%Y")
        
        # Construire le prompt pour générer une réponse complète
        prompt = f"""Tu es un expert en vérification de faits. Analyse ATTENTIVEMENT toutes les informations suivantes pour déterminer la véracité de cette déclaration.

DATE ACTUELLE: {current_date}

DÉCLARATION À VÉRIFIER: {translated_text}

ANALYSE INITIALE AUTOMATIQUE: 
Le modèle de classification a donné le résultat '{initial_result}' (où 'vérifié' = probablement vrai, 'rejeté' = probablement faux).

RECHERCHE ET VÉRIFICATION PERPLEXITY:
{perplexity_verification if perplexity_verification else "Aucune vérification Perplexity disponible."}

SOURCES WEB DISPONIBLES:"""

        if web_sources:
            for i, source in enumerate(web_sources, 1):
                prompt += f"\n{i}. TITRE: {source.get('title', 'Source sans titre')}"
                prompt += f"\n   URL: {source.get('link', 'Pas de lien')}"
                if source.get('date'):
                    prompt += f"\n   DATE: {source['date']}"
                if source.get('snippet'):
                    prompt += f"\n   CONTENU: {source['snippet']}"
                prompt += "\n"
        else:
            prompt += "\nAucune source web spécifique n'a été trouvée."

        prompt += f"""

INSTRUCTIONS CRITIQUES:
1. UTILISE LA DATE ACTUELLE ({current_date}) pour déterminer si les événements mentionnés sont passés, présents ou futurs
2. ⚠️ PRIORITÉ AUX INFORMATIONS RÉCENTES: Si plusieurs événements similaires existent, privilégie TOUJOURS les plus récents
3. LIS ATTENTIVEMENT le contenu de vérification Perplexity ET les extraits des sources
4. CHERCHE des informations spécifiques comme des scores, des résultats, des confirmations dans les sources
5. Pour les entreprises/personnalités: vérifie TOUJOURS les changements récents (nominations, licenciements, etc.) AVANT les informations historiques
6. Si les sources mentionnent des scores ou résultats spécifiques, utilise-les pour confirmer ou infirmer
7. Si un événement est mentionné comme étant dans le futur par rapport à la date actuelle, mais que les sources montrent qu'il a déjà eu lieu, fais confiance aux sources
8. IGNORE l'analyse initiale automatique si les sources contredisent clairement le fait
9. Si les sources confirment l'information avec des détails spécifiques, la déclaration est VRAIE
10. Si les sources contredisent l'information, la déclaration est FAUSSE
11. Si les sources sont insuffisantes ou contradictoires, la déclaration est INDÉTERMINÉE

CONTEXTE TEMPOREL:
- Si une source mentionne une date passée par rapport à {current_date}, l'événement a déjà eu lieu
- Si une source donne un score ou un résultat final, l'événement s'est déjà déroulé
- Priorise les informations factuelles (scores, résultats) sur les annonces préliminaires

STATUTS POSSIBLES:
- VRAIE: L'information est confirmée par des sources fiables avec des détails spécifiques
- FAUSSE: L'information est contredite par des sources fiables
- INDÉTERMINÉE: Pas assez d'informations fiables pour confirmer ou infirmer

RÉPONDS STRICTEMENT AU FORMAT JSON SUIVANT:
{{
    "statut": "VRAIE|FAUSSE|INDÉTERMINÉE",
    "explication": "Explication détaillée en français basée sur les sources analysées et le contexte temporel",
    "sources_principales": ["URL1", "URL2", "URL3"]
}}

IMPORTANT: Base ta décision sur les FAITS SPÉCIFIQUES trouvés dans les sources (scores, résultats, confirmations), pas sur des annonces générales ou l'analyse initiale automatique."""

        logging.info(f"Prompt complet envoyé à OpenRouter (avec date {current_date}): {prompt[:800]}...")

        # Envoyer la requête à l'API OpenRouter
        response = client.chat.completions.create(
            extra_headers={
                "HTTP-Referer": "https://check-ia.app",
                "X-Title": "Check-IA",
            },
            model="openai/gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,  # Encore plus bas pour plus de précision factuelle
            max_tokens=700,   # Augmenté pour des réponses plus détaillées
            top_p=1,
            frequency_penalty=0,
            presence_penalty=0
        )

        # Extraire le texte généré par le LLM
        generated_text = response.choices[0].message.content.strip()
        logging.info(f"Réponse complète du LLM: {generated_text}")
        
        # Tenter de parser la réponse JSON
        try:
            import json
            # Nettoyer la réponse si elle contient des balises markdown
            clean_response = generated_text.replace('```json', '').replace('```', '').strip()
            parsed_response = json.loads(clean_response)
            logging.info(f"Réponse JSON parsée avec succès: {parsed_response}")
            
            # Validation du format de réponse
            if not isinstance(parsed_response, dict):
                raise ValueError("La réponse n'est pas un dictionnaire")
            
            if 'statut' not in parsed_response:
                parsed_response['statut'] = 'INDÉTERMINÉE'
            
            if 'explication' not in parsed_response:
                parsed_response['explication'] = generated_text
                
            if 'sources_principales' not in parsed_response:
                parsed_response['sources_principales'] = [source.get('link', '') for source in web_sources[:3] if source.get('link')]
            
            return parsed_response
            
        except (json.JSONDecodeError, ValueError) as e:
            logging.warning(f"Impossible de parser la réponse JSON: {e}, retour au format simple")
            # Fallback amélioré avec analyse du texte
            if any(keyword in generated_text.upper() for keyword in ["VRAIE", "CONFIRMÉ", "VÉRIFIÉ"]):
                status = "VRAIE"
            elif any(keyword in generated_text.upper() for keyword in ["FAUSSE", "INCORRECT", "ERRONÉ"]):
                status = "FAUSSE"
            else:
                status = "INDÉTERMINÉE"
                
            return {
                "statut": status, 
                "explication": generated_text, 
                "sources_principales": [source.get('link', '') for source in web_sources[:3] if source.get('link')]
            }
        
    except Exception as e:
        logging.error(f"Erreur lors de l'utilisation de l'API OpenRouter : {e}")
        import traceback
        logging.error(f"Traceback: {traceback.format_exc()}")
        
        # Retour de secours basé sur le résultat initial
        fallback_status = "FAUSSE" if initial_result == "rejeté" else "VRAIE"
        return {
            "statut": fallback_status,
            "explication": f"Une erreur s'est produite lors de l'analyse détaillée. Résultat basé sur l'analyse initiale: {initial_result}. Erreur: {str(e)}",
            "sources_principales": [source.get('link', '') for source in web_sources[:3] if source.get('link')]
        }