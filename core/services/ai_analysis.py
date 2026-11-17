import logging

from django.conf import settings

from core.services import llama_verdict
from core.services.llm import llm_analysis
from core.services.perplexity_search import search_with_perplexity


logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


def analyze_text(text):
    try:
        logging.info(f"=== DÉBUT DE L'ANALYSE ===")
        logging.info(f"Texte original à analyser: {text}")

        if getattr(settings, "VERDICT_ENGINE", "gpt") == "llama":
            # Le modèle dort quand il est inactif : on le réveille pendant la recherche.
            llama_verdict.warm_up_async()

        # Utiliser Perplexity pour rechercher des sources et vérifier le fait
        logging.info("ÉTAPE 1: Recherche avec Perplexity...")
        perplexity_result = search_with_perplexity(text)
        logging.info(f"Résultat Perplexity - Sources: {len(perplexity_result['sources'])}, Citations: {len(perplexity_result.get('citations', []))}")

        if perplexity_result['verification_content']:
            logging.info(f"Contenu de vérification Perplexity (extrait): {perplexity_result['verification_content'][:300]}...")

        # Log des sources avec leurs extraits
        for i, source in enumerate(perplexity_result['sources'][:3], 1):
            logging.info(f"Source {i} détaillée:")
            logging.info(f"  Titre: {source.get('title', 'N/A')}")
            logging.info(f"  URL: {source.get('link', 'N/A')}")
            logging.info(f"  Date: {source.get('date', 'N/A')}")
            if source.get('snippet'):
                logging.info(f"  Extrait: {source['snippet'][:150]}...")

        # Verdict final : modèle Check-IA ou GPT-4o-mini selon VERDICT_ENGINE
        logging.info("ÉTAPE 2: Verdict final...")
        final_analysis = llm_analysis(
            text,
            perplexity_result['sources'],
            perplexity_result['verification_content']
        )

        logging.info(f"=== RÉSULTAT FINAL ===")
        if isinstance(final_analysis, dict):
            logging.info(f"Statut final: {final_analysis.get('statut', 'INDÉTERMINÉE')}")
            explanation = final_analysis.get('explication', 'Pas d\'explication')
            logging.info(f"Explication: {explanation[:100]}...")
            logging.info(f"Sources principales: {final_analysis.get('sources_principales', [])}")
        else:
            logging.info(f"Décision finale (format legacy): {final_analysis}")

        # Retourner les résultats dans le bon format
        return final_analysis, perplexity_result['sources']

    except Exception as e:
        logging.error(f"ERREUR lors de l'analyse du texte : {e}")
        logging.error(f"Type d'erreur: {type(e).__name__}")
        import traceback
        logging.error(f"Traceback: {traceback.format_exc()}")
        error_msg = f"Une erreur s'est produite lors de l'analyse: {str(e)}"
        return {
            "statut": "ERREUR",
            "explication": error_msg,
            "sources_principales": []
        }, []
