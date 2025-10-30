# app_streamlit.py
import os
import re
import pandas as pd
import pdfplumber
import spacy
from sentence_transformers import SentenceTransformer, util
import fitz  # PyMuPDF
import numpy as np
from collections import defaultdict
from datetime import datetime

# --- Begin original code (untouched logic) ---
# Charger les modèles NLP
print("Chargement des modèles NLP...")
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("Téléchargement du modèle spaCy...")
    os.system("python -m spacy download en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

kpi_model = SentenceTransformer('all-MiniLM-L6-v2')

# Fichier de sortie unique pour tous les résultats
OUTPUT_CSV = "all_extracted_kpis.csv"
OUTPUT_EXCEL = "all_extracted_kpis.xlsx"

# Charger les résultats existants
def load_existing_results():
    if os.path.exists(OUTPUT_CSV):
        try:
            existing_df = pd.read_csv(OUTPUT_CSV)
            print(f"Chargement de {len(existing_df)} KPIs existants depuis {OUTPUT_CSV}")
            return existing_df
        except Exception as e:
            print(f"Erreur lors du chargement des résultats existants: {e}")
            return pd.DataFrame()
    return pd.DataFrame()

# Sauvegarder les résultats (ajout aux existants)
def save_results(all_results):
    if not all_results.empty:
        try:
            # Sauvegarder en CSV
            all_results.to_csv(OUTPUT_CSV, index=False, encoding='utf-8-sig')
            print(f"Tous les résultats sauvegardés dans {OUTPUT_CSV} ({len(all_results)} KPIs)")
            
            # Sauvegarder en Excel
            all_results.to_excel(OUTPUT_EXCEL, index=False)
            print(f"Tous les résultats sauvegardés dans {OUTPUT_EXCEL}")
            
        except Exception as e:
            print(f"Erreur lors de la sauvegarde: {e}")

# Charger la liste des KPIs depuis un fichier Excel ou CSV
def load_kpi_list(file_path):
    # Déterminer l'extension du fichier
    file_extension = os.path.splitext(file_path)[1].lower()
    
    if file_extension == '.csv':
        # Lire le CSV avec différents encodages possibles
        encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'windows-1252']
        for encoding in encodings:
            try:
                df = pd.read_csv(file_path, sep=';', encoding=encoding)
                print(f"Fichier CSV lu avec l'encodage {encoding}")
                break
            except UnicodeDecodeError:
                continue
        else:
            raise ValueError("Impossible de décoder le fichier CSV avec les encodages courants")
    
    elif file_extension in ['.xlsx', '.xls']:
        # Lire le fichier Excel
        df = pd.read_excel(file_path)
        print("Fichier Excel lu avec succès")
    
    else:
        raise ValueError("Format de fichier non supporté. Utilisez .csv ou .xlsx")
    
    # Afficher les colonnes disponibles pour le débogage
    print(f"Colonnes disponibles: {list(df.columns)}")
    
    # Trouver les noms de colonnes appropriés (avec flexibilité)
    kpi_name_col = None
    kpi_name_fr_col = None
    
    for col in df.columns:
        col_lower = col.lower()
        if 'kpi_name' in col_lower and 'fr' not in col_lower:
            kpi_name_col = col
        elif 'kpi_name' in col_lower and 'fr' in col_lower:
            kpi_name_fr_col = col
    
    # Utiliser les premières colonnes si les noms spécifiques ne sont pas trouvés
    if kpi_name_col is None and len(df.columns) > 0:
        kpi_name_col = df.columns[0]
    if kpi_name_fr_col is None and len(df.columns) > 1:
        kpi_name_fr_col = df.columns[1]
    
    # Extraire les listes de KPIs
    kpi_list = df[kpi_name_col].dropna().tolist() if kpi_name_col else []
    kpi_list_fr = df[kpi_name_fr_col].dropna().tolist() if kpi_name_fr_col else []
    
    print(f"{len(kpi_list)} KPIs anglais chargés")
    print(f"{len(kpi_list_fr)} KPIs français chargés")
    
    # Créer des embeddings pour tous les KPIs
    all_kpis = kpi_list + kpi_list_fr
    kpi_embeddings = kpi_model.encode(all_kpis, convert_to_tensor=True)
    
    return df, kpi_list, kpi_list_fr, kpi_embeddings, all_kpis

