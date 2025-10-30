import json
import pandas as pd
import streamlit as st
from scrapegraphai.graphs import SmartScraperGraph
from langchain_ollama import OllamaLLM

# --- Configuration LLM et graphe ---
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

source_path = "rapport_AAR_CORP.pdf"  # adapte le chemin si besoin

prompt = """
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
- Company (extract from document header/footer)
- KPI Name (exact technical name from document)
- Value (numeric only, without symbols)
- Unit (currency/percentage)
- Year (extract from context or document date)
- Page Number (where found)
- Source Table/Figure (reference if available)

OUTPUT FORMAT:
[{
  "company": "ExtractedName",
  "kpi": "StandardizedName",
  "value": 1234567,
  "unit": "USD|EUR|%",
  "year": 2023,
  "page": 42,
  "source": "Table 3.2"
}]
"""

# --- Exécution du graphe pour extraction ---
@st.cache_data(show_spinner=True)
def extract_kpis():
    graph = SmartScraperGraph(
        prompt=prompt,
        config=graph_config,
        source=source_path,
    )
    result = graph.run()
    return result

st.title("Extraction KPIs macroéconomiques depuis PDF")

if st.button("Extraire les KPIs du PDF"):
    with st.spinner("Extraction en cours..."):
        data = extract_kpis()

        # Sauvegarder fichiers
        with open("result.json", "w", encoding="utf-8") as fjson:
            json.dump(data, fjson, ensure_ascii=False, indent=2)

        df = pd.DataFrame(data)
        df.to_csv("result.csv", index=False)

        st.success("Extraction terminée. Résultats sauvegardés.")

        # Affichage
        st.subheader("Données JSON")
        st.json(data)

        st.subheader("Données tabulaires")
        st.dataframe(df)

        # Téléchargements
        json_str = json.dumps(data, ensure_ascii=False, indent=2)
        csv_str = df.to_csv(index=False)

        st.download_button("Télécharger JSON", json_str, "result.json", "application/json")
        st.download_button("Télécharger CSV", csv_str, "result.csv", "text/csv")
else:
    st.info("Cliquez sur le bouton pour lancer l'extraction.")
