import json
import pandas as pd
import streamlit as st
from scrapegraphai.graphs import SmartScraperGraph
from langchain_ollama import OllamaLLM
import tempfile
import os
import fitz

# -------------------- CONFIG --------------------
st.set_page_config(page_title="Extraction de KPIs PDF", layout="wide")

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
Extract the following quantitative indicators from the PDF report, preferably for the years 2018 to 2025:

- Produit Intérieur Brut (GDP at market prices)
- Revenu National (National Income)
- Revenu National Net
- Revenu National Disponible Brut (RNDB)
- Revenu National Disponible Net
- Revenus des facteurs reçus de l'extérieur nets
- Autres transferts courants extérieurs nets
- Consommation Finale
- Epargne Nationale Brute
- Epargne Nationale Nette
- Taux d’épargne global
- Taux d’épargne par agent (par secteur institutionnel)
- Sociétés non financières (Non-Financial Corporations)
- Institutions financières
- Administration Publique
- Ménages
- Amortissements
- Nombre de ménages (en milliers)
- Taille moyenne d’un ménage
- Population totale (en milliers)
- Indice des prix à la consommation familiale (IPC, 2015 = 100)
- Revenu disponible brut des ménages (MD)
- Revenu disponible brut par ménage (en Dinars courants)
- Revenu disponible brut par ménage (en Dinars constants 2015)
- GFCF par secteur institutionnel (MD) : sociétés non financières, institutions financières, administration publique, ménages (logement), total général
- Inflation annuelle
- RNDB (en MD 2015)
- RNDB / Personne

Return them as a list of JSON objects with the following format:
[{
  "company": "ExtractedName",
  "kpi": "StandardizedName",
  "value": 1234567,
  "unit": "USD|EUR|%|TND",
  "year": 2023,
  "page": 42,
  "source": "Table 3.2"
}]
"""

# -------------------- FONCTION D'EXTRACTION --------------------
@st.cache_data(show_spinner=False)
def extract_kpis_from_file(file_path):
    graph = SmartScraperGraph(
        prompt=PROMPT,
        config=graph_config,
        source=file_path
    )
    return graph.run()

# -------------------- INTERFACE --------------------
st.title("📊 Extraction de KPIs macroéconomiques depuis PDF")
st.markdown("Importez un ou plusieurs fichiers PDF à analyser. Les résultats s'afficheront ci-dessous.")

uploaded_files = st.file_uploader("📁 Déposez vos PDF", type=["pdf"], accept_multiple_files=True)

if uploaded_files:
    for file in uploaded_files:
        with st.expander(f"📄 Fichier : {file.name}", expanded=False):
            if st.button(f"🚀 Lancer l'extraction pour `{file.name}`", key=file.name):
                with st.spinner("🔍 Extraction en cours..."):
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                        tmp.write(file.read())
                        tmp_path = tmp.name

                    try:
                        result = extract_kpis_from_file(tmp_path)
                        df = pd.DataFrame(result)

                        st.success("✅ Extraction réussie")
                        st.subheader("Résultats (tableau)")
                        st.dataframe(df)

                        st.subheader("Résultats (JSON)")
                        st.json(result)

                        # Téléchargement
                        json_str = json.dumps(result, ensure_ascii=False, indent=2)
                        csv_str = df.to_csv(index=False)

                        st.download_button("⬇️ Télécharger JSON", json_str, f"{file.name}_kpis.json", "application/json")
                        st.download_button("⬇️ Télécharger CSV", csv_str, f"{file.name}_kpis.csv", "text/csv")

                    except Exception as e:
                        st.error(f"❌ Erreur lors de l'extraction : {e}")

                    finally:
                        os.remove(tmp_path)
else:
    st.info("💡 Importez un ou plusieurs fichiers PDF pour démarrer.")

st.markdown("---")
st.caption("🧠 Powered by LangChain + Ollama + ScrapeGraphAI | Actuariat & Économie 🇹🇳")