# Extraire le texte d'un PDF avec mise en page préservée
def extract_text_from_pdf(pdf_path):
    text_content = ""
    
    # Méthode 1: Utilisation de pdfplumber pour l'extraction de tableaux
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for i, page in enumerate(pdf.pages):
                # Extraire le texte
                text = page.extract_text()
                if text:
                    text_content += text + "\n"
                
                # Extraire les tableaux
                tables = page.extract_tables()
                for table in tables:
                    for row in table:
                        text_content += " | ".join(str(cell) for cell in row if cell is not None) + "\n"
                    text_content += "\n"
    except Exception as e:
        print(f"Erreur avec pdfplumber: {e}")
    
    # Méthode 2: Utilisation de PyMuPDF comme solution de secours
    if len(text_content.strip()) < 100:  # Si peu de texte extrait
        try:
            doc = fitz.open(pdf_path)
            for i, page in enumerate(doc):
                text_content += page.get_text("text") + "\n"
        except Exception as e:
            print(f"Erreur avec PyMuPDF: {e}")
    
    return text_content

# Nettoyer et normaliser le texte
def clean_text(text):
    # Supprimer les en-têtes et pieds de page courants
    lines = text.split('\n')
    cleaned_lines = []
    
    for line in lines:
        # Supprimer les numéros de page et autres artefacts
        if re.match(r'^\s*\d+\s*$', line):  # Ligne avec juste un nombre
            continue
        if re.match(r'^.*www\.\w+\.com.*$', line):  # URLs seules
            continue
        if len(line.strip()) < 5:  # Lignes très courtes
            continue
            
        cleaned_lines.append(line)
    
    return '\n'.join(cleaned_lines)

# Trouver les KPIs pertinents dans le texte
def find_relevant_kpis(text, kpi_embeddings, all_kpis, threshold=0.55):
    # Nettoyer le texte
    cleaned_text = clean_text(text)
    
    # Diviser le texte en chunks pour l'analyse
    sentences = [sent.text for sent in nlp(cleaned_text).sents if len(sent.text) > 30]
    
    relevant_kpis = defaultdict(list)
    
    for i, sentence in enumerate(sentences):
        if i % 100 == 0:  # Afficher une progression toutes les 100 phrases
            print(f"  Traitement de la phrase {i}/{len(sentences)}...")
            
        # Encoder la phrase
        sentence_embedding = kpi_model.encode(sentence, convert_to_tensor=True)
        
        # Calculer la similarité cosine avec tous les KPIs
        cos_scores = util.pytorch_cos_sim(sentence_embedding, kpi_embeddings)[0]
        
        # Trouver les KPIs les plus similaires
        top_results = np.argsort(-cos_scores.cpu().numpy())[:3]
        
        for idx in top_results:
            if cos_scores[idx] > threshold:
                kpi_name = all_kpis[idx]
                relevant_kpis[kpi_name].append({
                    'sentence': sentence,
                    'score': float(cos_scores[idx])
                })
    
    return relevant_kpis

# Vérifier la cohérence entre le KPI et la valeur
def is_value_coherent(kpi_name, value, unit):
    """Vérifie si la valeur et l'unité sont cohérentes avec le type de KPI"""
    
    kpi_lower = kpi_name.lower()
    
    # KPIs qui devraient avoir des valeurs numériques élevées (pas des pourcentages)
    high_value_kpis = ['emission', 'ghg', 'co2', 'nox', 'sox', 'energy', 'water', 'waste', 'consumption']
    
    # KPIs qui devraient être des pourcentages
    percentage_kpis = ['rate', 'ratio', 'percentage', 'coverage', 'compliance', 'approval']
    
    # Vérifier les incohérences
    if any(term in kpi_lower for term in high_value_kpis) and unit == '%' and value < 10:
        return False
        
    if any(term in kpi_lower for term in percentage_kpis) and unit != '%' and value > 100:
        return False
        
    return True

