import spacy
from collections import Counter

# Charger le modèle de langue français
nlp = spacy.load("fr_core_news_sm")

def extract_keywords(text, num_keywords=2):
    # Analyser le texte
    doc = nlp(text)

    # Récupérer uniquement les noms, verbes, et adjectifs, en excluant les mots courants
    words = [token.text.lower() for token in doc if token.pos_ in ["NOUN", "VERB", "ADJ"] and not token.is_stop]

    # Compter les occurrences des mots
    word_freq = Counter(words)

    # Obtenir les mots les plus fréquents
    most_common_words = [word for word, _ in word_freq.most_common(num_keywords)]
    
    # Extraire les entités nommées
    named_entities = [ent.text for ent in doc.ents]
    
    # Retourner une liste plate combinant les mots les plus fréquents et les entités nommées
    keywords = [kw.split()[0].title() for kw in set(most_common_words + named_entities) if len(kw) > 2 and len(kw) < 10]

    return keywords
