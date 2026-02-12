import logging
import requests
import os
from dotenv import load_dotenv
import re
from datetime import datetime

load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")
PERPLEXITY_URL = "https://api.perplexity.ai/chat/completions"


def search_with_perplexity(text):
    """
    Utilise l'API Perplexity pour vérifier un fait et obtenir des sources
    """
    try:
        logging.info("Utilisation de l'API Perplexity pour la recherche de sources...")
        
        # Obtenir la date actuelle pour le contexte
        current_date = datetime.now().strftime("%d/%m/%Y")
        
        # Préparer un prompt généraliste pour la vérification factuelle
        prompt = f"""Recherche et vérifie cette information en français. Je veux des FAITS SPÉCIFIQUES et des DONNÉES VÉRIFIABLES:

DATE ACTUELLE: {current_date}
INFORMATION À VÉRIFIER: {text}

⚠️ PRIORITÉ ABSOLUE AUX INFORMATIONS RÉCENTES:
- CHERCHE D'ABORD les informations les plus récentes (dernières 24-48h)
- Si l'événement semble récent, privilégie les sources d'actualité fraîches
- Distingue clairement entre événements RÉCENTS et HISTORIQUES
- Pour les entreprises/personnalités: vérifie les changements récents avant les informations anciennes

Instructions spécifiques selon le type d'information:

ÉVÉNEMENTS ET ACTUALITÉS :
- PRIORITÉ: Recherche les développements les plus récents AVANT les événements passés
- Vérifie si l'événement a réellement eu lieu RÉCEMMENT
- Trouve la date exacte et les détails précis
- Confirme avec des sources officielles et d'actualité

DONNÉES CHIFFRÉES ET STATISTIQUES:
- Vérifie les chiffres exacts
- Compare avec les données officielles
- Cite les organismes de référence

DÉCLARATIONS ET CITATIONS:
- Vérifie si la personne a réellement dit cela
- Trouve le contexte exact de la déclaration
- Cite la source originale

INFORMATIONS SCIENTIFIQUES/MÉDICALES:
- Vérifie avec des sources académiques
- Cite les études et recherches pertinentes
- Distingue les faits établis des hypothèses

INFORMATIONS TEMPORELLES:
- Vérifie les dates par rapport à la date actuelle
- Distingue les événements passés, présents et futurs
- Confirme la chronologie des faits

AUTRES DOMAINES:
- Politique, économie, technologie, culture, etc.
- Trouve des sources fiables et récentes
- Vérifie la cohérence des informations

Réponds en français avec:
- Un résumé factuel basé sur les sources les plus fiables
- Les détails spécifiques et vérifiables trouvés
- Le niveau de certitude de l'information (confirmé/probable/incertain/infirmé)
- Les nuances importantes à connaître"""
        
        logging.info(f"Prompt envoyé à Perplexity: {prompt}")
        
        payload = {
            "model": "sonar-pro",  # Utilise sonar-pro pour les recherches les plus récentes
            "messages": [
                {
                    "role": "system",
                    "content": f"Tu es un assistant de recherche factuelle expert dans la vérification d'informations de tous domaines (actualités, science, politique, économie, culture, sport, technologie, etc.). Aujourd'hui nous sommes le {current_date}. PRIORITÉ ABSOLUE: Recherche d'abord les informations les plus récentes et actuelles avant les données historiques. Fournis des informations précises et vérifiables avec des détails spécifiques et des sources fiables récentes. Sois rigoureux dans l'analyse et nuancé dans tes conclusions. Réponds toujours en français."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "search_recency_filter": "month"  # Filtre pour privilégier les résultats du dernier mois
        }
        
        headers = {
            "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
            "Content-Type": "application/json"
        }
        
        logging.info("Envoi de la requête à l'API Perplexity...")
        response = requests.post(PERPLEXITY_URL, json=payload, headers=headers)
        
        if response.status_code == 200:
            response_data = response.json()
            logging.info("Réponse reçue de Perplexity avec succès")
            
            # Extraire le contenu de la réponse
            raw_content = response_data.get('choices', [{}])[0].get('message', {}).get('content', '')
            
            # Nettoyer le contenu en supprimant les balises <think> et </think>
            cleaned_content = clean_perplexity_content(raw_content)
            logging.info(f"Contenu nettoyé de Perplexity: {cleaned_content[:400]}...")
            
            # Extraire les sources de la réponse
            search_results = response_data.get('search_results', [])
            citations = response_data.get('citations', [])
            
            logging.info(f"Nombre de search_results: {len(search_results)}")
            logging.info(f"Nombre de citations: {len(citations)}")
            
            # Formater les sources avec plus de détails
            formatted_sources = []
            for i, result in enumerate(search_results[:5]):  # Limiter à 5 sources
                source = {
                    'title': result.get('title', f'Source {i+1}'),
                    'link': result.get('url', ''),
                    'date': result.get('date', ''),
                    'snippet': result.get('snippet', '')  # Ajouter le snippet si disponible
                }
                formatted_sources.append(source)
                logging.info(f"Source {i+1}: {source['title']} - {source['link']}")
                if source['snippet']:
                    logging.info(f"  Extrait: {source['snippet'][:150]}...")
            
            # Créer un résumé enrichi avec les extraits des sources
            enriched_content = create_enriched_content(cleaned_content, formatted_sources, current_date)
            
            logging.info(f"Perplexity a trouvé {len(formatted_sources)} sources formatées")
            
            return {
                'verification_content': enriched_content,
                'sources': formatted_sources,
                'citations': citations,
                'raw_content': raw_content  # Garder le contenu brut pour debug
            }
        else:
            logging.error(f"Erreur API Perplexity: {response.status_code} - {response.text}")
            return {
                'verification_content': '',
                'sources': [],
                'citations': [],
                'raw_content': ''
            }
            
    except Exception as e:
        logging.error(f"Erreur lors de l'utilisation de l'API Perplexity : {e}")
        return {
            'verification_content': '',
            'sources': [],
            'citations': [],
            'raw_content': ''
        }


def clean_perplexity_content(raw_content):
    """
    Nettoie le contenu Perplexity en supprimant les balises <think> et autres éléments non pertinents
    """
    try:
        # Supprimer les balises <think>...</think>
        content = re.sub(r'<think>.*?</think>', '', raw_content, flags=re.DOTALL)
        
        # Supprimer les balises HTML restantes
        content = re.sub(r'<[^>]+>', '', content)
        
        # Nettoyer les espaces multiples et les sauts de ligne
        content = re.sub(r'\s+', ' ', content).strip()
        
        return content
    except Exception as e:
        logging.error(f"Erreur lors du nettoyage du contenu: {e}")
        return raw_content


def create_enriched_content(main_content, sources, current_date):
    """
    Crée un contenu enrichi en combinant le contenu principal avec les extraits des sources
    """
    try:
        enriched = main_content
        
        if sources:
            enriched += "\n\nEXTRAITS DES SOURCES:\n"
            for i, source in enumerate(sources, 1):
                if source.get('snippet'):
                    enriched += f"\n{i}. {source['title']}: {source['snippet']}"
                    if source.get('date'):
                        enriched += f" (Date: {source['date']})"
        
        enriched += f"\n\nCONTEXTE: Vérification effectuée le {current_date}"
        
        return enriched
    except Exception as e:
        logging.error(f"Erreur lors de la création du contenu enrichi: {e}")
        return main_content 