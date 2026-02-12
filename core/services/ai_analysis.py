import logging
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from deep_translator import GoogleTranslator
from core.services.llm import llm_analysis
from core.services.perplexity_search import search_with_perplexity
import os

os.environ["TOKENIZERS_PARALLELISM"] = "false"


logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Charger le modèle pré-entraîné Roberta pour la classification de fausses nouvelles
model_name = "hamzab/roberta-fake-news-classification"
logging.info(f"Chargement du modèle {model_name}...")
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(model_name)
logging.info("Modèle et tokenizer chargés avec succès.")


def analyze_text(text):
    try:
        logging.info(f"=== DÉBUT DE L'ANALYSE ===")
        logging.info(f"Texte original à analyser: {text}")
        
        # Traduire le texte en anglais avec deep-translator
        logging.info("ÉTAPE 1: Traduction du texte en anglais...")
        translated_text = GoogleTranslator(source='fr', target='en').translate(text)
        logging.info(f"Texte traduit: {translated_text}")

        # Préparer l'entrée pour le modèle
        logging.info("ÉTAPE 2: Préparation pour le modèle RoBERTa...")
        input_str = f"<title> Title <content> {translated_text} <end>"
        logging.info(f"Input formaté pour RoBERTa: {input_str[:100]}...")
        
        input_ids = tokenizer.encode_plus(input_str, max_length=512, padding="max_length", truncation=True, return_tensors="pt")
        logging.info("Texte encodé avec succès pour le modèle.")

        # Effectuer la prédiction
        logging.info("ÉTAPE 3: Prédiction avec le modèle RoBERTa...")
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        model.to(device)
        logging.info(f"Utilisation du dispositif : {device}")

        with torch.no_grad():
            logging.info("Effectuation de la prédiction...")
            output = model(input_ids['input_ids'].to(device), attention_mask=input_ids['attention_mask'].to(device))
            logging.info("Prédiction terminée.")

        # Convertir la prédiction en probabilité
        logging.info("Analyse des résultats du modèle RoBERTa...")
        probabilities = torch.nn.functional.softmax(output.logits, dim=-1)[0]
        prediction = torch.argmax(probabilities).item()
        confidence = probabilities[prediction].item()
        
        logging.info(f"Résultat de la prédiction RoBERTa: {prediction}")
        logging.info(f"Probabilités: {probabilities.tolist()}")
        logging.info(f"Confiance: {confidence:.4f}")

        # Traduire le résultat en français
        initial_result = "vérifié" if prediction == 1 else "rejeté"
        logging.info(f"Résultat initial RoBERTa: {initial_result} (confiance: {confidence:.2%})")

        # Utiliser Perplexity pour rechercher des sources et vérifier le fait
        logging.info("ÉTAPE 4: Recherche avec Perplexity...")
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

        # Utiliser l'API OpenRouter pour analyser les résultats combinés et obtenir une décision finale
        logging.info("ÉTAPE 5: Analyse finale avec OpenRouter...")
        final_analysis = llm_analysis(
            translated_text, 
            initial_result, 
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