# Extraire les valeurs numériques associées aux KPIs
def extract_kpi_values(text, kpi_name):
    patterns = [
        r"(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:tons?|tonnes|t|%|kg|kWh|CO2|CO₂|ppm|ppb|µg/m³|mg/m³|employees|people|€|EUR|USD|\$)",
        r"(\d{1,3}(?:,\d{3})*(?:\.\d+)?\%)(?:\s|$)",
        r"(?:is|was|are|were|:|\=)\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)",
        r"(?:value of|rate of|amount of|total|reduction of)\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)"
    ]
    
    values = []
    
    # Recherche de valeurs basée sur des motifs
    for pattern in patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            value_str = match.group(1).replace(',', '')
            try:
                numeric_value = float(value_str) if '.' in value_str else int(value_str)
                
                # Déterminer l'unité basée sur le contexte
                unit = determine_unit(text, kpi_name)
                
                # Vérifier la cohérence
                if is_value_coherent(kpi_name, numeric_value, unit):
                    values.append({
                        'value': numeric_value,
                        'unit': unit
                    })
            except ValueError:
                continue
    
    return values

# Déterminer l'unité basée sur le contexte
def determine_unit(text, kpi_name):
    unit_patterns = {
        'tons?|tonnes|tCO2e|t CO2e': 'tons',
        'kg|kilograms': 'kg',
        '%|percent|percentage': '%',
        'kWh|kilowatt-hours': 'kWh',
        'CO2|CO₂|carbon dioxide': 'tCO2e',
        'ppm|parts per million': 'ppm',
        'employees|workers|people': 'people',
        '€|EUR|USD|\$|dollars': 'currency'
    }
    
    for pattern, u in unit_patterns.items():
        if re.search(pattern, text, re.IGNORECASE):
            return u
    
    # Déduction basée sur le nom du KPI
    kpi_lower = kpi_name.lower()
    if any(term in kpi_lower for term in ['rate', 'ratio', 'percentage', 'coverage']):
        return '%'
    elif any(term in kpi_lower for term in ['emission', 'ghg', 'co2', 'carbon']):
        return 'tCO2e'
    
    return 'unknown'

# Filtrer les résultats dupliqués ou de faible qualité
def filter_results(results, min_confidence=0.5):
    filtered = []
    seen = set()
    
    for result in results:
        # Créer un identifiant unique pour détecter les doublons
        identifier = f"{result['kpi_name']}_{result['value']}_{result['unit']}_{result['source_file']}"
        
        if (identifier not in seen and 
            result['confidence'] >= min_confidence):
            filtered.append(result)
            seen.add(identifier)
    
    return filtered

# Traiter un PDF et extraire les KPIs
def process_pdf(pdf_path, kpi_embeddings, all_kpis, kpi_df):
    print(f"Traitement de {os.path.basename(pdf_path)}...")
    
    # Extraire le texte
    text = extract_text_from_pdf(pdf_path)
    
    if not text or len(text.strip()) < 100:
        print(f"  Avertissement: Peu de texte extrait de {pdf_path}")
        return []
    
    # Trouver les KPIs pertinents
    relevant_kpis = find_relevant_kpis(text, kpi_embeddings, all_kpis)
    
    results = []
    
    # Pour chaque KPI pertinent, extraire les valeurs
    for kpi_name, matches in relevant_kpis.items():
        for match in matches:
            sentence = match['sentence']
            values = extract_kpi_values(sentence, kpi_name)
            
            for val in values:
                # Trouver le KPI original dans le DataFrame
                kpi_info = kpi_df[(kpi_df.iloc[:, 0] == kpi_name) | (kpi_df.iloc[:, 1] == kpi_name)]
                
                if not kpi_info.empty:
                    topic = kpi_info.iloc[0, 2] if len(kpi_info.columns) > 2 else 'Unknown'
                    topic_fr = kpi_info.iloc[0, 3] if len(kpi_info.columns) > 3 else 'Inconnu'
                    score = kpi_info.iloc[0, 4] if len(kpi_info.columns) > 4 else 'Unknown'
                else:
                    topic = "Unknown"
                    topic_fr = "Inconnu"
                    score = "Unknown"
                
                results.append({
                    'kpi_name': kpi_name,
                    'value': val['value'],
                    'unit': val['unit'],
                    'source_file': os.path.basename(pdf_path),
                    'topic': topic,
                    'topic_fr': topic_fr,
                    'score': score,
                    'confidence': match['score'],
                    'extraction_date': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                })
    
    # Filtrer les résultats
    filtered_results = filter_results(results)
    print(f"  {len(filtered_results)} KPIs valides après filtrage")
    
    return filtered_results

