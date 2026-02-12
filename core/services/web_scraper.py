import logging
import requests
from bs4 import BeautifulSoup
from urllib.parse import quote

# Fonction pour scraper des sources sur le web
def scrape_web_sources(query):
    try:
        logging.info("Scraping des sources web pour vérifier le fait...")
        query_encoded = quote(query)
        url = f"https://www.google.com/search?q={query_encoded}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        response = requests.get(url, headers=headers)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')
        search_results = soup.select('.tF2Cxc')

        sources = []
        for result in search_results[:5]:  # Limiter à 5 résultats pour éviter la surcharge
            title = result.select_one('h3').text if result.select_one('h3') else 'Titre indisponible'
            link = result.select_one('a')['href'] if result.select_one('a') else 'Lien indisponible'
            sources.append({"title": title, "link": link})

        logging.info(f"{len(sources)} sources trouvées.")
        return sources
    except Exception as e:
        logging.error(f"Erreur lors du scraping des sources web : {e}")
        return []