import os
import json
import fitz
import tempfile
import pandas as pd
import streamlit as st
from scrapegraphai.graphs import SmartScraperGraph
from langchain_ollama import OllamaLLM

# -------------------- CONFIGURATION GLOBALE --------------------
st.set_page_config(page_title="📊 Dashboard KPIs PDF", layout="wide")

llm_config = {
    "llm": OllamaLLM(
        model="mistral",
        base_url="http://localhost:11434"
    )
}

graph_config = {
    "llm": {
        "model": "mistral",
        "base_url": "http://localhost:11434"
    },
    "verbose": True
}

PROMPT = """
You are an expert in extracting structured macroeconomic KPIs from national statistics reports.
Extract the following indicators (for years 2018–2025) and return them in JSON:
- Produit Intérieur Brut (GDP)
- Revenu National
- Revenu National Net
- Revenu National Disponible Brut
- Revenu National Disponible Net
- Revenus extérieurs nets
- Transferts courants extérieurs
- Consommation Finale
- Epargne Nationale Brute et Nette
- Taux d’épargne global et par secteur
- Population, Taille des ménages
- Indice IPC
- Revenu disponible des ménages
- GFCF par secteur
- Inflation
- RNDB (2015)
- RNDB / Personne

Format:
[{
  "company": "INS Tunisie",
  "kpi": "Produit Intérieur Brut",
  "value": 1234567,
  "unit": "TND",
  "year": 2023,
  "page": 3,
  "source": "Tableau 3.2"
}]
"""

# -------------------- FONCTION D'EXTRACTION --------------------
@st.cache_data(show_spinner=False)
def extract_kpis(file_path):
    graph = SmartScraperGraph(
        prompt=PROMPT,
        config=graph_config,
        source=file_path
    )
    return graph.run()

# -------------------- INTERFACE UTILISATEUR --------------------
st.title("📄 Extraction Automatisée de KPIs Macroéconomiques")
st.markdown("Chargez **un ou plusieurs fichiers PDF** pour analyser automatiquement les indicateurs économiques.")

uploaded_files = st.file_uploader("📁 Déposez vos fichiers PDF ici :", type="pdf", accept_multiple_files=True)

if uploaded_files:
    for file in uploaded_files:
        with st.expander(f"📘 Rapport : {file.name}", expanded=False):
            if st.button(f"🚀 Extraire les KPIs de `{file.name}`", key=file.name):
                with st.spinner("🔍 Extraction des données..."):
                    try:
                        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                            tmp.write(file.read())
                            temp_path = tmp.name

                        result = extract_kpis(temp_path)
                        df = pd.DataFrame(result)

                        st.success("✅ Extraction terminée avec succès.")
                        st.dataframe(df, use_container_width=True)

                        st.download_button("⬇️ Télécharger en JSON", json.dumps(result, indent=2, ensure_ascii=False),
                                           f"{file.name}_KPIs.json", "application/json")

                        st.download_button("⬇️ Télécharger en CSV", df.to_csv(index=False),
                                           f"{file.name}_KPIs.csv", "text/csv")

                    except Exception as e:
                        st.error(f"❌ Une erreur est survenue : {e}")

                    finally:
                        if os.path.exists(temp_path):
                            os.remove(temp_path)
else:
    st.info("💡 Veuillez importer vos fichiers PDF pour démarrer l’analyse.")

st.markdown("---")
st.caption("🧠 Propulsé par LangChain + Ollama + ScrapeGraphAI — Tunisie 🇹🇳 | Pour les économistes, data scientists & actuaires.")