# Fonction principale pour tester sur un seul PDF
def test_single_pdf():
    # Charger les résultats existants
    existing_results = load_existing_results()
    
    # Chemin du fichier de KPIs
    kpi_file_path = "esg kpis A+ critical(Sheet1).xlsx"  # Remplacez par votre chemin si différent
    
    # Vérifier si le fichier existe
    if not os.path.exists(kpi_file_path):
        print(f"Le fichier {kpi_file_path} n'existe pas.")
        kpi_file_path = input("Entrez le chemin vers votre fichier de KPIs: ").strip().strip('"')
    
    # Chemin du PDF
    pdf_path = input("Entrez le chemin vers le fichier PDF à analyser: ").strip().strip('"')
    
    # Vérifier si le fichier existe
    if not os.path.exists(pdf_path):
        print(f"Le fichier {pdf_path} n'existe pas.")
        return
    
    # Charger la liste des KPIs
    print("Chargement de la liste des KPIs...")
    kpi_df, kpi_list, kpi_list_fr, kpi_embeddings, all_kpis = load_kpi_list(kpi_file_path)
    print(f"{len(all_kpis)} KPIs chargés")
    
    # Vérifier si le PDF a déjà été traité
    pdf_name = os.path.basename(pdf_path)
    if not existing_results.empty and pdf_name in existing_results['source_file'].values:
        print(f"⚠️  Attention: {pdf_name} a déjà été traité précédemment")
        response = input("Voulez-vous quand même le retraiter? (o/n): ").strip().lower()
        if response != 'o':
            print("Traitement annulé.")
            return
    
    # Traiter le PDF
    new_results = process_pdf(pdf_path, kpi_embeddings, all_kpis, kpi_df)
    
    # Afficher les résultats
    if new_results:
        print(f"\n{len(new_results)} nouveaux KPIs extraits:")
        print("-" * 80)
        
        for i, result in enumerate(new_results, 1):
            print(f"{i}. {result['kpi_name']}")
            print(f"   Valeur: {result['value']} {result['unit']}")
            print(f"   Confiance: {result['confidence']:.2f}")
            print(f"   Fichier: {result['source_file']}")
            print(f"   Topic: {result['topic']}")
            print()
        
        # Combiner avec les résultats existants
        if existing_results.empty:
            all_results = pd.DataFrame(new_results)
        else:
            # Convertir les nouveaux résultats en DataFrame
            new_df = pd.DataFrame(new_results)
            # Concaténer avec les résultats existants
            all_results = pd.concat([existing_results, new_df], ignore_index=True)
            # Supprimer les doublons potentiels
            all_results = all_results.drop_duplicates(subset=['kpi_name', 'value', 'unit', 'source_file'], keep='last')
        
        # Sauvegarder tous les résultats
        save_results(all_results)
        
        print(f"Total: {len(all_results)} KPIs dans la base de données")
    else:
        print("Aucun nouveau KPI n'a été extrait.")

# Fonction pour afficher les statistiques

def show_statistics():
    if os.path.exists(OUTPUT_CSV):
        df = pd.read_csv(OUTPUT_CSV, on_bad_lines='skip', engine='python')
        print(f"\n📊 Statistiques de la base de données:")
        print(f"   Total KPIs: {len(df)}")
        print(f"   Fichiers traités: {df['source_file'].nunique()}")
        print(f"   Topics uniques: {df['topic'].nunique()}")
        print(f"   Dernière extraction: {df['extraction_date'].max()}")
        
        # Afficher les fichiers traités
        print(f"\n📁 Fichiers traités:")
        for file in df['source_file'].unique():
            count = len(df[df['source_file'] == file])
            print(f"   - {file}: {count} KPIs")
    else:
        print("Aucune donnée disponible. Veuillez d'abord traiter des PDFs.")

# Menu principal
def main():
    while True:
        print("\n" + "="*50)
        print("          SYSTÈME D'EXTRACTION DE KPIs ESG")
        print("="*50)
        print("1. Traiter un nouveau PDF")
        print("2. Afficher les statistiques")
        print("3. Quitter")
        
        choice = input("\nChoisissez une option (1-3): ").strip()
        
        if choice == '1':
            test_single_pdf()
        elif choice == '2':
            show_statistics()
        elif choice == '3':
            print("Au revoir!")
            break
        else:
            print("Option invalide. Veuillez choisir 1, 2 ou 3.")
