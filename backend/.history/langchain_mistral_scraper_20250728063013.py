import logging
from scrapegraphai.graphs import SmartScraperGraph
from scrapegraphai.models import GraphPrompt
from langchain_ollama import OllamaLLM

# 📌 Configuration du logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# 🌐 URL de la page à scraper
url = "https://www.ins.tn/en/statistiques"

# 🤖 Initialisation du LLM Mistral via Ollama local
llm = OllamaLLM(model="mistral")

# 🧠 Prompt personnalisé pour l'extraction des indicateurs économiques
custom_prompt = GraphPrompt(
    prompt="""Tu es un expert en extraction de données économiques.

À partir de la page web ci-dessous, extrais les indicateurs suivants pour la Tunisie pour les années de 2018 à 2025 :
- Produit Intérieur Brut (GDP)
- Revenu National (National Income)
- Population
- Inflation

Présente les résultats dans un tableau markdown clair avec les colonnes :
Année | GDP | Revenu National | Population | Inflation

PAGE WEB : {content}
""",
    prompt_name="economic_data_extraction"
)

# 🧰 Création du graphe intelligent de scraping
graph_config = {
    "llm": llm,
    "prompt": custom_prompt,
    "enable_cache": False  # pour éviter des résultats anciens
}

graph = SmartScraperGraph(
    prompt=custom_prompt,
    llm=llm,
    use_playwright=True,
)

# 🚀 Lancement du scraping + extraction
logger.info(f"🔍 Extraction des données depuis {url}...")
results = graph.run(url)

# 💾 Sauvegarde du résultat
output_file = "tunisia_economic_data_scrapegraph.md"
with open(output_file, "w", encoding="utf-8") as f:
    f.write(results)

logger.info(f"✅ Extraction terminée. Résultat enregistré dans : {output_file}")