# --- End original code (untouched logic) ---

# -----------------------
# Streamlit UI wrapper + Visualisations avancées
# -----------------------
import streamlit as st
import tempfile
import io
import plotly.express as px
import plotly.graph_objects as go

st.set_page_config(page_title="ESG KPI Extractor", layout="wide", initial_sidebar_state="expanded")

st.title("🔎 ESG KPI Extractor — Streamlit UI & Dashboard")
st.markdown(
    "Interface visuelle pour votre script d'extraction de KPIs ESG. "
    "Les fonctions d'extraction n'ont pas été modifiées — j'ai ajouté des onglets analytiques avancés."
)

# Sidebar inputs & actions (extraction part)
with st.sidebar:
    st.header("📂 Inputs")
    kpi_file_uploader = st.file_uploader("Upload KPI file (.xlsx / .csv)", type=['xlsx', 'xls', 'csv'])
    pdf_file_uploader = st.file_uploader("Upload PDF to analyze", type=['pdf'])
    min_confidence = st.slider("Min confidence filter (appliqué au merged dataset)", 0.0, 1.0, 0.5, 0.01)
    rerun_if_exists = st.checkbox("Re-process even if PDF was already processed", value=False)
    st.markdown("---")
    st.write("Actions")
    process_button = st.button("▶️ Process PDF")
    show_stats_button = st.button("📊 Show saved statistics")
    st.markdown("---")
    st.write("Quick actions")
    if st.button("🔄 Reload dataset"):
        st.experimental_rerun()

def save_uploaded_to_temp(uploaded_file):
    if uploaded_file is None:
        return None
    suffix = os.path.splitext(uploaded_file.name)[1]
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    tmp.write(uploaded_file.read())
    tmp.flush()
    tmp.close()
    return tmp.name

def display_and_offer_download(df, csv_name="extracted_kpis.csv", excel_name="extracted_kpis.xlsx"):
    st.dataframe(df)
    csv_bytes = df.to_csv(index=False, encoding='utf-8-sig').encode('utf-8-sig')
    st.download_button("Download CSV", data=csv_bytes, file_name=csv_name, mime="text/csv")
    try:
        towrite = io.BytesIO()
        df.to_excel(towrite, index=False)
        towrite.seek(0)
        st.download_button("Download Excel", data=towrite, file_name=excel_name, mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    except Exception as e:
        st.warning(f"Excel export failed: {e}")

# Processing logic (unchanged) - triggered from UI
if process_button:
    if kpi_file_uploader is None:
        st.error("Please upload a KPI file (.xlsx or .csv) first.")
    elif pdf_file_uploader is None:
        st.error("Please upload a PDF file to analyze.")
    else:
        # Save uploaded files to temporary paths
        st.info("Saving uploaded files...")
        kpi_temp_path = save_uploaded_to_temp(kpi_file_uploader)
        pdf_temp_path = save_uploaded_to_temp(pdf_file_uploader)

        # Load existing results
        with st.spinner("Loading existing results..."):
            existing_results = load_existing_results()

        # Load KPI list (this will compute embeddings with your model)
        with st.spinner("Loading KPI list and computing embeddings (this may take a bit)..."):
            try:
                kpi_df, kpi_list, kpi_list_fr, kpi_embeddings, all_kpis = load_kpi_list(kpi_temp_path)
                st.success(f"Loaded {len(all_kpis)} KPIs.")
            except Exception as e:
                st.error(f"Failed to load KPI file: {e}")
                raise

        pdf_name = os.path.basename(pdf_temp_path)
        if (not existing_results.empty) and (pdf_name in existing_results['source_file'].values) and (not rerun_if_exists):
            st.warning(f"⚠️ {pdf_name} was already processed. Enable 'Re-process' in the sidebar to force reprocessing.")
        else:
            # Process PDF and show progress
            st.info(f"Processing {pdf_name} ...")
            progress_bar = st.progress(0)
            try:
                with st.spinner("Extracting KPIs (this can take a while for long PDFs)..."):
                    new_results = process_pdf(pdf_temp_path, kpi_embeddings, all_kpis, kpi_df)
                progress_bar.progress(100)
                if new_results:
                    st.success(f"{len(new_results)} new KPIs extracted from {pdf_name}")
                    new_df = pd.DataFrame(new_results)

                    # Merge with existing results
                    if existing_results.empty:
                        all_results = new_df
                    else:
                        all_results = pd.concat([existing_results, new_df], ignore_index=True)
                        all_results = all_results.drop_duplicates(subset=['kpi_name', 'value', 'unit', 'source_file'], keep='last')

                    # Optional: filter by min_confidence
                    if 'confidence' in all_results.columns:
                        all_results = all_results[all_results['confidence'] >= float(min_confidence)]

                    # Save results
                    save_results(all_results)

                    st.markdown("### ✅ Merged results")
                    display_and_offer_download(all_results, csv_name=OUTPUT_CSV, excel_name=OUTPUT_EXCEL)
                else:
                    st.info("No new KPIs were extracted from the uploaded PDF.")
            except Exception as e:
                st.error(f"Processing failed: {e}")

# Load dataset for dashboard & analysis
if os.path.exists(OUTPUT_CSV):
    df = pd.read_csv(OUTPUT_CSV)
    # Normalize/clean types
    df['value'] = pd.to_numeric(df['value'], errors='coerce')
    # Ensure topic_fr exists
    if 'topic_fr' not in df.columns and 'topic' in df.columns:
        df['topic_fr'] = df['topic']
else:
    df = pd.DataFrame(columns=['kpi_name','value','unit','source_file','topic','topic_fr','score','confidence','extraction_date'])

# Apply global confidence filter
if 'confidence' in df.columns:
    df_display = df[df['confidence'] >= float(min_confidence)].copy()
else:
    df_display = df.copy()

# --- Begin Analytics UI: 3 new tabs ---
tabs = st.tabs(["📊 Dashboard", "⚖️ Comparaisons", "🕵️ Analyse Entreprise"])

####################
# Tab 1 - Dashboard
####################
with tabs[0]:
    st.header("📊 Dashboard global")
    if df_display.empty:
        st.info("Aucun KPI disponible. Traitez des PDFs pour voir les visualisations.")
    else:
        # High level metrics
        col1, col2, col3, col4 = st.columns(4)
        col1.metric("Total KPIs", len(df_display))
        col2.metric("Entreprises", df_display['source_file'].nunique())
        col3.metric("Topics uniques", df_display['topic_fr'].nunique() if 'topic_fr' in df_display.columns else df_display['topic'].nunique())
        try:
            last = df_display['extraction_date'].max()
        except Exception:
            last = "Unknown"
        col4.metric("Dernière extraction", last)

        st.markdown("### ✅ Benchmark rapide — Moyennes par entreprise")
        bench = df_display.groupby('source_file')['value'].agg(['mean','median','min','max','std','count']).reset_index()
        bench = bench.sort_values('mean', ascending=False)
        st.dataframe(bench.style.format({"mean":"{:.2f}","median":"{:.2f}","min":"{:.2f}","max":"{:.2f}","std":"{:.2f}"}))

        # Bar chart: mean value by company
        fig_bar = px.bar(bench, x='source_file', y='mean', error_y='std',
                         labels={'source_file':'Entreprise','mean':'Moyenne KPI'},
                         title="Moyenne des KPIs par entreprise (avec écart-type)")
        st.plotly_chart(fig_bar, use_container_width=True)

        # Heatmap: companies vs topics (mean)
        st.markdown("### 🔥 Heatmap (moyenne KPI par entreprise x topic_fr)")
        if 'topic_fr' in df_display.columns:
            pivot = df_display.groupby(['source_file','topic_fr'])['value'].mean().reset_index()
            heat = pivot.pivot(index='source_file', columns='topic_fr', values='value').fillna(0)
            # limit size for readability
            if heat.shape[0] <= 40 and heat.shape[1] <= 40:
                fig_heat = px.imshow(heat, labels=dict(x="Topic", y="Entreprise", color="Moyenne KPI"),
                                     aspect="auto", title="Heatmap: moyenne KPI")
                st.plotly_chart(fig_heat, use_container_width=True)
            else:
                st.write("Trop de lignes/colonnes pour afficher la heatmap (trop d'entreprises ou trop de topics). Affichez un sous-ensemble via l'onglet Comparaisons.")
        else:
            st.info("La colonne 'topic_fr' est manquante — impossible de faire la heatmap.")

        # Distribution of confidence
        if 'confidence' in df_display.columns:
            st.markdown("### 🔎 Distribution des scores de confiance")
            fig_conf = px.histogram(df_display, x='confidence', nbins=20, title='Distribution de confidence des extractions')
            st.plotly_chart(fig_conf, use_container_width=True)

####################
# Tab 2 - Comparaisons
####################
with tabs[1]:
    st.header("⚖️ Comparaisons multi-entreprises")
    if df_display.empty:
        st.info("Aucun KPI disponible. Traitez des PDFs pour voir les visualisations.")
    else:
        # Multi-select companies
        companies = sorted(df_display['source_file'].unique())
        sel_companies = st.multiselect("Sélectionner 1 à 6 entreprises à comparer (pour radar & comparaisons)", companies, companies[:3])
        # Select topic or KPI name
        compare_by = st.radio("Comparer par", ('topic_fr','kpi_name'))
        if compare_by == 'topic_fr' and 'topic_fr' not in df_display.columns:
            st.warning("'topic_fr' absent — bascule automatique sur 'kpi_name'")
            compare_by = 'kpi_name'
        items = sorted(df_display[compare_by].dropna().unique())
        sel_items = st.multiselect(f"Sélectionner {compare_by}(s) à inclure", items, items[:6])

        # If companies selected, create radar and comparison charts
        if sel_companies and sel_items:
            # Prepare data: mean value per company x item
            comp_df = df_display[df_display['source_file'].isin(sel_companies) & df_display[compare_by].isin(sel_items)]
            agg = comp_df.groupby(['source_file', compare_by])['value'].mean().reset_index()
            pivot = agg.pivot(index='source_file', columns=compare_by, values='value').fillna(0)

            # Radar chart: one trace per company
            st.markdown("### 🌍 Radar Chart — profil comparatif")
            categories = list(pivot.columns)
            fig_radar = go.Figure()
            for idx, row in pivot.iterrows():
                r = row.values.tolist()
                # close the loop
                fig_radar.add_trace(go.Scatterpolar(r=list(r)+[r[0]], theta=categories+[categories[0]], fill='toself', name=idx))
            fig_radar.update_layout(polar=dict(radialaxis=dict(visible=True)), showlegend=True, title="Profil comparatif (Radar)")
            st.plotly_chart(fig_radar, use_container_width=True)

            # Side-by-side bar chart for a selected item
            st.markdown("### 📊 Comparaison par item (barres)")
            chosen_item = st.selectbox("Choisir un item pour barre comparative", categories)
            if chosen_item:
                bar_df = agg[agg[compare_by] == chosen_item].sort_values('value', ascending=False)
                fig_item = px.bar(bar_df, x='source_file', y='value', labels={'value':'Moyenne','source_file':'Entreprise'}, title=f"Comparaison: {chosen_item}")
                st.plotly_chart(fig_item, use_container_width=True)

            # Similarity heatmap between companies based on pivot vector (cosine)
            st.markdown("### 🔁 Similarité entre entreprises (cosine)")
            from sklearn.metrics.pairwise import cosine_similarity
            if pivot.shape[0] >= 2:
                sim = cosine_similarity(pivot.values)
                fig_sim = px.imshow(sim, x=pivot.index, y=pivot.index, labels=dict(color='cosine sim'), title='Matrice de similarité')
                st.plotly_chart(fig_sim, use_container_width=True)
            else:
                st.info("Sélectionnez au moins 2 entreprises pour la matrice de similarité.")
        else:
            st.info("Sélectionnez au moins une entreprise et un item (topic_fr ou kpi_name) pour comparer.")

        # Benchmark table across companies for selected items
        st.markdown("### 📋 Tableau de benchmarking détaillé")
        if sel_items:
            bench_detail = df_display[df_display[compare_by].isin(sel_items)].groupby(['source_file', compare_by])['value'].agg(['mean','min','max','count']).reset_index()
            st.dataframe(bench_detail.style.format({"mean":"{:.2f}","min":"{:.2f}","max":"{:.2f}"}))
        else:
            st.write("Sélectionnez des items (topic_fr ou kpi_name) pour afficher le benchmarking.")

####################
# Tab 3 - Analyse Entreprise
####################
with tabs[2]:
    st.header("🕵️ Analyse détaillée par entreprise")
    if df_display.empty:
        st.info("Aucun KPI disponible. Traitez des PDFs pour voir les visualisations.")
    else:
        companies_all = sorted(df_display['source_file'].unique())
        company = st.selectbox("Choisir une entreprise", companies_all)
        if company:
            comp_df = df_display[df_display['source_file'] == company].copy()
            st.subheader(f"Fiche: {company}")

            # Quick KPIs summary
            c1, c2, c3 = st.columns(3)
            c1.metric("Nombre KPIs extraits", len(comp_df))
            # completeness: proportion of topics covered vs total unique topics in dataset
            try:
                coverage = comp_df['topic_fr'].nunique() / max(1, df_display['topic_fr'].nunique())
                c2.metric("Couverture topics", f"{coverage:.2%}")
            except Exception:
                c2.metric("Couverture topics", "N/A")
            if 'confidence' in comp_df.columns:
                c3.metric("Avg confidence", f"{comp_df['confidence'].mean():.2f}")

            # Top 10 KPIs by confidence
            st.markdown("### 🔝 Top KPIs (par confiance)")
            top10 = comp_df.sort_values('confidence', ascending=False).head(10)[['kpi_name','value','unit','confidence','topic_fr']]
            st.table(top10.style.format({"value":"{:.2f}","confidence":"{:.2f}"}))

            # Time evolution if multiple extraction dates exist
            st.markdown("### ⏳ Évolution temporelle (si disponible)")
            try:
                comp_df['extraction_date_parsed'] = pd.to_datetime(comp_df['extraction_date'], errors='coerce')
                time_counts = comp_df.groupby(comp_df['extraction_date_parsed'].dt.date)['kpi_name'].count().reset_index()
                time_counts.columns = ['date','count']
                if len(time_counts) > 1:
                    fig_time = px.line(time_counts, x='date', y='count', title="Nombre de KPIs extraits au fil du temps")
                    st.plotly_chart(fig_time, use_container_width=True)
                else:
                    st.info("Pas assez de dates différentes pour afficher une évolution temporelle.")
            except Exception:
                st.info("Champ 'extraction_date' indisponible ou mal formaté.")

            # Radar vs sector average
            st.markdown("### 🌐 Radar: entreprise vs moyenne sectorielle (par topic_fr)")
            if 'topic_fr' in df_display.columns:
                comp_topic = comp_df.groupby('topic_fr')['value'].mean().reset_index()
                sector_topic = df_display.groupby('topic_fr')['value'].mean().reset_index()
                merged = pd.merge(sector_topic, comp_topic, on='topic_fr', how='left', suffixes=('_sector','_company')).fillna(0)
                categories = merged['topic_fr'].tolist()
                r_sector = merged['value_sector'].tolist()
                r_company = merged['value_company'].tolist()
                # close loops
                fig_profile = go.Figure()
                fig_profile.add_trace(go.Scatterpolar(r=r_sector + [r_sector[0]] if len(r_sector)>0 else [], theta=categories + ([categories[0]] if len(categories)>0 else []),
                                                     fill='toself', name='Moyenne sectorielle'))
                fig_profile.add_trace(go.Scatterpolar(r=r_company + [r_company[0]] if len(r_company)>0 else [], theta=categories + ([categories[0]] if len(categories)>0 else []),
                                                     fill='toself', name=company))
                fig_profile.update_layout(polar=dict(radialaxis=dict(visible=True)), showlegend=True, title="Profil ESG par topic_fr")
                st.plotly_chart(fig_profile, use_container_width=True)
            else:
                st.info("La colonne 'topic_fr' est nécessaire pour ce radar.")

            # Scatter: value vs confidence (with hover)
            st.markdown("### 🔬 Scatter KPI value vs confidence")
            if 'confidence' in comp_df.columns:
                fig_scat = px.scatter(comp_df, x='value', y='confidence', hover_data=['kpi_name','topic_fr'], title='Valeur KPI vs Confiance')
                st.plotly_chart(fig_scat, use_container_width=True)
            else:
                st.info("La colonne 'confidence' est absente.")

            # Download company-specific data
            st.markdown("### 📥 Export spécifique")
            display_and_offer_download(comp_df, csv_name=f"{company}_kpis.csv", excel_name=f"{company}_kpis.xlsx")

st.markdown("---")

