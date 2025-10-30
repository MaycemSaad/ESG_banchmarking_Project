from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
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
import tempfile
import io
import logging
from werkzeug.utils import secure_filename
from flask_cors import CORS

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)



app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"])

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf', 'xlsx', 'xls', 'csv'}
OUTPUT_CSV = "all_extracted_kpis.csv"
OUTPUT_EXCEL = "all_extracted_kpis.xlsx"

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 200 * 1024 * 1024  # 200MB max

# Créer le dossier uploads s'il n'existe pas
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Charger les modèles NLP au démarrage
print("Chargement des modèles NLP...")
try:
    nlp = spacy.load("en_core_web_sm")
    nlp.max_length = 3000000  # Augmenter la limite de texte
except OSError:
    print("Téléchargement du modèle spaCy...")
    os.system("python -m spacy download en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")
    nlp.max_length = 3000000

kpi_model = SentenceTransformer('all-MiniLM-L6-v2')

# Fonctions utilitaires
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def safe_read_csv(file_path):
    """Safely read CSV with error handling for inconsistent columns"""
    try:
        return pd.read_csv(file_path)
    except pd.errors.ParserError:
        try:
            return pd.read_csv(file_path, on_bad_lines='skip', engine='python')
        except TypeError:
            return pd.read_csv(file_path, error_bad_lines=False, engine='python')
    except Exception as e:
        logger.error(f"Error reading CSV: {e}")
        return pd.DataFrame()

# Charger les résultats existants
def load_existing_results():
    if os.path.exists(OUTPUT_CSV):
        try:
            existing_df = safe_read_csv(OUTPUT_CSV)
            logger.info(f"Chargement de {len(existing_df)} KPIs existants")
            return existing_df
        except Exception as e:
            logger.error(f"Erreur lors du chargement des résultats existants: {e}")
            return pd.DataFrame()
    return pd.DataFrame()

# Sauvegarder les résultats
def save_results(all_results):
    if not all_results.empty:
        try:
            all_results.to_csv(OUTPUT_CSV, index=False, encoding='utf-8-sig')
            all_results.to_excel(OUTPUT_EXCEL, index=False)
            logger.info(f"Résultats sauvegardés: {len(all_results)} KPIs")
            return True
        except Exception as e:
            logger.error(f"Erreur lors de la sauvegarde: {e}")
            return False
    return False

# Charger la liste des KPIs
def load_kpi_list(file_path):
    file_extension = os.path.splitext(file_path)[1].lower()
    
    if file_extension == '.csv':
        encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'windows-1252']
        for encoding in encodings:
            try:
                df = pd.read_csv(file_path, sep=';', encoding=encoding)
                break
            except UnicodeDecodeError:
                continue
        else:
            raise ValueError("Impossible de décoder le fichier CSV")
    
    elif file_extension in ['.xlsx', '.xls']:
        df = pd.read_excel(file_path)
    
    else:
        raise ValueError("Format de fichier non supporté")
    
    # Trouver les colonnes KPI
    kpi_name_col = None
    kpi_name_fr_col = None
    
    for col in df.columns:
        col_lower = col.lower()
        if 'kpi_name' in col_lower and 'fr' not in col_lower:
            kpi_name_col = col
        elif 'kpi_name' in col_lower and 'fr' in col_lower:
            kpi_name_fr_col = col
    
    if kpi_name_col is None and len(df.columns) > 0:
        kpi_name_col = df.columns[0]
    if kpi_name_fr_col is None and len(df.columns) > 1:
        kpi_name_fr_col = df.columns[1]
    
    kpi_list = df[kpi_name_col].dropna().tolist() if kpi_name_col else []
    kpi_list_fr = df[kpi_name_fr_col].dropna().tolist() if kpi_name_fr_col else []
    
    all_kpis = kpi_list + kpi_list_fr
    kpi_embeddings = kpi_model.encode(all_kpis, convert_to_tensor=True)
    
    return df, kpi_list, kpi_list_fr, kpi_embeddings, all_kpis

# Extraire le texte d'un PDF
def extract_text_from_pdf(pdf_path):
    text_content = ""
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    text_content += text + "\n"
                
                tables = page.extract_tables()
                for table in tables:
                    for row in table:
                        text_content += " | ".join(str(cell) for cell in row if cell is not None) + "\n"
                    text_content += "\n"
    except Exception as e:
        logger.error(f"Erreur avec pdfplumber: {e}")
    
    if len(text_content.strip()) < 100:
        try:
            doc = fitz.open(pdf_path)
            for page in doc:
                text_content += page.get_text("text") + "\n"
        except Exception as e:
            logger.error(f"Erreur avec PyMuPDF: {e}")
    
    return text_content

# Nettoyer le texte
def clean_text(text):
    lines = text.split('\n')
    cleaned_lines = []
    
    for line in lines:
        if re.match(r'^\s*\d+\s*$', line):
            continue
        if re.match(r'^.*www\.\w+\.com.*$', line):
            continue
        if len(line.strip()) < 5:
            continue
        cleaned_lines.append(line)
    
    return '\n'.join(cleaned_lines)

# Diviser le texte en chunks
def split_text_into_chunks(text, max_chars=500000):
    if len(text) <= max_chars:
        return [text]
    
    chunks = []
    paragraphs = text.split('\n\n')
    
    current_chunk = ""
    for paragraph in paragraphs:
        if len(current_chunk) + len(paragraph) < max_chars:
            current_chunk += paragraph + "\n\n"
        else:
            if current_chunk:
                chunks.append(current_chunk)
            current_chunk = paragraph + "\n\n"
    
    if current_chunk:
        chunks.append(current_chunk)
    
    if any(len(chunk) > max_chars for chunk in chunks):
        refined_chunks = []
        for chunk in chunks:
            if len(chunk) <= max_chars:
                refined_chunks.append(chunk)
            else:
                sentences = re.split(r'[.!?]+', chunk)
                current_refined = ""
                for sentence in sentences:
                    if len(current_refined) + len(sentence) < max_chars:
                        current_refined += sentence + ". "
                    else:
                        if current_refined:
                            refined_chunks.append(current_refined)
                        current_refined = sentence + ". "
                if current_refined:
                    refined_chunks.append(current_refined)
        chunks = refined_chunks
    
    return chunks

# Trouver les KPIs pertinents
def find_relevant_kpis(text, kpi_embeddings, all_kpis, threshold=0.55):
    cleaned_text = clean_text(text)
    
    if len(cleaned_text) > 1000000:
        chunks = split_text_into_chunks(cleaned_text)
    else:
        chunks = [cleaned_text]
    
    relevant_kpis = defaultdict(list)
    
    for chunk_idx, chunk in enumerate(chunks):
        try:
            if len(chunk) > 10000:
                sentences = re.split(r'[.!?]+', chunk)
                sentences = [s.strip() for s in sentences if len(s.strip()) > 30]
            else:
                doc = nlp(chunk)
                sentences = [sent.text for sent in doc.sents if len(sent.text) > 30]
        except Exception as e:
            sentences = re.split(r'[.!?]+', chunk)
            sentences = [s.strip() for s in sentences if len(s.strip()) > 30]
        
        for sentence in sentences:
            sentence_embedding = kpi_model.encode(sentence, convert_to_tensor=True)
            cos_scores = util.pytorch_cos_sim(sentence_embedding, kpi_embeddings)[0]
            top_results = np.argsort(-cos_scores.cpu().numpy())[:3]
            
            for idx in top_results:
                if cos_scores[idx] > threshold:
                    kpi_name = all_kpis[idx]
                    relevant_kpis[kpi_name].append({
                        'sentence': sentence,
                        'score': float(cos_scores[idx])
                    })
    
    return relevant_kpis

# Vérifier la cohérence des valeurs
def is_value_coherent(kpi_name, value, unit):
    kpi_lower = kpi_name.lower()
    
    high_value_kpis = ['emission', 'ghg', 'co2', 'nox', 'sox', 'energy', 'water', 'waste', 'consumption']
    percentage_kpis = ['rate', 'ratio', 'percentage', 'coverage', 'compliance', 'approval']
    
    if any(term in kpi_lower for term in high_value_kpis) and unit == '%' and value < 10:
        return False
        
    if any(term in kpi_lower for term in percentage_kpis) and unit != '%' and value > 100:
        return False
        
    return True

# Extraire les valeurs numériques
def extract_kpi_values(text, kpi_name):
    patterns = [
        r"(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:tons?|tonnes|t|%|kg|kWh|CO2|CO₂|ppm|ppb|µg/m³|mg/m³|employees|people|€|EUR|USD|\$)",
        r"(\d{1,3}(?:,\d{3})*(?:\.\d+)?\%)(?:\s|$)",
        r"(?:is|was|are|were|:|\=)\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)",
        r"(?:value of|rate of|amount of|total|reduction of)\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)"
    ]
    
    values = []
    
    for pattern in patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            value_str = match.group(1).replace(',', '')
            try:
                numeric_value = float(value_str) if '.' in value_str else int(value_str)
                unit = determine_unit(text, kpi_name)
                
                if is_value_coherent(kpi_name, numeric_value, unit):
                    values.append({
                        'value': numeric_value,
                        'unit': unit
                    })
            except ValueError:
                continue
    
    return values

# Déterminer l'unité
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
    
    kpi_lower = kpi_name.lower()
    if any(term in kpi_lower for term in ['rate', 'ratio', 'percentage', 'coverage']):
        return '%'
    elif any(term in kpi_lower for term in ['emission', 'ghg', 'co2', 'carbon']):
        return 'tCO2e'
    
    return 'unknown'

# Filtrer les résultats
def filter_results(results, min_confidence=0.5):
    filtered = []
    seen = set()
    
    for result in results:
        identifier = f"{result['kpi_name']}_{result['value']}_{result['unit']}_{result['source_file']}"
        
        if (identifier not in seen and 
            result['confidence'] >= min_confidence):
            filtered.append(result)
            seen.add(identifier)
    
    return filtered

# Traiter un PDF
def process_pdf(pdf_path, kpi_embeddings, all_kpis, kpi_df, min_confidence=0.5):
    logger.info(f"Traitement de {os.path.basename(pdf_path)}...")
    
    text = extract_text_from_pdf(pdf_path)
    
    if not text or len(text.strip()) < 100:
        logger.warning(f"Peu de texte extrait de {pdf_path}")
        return []
    
    relevant_kpis = find_relevant_kpis(text, kpi_embeddings, all_kpis)
    
    results = []
    
    for kpi_name, matches in relevant_kpis.items():
        for match in matches:
            sentence = match['sentence']
            values = extract_kpi_values(sentence, kpi_name)
            
            for val in values:
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
    
    filtered_results = filter_results(results, min_confidence)
    logger.info(f"{len(filtered_results)} KPIs valides après filtrage")
    
    return filtered_results

# Routes API

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "message": "ESG KPI Extractor API is running"})

@app.route('/api/process', methods=['POST'])
def process_pdf_route():
    try:
        # Vérifier les fichiers
        if 'kpi_file' not in request.files or 'pdf_file' not in request.files:
            return jsonify({"error": "KPI file and PDF file are required"}), 400
        
        kpi_file = request.files['kpi_file']
        pdf_file = request.files['pdf_file']
        min_confidence = float(request.form.get('min_confidence', 0.5))
        rerun_if_exists = request.form.get('rerun_if_exists', 'false').lower() == 'true'
        
        if kpi_file.filename == '' or pdf_file.filename == '':
            return jsonify({"error": "No selected file"}), 400
        
        if not (allowed_file(kpi_file.filename) and allowed_file(pdf_file.filename)):
            return jsonify({"error": "Invalid file type"}), 400
        
        # Sauvegarder les fichiers temporairement
        kpi_filename = secure_filename(kpi_file.filename)
        pdf_filename = secure_filename(pdf_file.filename)
        
        kpi_path = os.path.join(app.config['UPLOAD_FOLDER'], kpi_filename)
        pdf_path = os.path.join(app.config['UPLOAD_FOLDER'], pdf_filename)
        
        kpi_file.save(kpi_path)
        pdf_file.save(pdf_path)
        
        # Charger les résultats existants
        existing_results = load_existing_results()
        
        # Vérifier si le PDF a déjà été traité
        if (not existing_results.empty and 
            pdf_filename in existing_results['source_file'].values and 
            not rerun_if_exists):
            return jsonify({
                "warning": f"PDF {pdf_filename} was already processed",
                "processed": False
            }), 200
        
        # Charger la liste des KPIs
        kpi_df, kpi_list, kpi_list_fr, kpi_embeddings, all_kpis = load_kpi_list(kpi_path)
        
        # Traiter le PDF
        new_results = process_pdf(pdf_path, kpi_embeddings, all_kpis, kpi_df, min_confidence)
        
        # Préparer la réponse
        response_data = {
            "processed": True,
            "pdf_name": pdf_filename,
            "kpis_loaded": len(all_kpis),
            "new_kpis_extracted": len(new_results),
            "results": new_results
        }
        
        # Sauvegarder les résultats si nécessaire
        if new_results:
            if existing_results.empty:
                all_results = pd.DataFrame(new_results)
            else:
                new_df = pd.DataFrame(new_results)
                all_results = pd.concat([existing_results, new_df], ignore_index=True)
                all_results = all_results.drop_duplicates(subset=['kpi_name', 'value', 'unit', 'source_file'], keep='last')
            
            save_results(all_results)
            response_data["total_kpis"] = len(all_results)
        
        # Nettoyer les fichiers temporaires
        os.remove(kpi_path)
        os.remove(pdf_path)
        
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"Error processing PDF: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/statistics', methods=['GET'])
def get_statistics():
    try:
        df = load_existing_results()
        
        if df.empty:
            return jsonify({
                "total_kpis": 0,
                "companies": 0,
                "unique_topics": 0,
                "processed_files": []
            })
        
        statistics = {
            "total_kpis": len(df),
            "companies": df['source_file'].nunique(),
            "unique_topics": df['topic'].nunique(),
            "last_extraction": df['extraction_date'].max() if 'extraction_date' in df.columns else "Unknown",
            "processed_files": []
        }
        
        for file in df['source_file'].unique():
            count = len(df[df['source_file'] == file])
            statistics["processed_files"].append({
                "filename": file,
                "kpi_count": count
            })
        
        return jsonify(statistics)
        
    except Exception as e:
        logger.error(f"Error getting statistics: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard_data():
    try:
        min_confidence = float(request.args.get('min_confidence', 0.5))
        df = load_existing_results()
        
        if df.empty:
            return jsonify({
                "metrics": {
                    "total_kpis": 0,
                    "companies": 0,
                    "unique_topics": 0,
                    "last_extraction": "Unknown"
                },
                "benchmark": [],
                "chart_data": {}
            })
        
        # Appliquer le filtre de confiance
        if 'confidence' in df.columns:
            df_display = df[df['confidence'] >= min_confidence].copy()
        else:
            df_display = df.copy()
        
        # Métriques de haut niveau
        metrics = {
            "total_kpis": len(df_display),
            "companies": df_display['source_file'].nunique(),
            "unique_topics": df_display['topic_fr'].nunique() if 'topic_fr' in df_display.columns else df_display['topic'].nunique(),
            "last_extraction": df_display['extraction_date'].max() if 'extraction_date' in df_display.columns else "Unknown"
        }
        
        # Benchmark par entreprise - CORRIGÉ
        benchmark_data = []
        if not df_display.empty and 'value' in df_display.columns:
            try:
                benchmark = df_display.groupby('source_file')['value'].agg([
                    'mean', 'median', 'min', 'max', 'std', 'count'
                ]).reset_index()
                benchmark = benchmark.rename(columns={'source_file': 'company'})
                benchmark_data = benchmark.to_dict('records')
            except Exception as e:
                print(f"Error in benchmark calculation: {e}")
                benchmark_data = []
        
        # Données pour les graphiques
        chart_data = {
            "confidence_distribution": {}
        }
        
        if 'confidence' in df_display.columns:
            confidence_counts = df_display['confidence'].round(2).value_counts().to_dict()
            chart_data["confidence_distribution"] = confidence_counts
        
        return jsonify({
            "metrics": metrics,
            "benchmark": benchmark_data,
            "chart_data": chart_data
        })
        
    except Exception as e:
        logger.error(f"Error getting dashboard data: {e}")
        return jsonify({"error": str(e)}), 500
@app.route('/api/companies', methods=['GET'])
def get_companies():
    try:
        df = load_existing_results()
        
        if df.empty:
            return jsonify([])
        
        companies = df['source_file'].unique().tolist()
        return jsonify(companies)
        
    except Exception as e:
        logger.error(f"Error getting companies: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/company/<company_name>', methods=['GET'])
def get_company_data(company_name):
    try:
        min_confidence = float(request.args.get('min_confidence', 0.5))
        df = load_existing_results()
        
        if df.empty:
            return jsonify({"error": "No data available"}), 404
        
        # Appliquer le filtre de confiance
        if 'confidence' in df.columns:
            df_display = df[df['confidence'] >= min_confidence].copy()
        else:
            df_display = df.copy()
        
        comp_df = df_display[df_display['source_file'] == company_name].copy()
        
        if comp_df.empty:
            return jsonify({"error": "Company not found"}), 404
        
        # Métriques de l'entreprise
        metrics = {
            "kpi_count": len(comp_df),
            "avg_confidence": comp_df['confidence'].mean() if 'confidence' in comp_df.columns else 0,
            "topic_coverage": comp_df['topic_fr'].nunique() / max(1, df_display['topic_fr'].nunique()) if 'topic_fr' in comp_df.columns else 0
        }
        
        # Top KPIs par confiance
        top_kpis = comp_df.sort_values('confidence', ascending=False).head(10)[
            ['kpi_name', 'value', 'unit', 'confidence', 'topic_fr']
        ].to_dict('records')
        
        # Données pour les graphiques
        chart_data = {
            "value_vs_confidence": comp_df[['value', 'confidence']].to_dict('records') if 'confidence' in comp_df.columns else []
        }
        
        return jsonify({
            "company": company_name,
            "metrics": metrics,
            "top_kpis": top_kpis,
            "chart_data": chart_data
        })
        
    except Exception as e:
        logger.error(f"Error getting company data: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/comparison', methods=['GET'])
def get_comparison_data():
    try:
        companies = request.args.getlist('companies')
        compare_by = request.args.get('compare_by', 'topic_fr')
        min_confidence = float(request.args.get('min_confidence', 0.5))
        
        df = load_existing_results()
        
        if df.empty:
            return jsonify({"error": "No data available"}), 404
        
        # Appliquer le filtre de confiance
        if 'confidence' in df.columns:
            df_display = df[df['confidence'] >= min_confidence].copy()
        else:
            df_display = df.copy()
        
        if not companies:
            return jsonify({"error": "No companies selected"}), 400
        
        # Filtrer par entreprises sélectionnées
        comp_df = df_display[df_display['source_file'].isin(companies)]
        
        if comp_df.empty:
            return jsonify({"error": "No data for selected companies"}), 404
        
        # Données pour le radar chart
        agg = comp_df.groupby(['source_file', compare_by])['value'].mean().reset_index()
        pivot = agg.pivot(index='source_file', columns=compare_by, values='value').fillna(0)
        
        radar_data = {
            "categories": pivot.columns.tolist(),
            "companies": {}
        }
        
        for company in pivot.index:
            radar_data["companies"][company] = pivot.loc[company].tolist()
        
        # Données de similarité
        similarity_data = {}
        if len(pivot) >= 2:
            from sklearn.metrics.pairwise import cosine_similarity
            sim = cosine_similarity(pivot.values)
            similarity_data = {
                "companies": pivot.index.tolist(),
                "matrix": sim.tolist()
            }
        
        return jsonify({
            "radar_data": radar_data,
            "similarity_data": similarity_data
        })
        
    except Exception as e:
        logger.error(f"Error getting comparison data: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/export/csv', methods=['GET'])
def export_csv():
    try:
        df = load_existing_results()
        
        if df.empty:
            return jsonify({"error": "No data to export"}), 404
        
        # Créer un fichier CSV en mémoire
        output = io.StringIO()
        df.to_csv(output, index=False, encoding='utf-8-sig')
        output.seek(0)
        
        return send_file(
            io.BytesIO(output.getvalue().encode('utf-8-sig')),
            mimetype='text/csv',
            as_attachment=True,
            download_name='esg_kpis_export.csv'
        )
        
    except Exception as e:
        logger.error(f"Error exporting CSV: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/export/excel', methods=['GET'])
def export_excel():
    try:
        df = load_existing_results()
        
        if df.empty:
            return jsonify({"error": "No data to export"}), 404
        
        # Créer un fichier Excel en mémoire
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='ESG_KPIs')
        output.seek(0)
        
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='esg_kpis_export.xlsx'
        )
        
    except Exception as e:
        logger.error(f"Error exporting Excel: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/export/company/<company_name>', methods=['GET'])
def export_company_data(company_name):
    try:
        df = load_existing_results()
        
        if df.empty:
            return jsonify({"error": "No data available"}), 404
        
        comp_df = df[df['source_file'] == company_name]
        
        if comp_df.empty:
            return jsonify({"error": "Company not found"}), 404
        
        format_type = request.args.get('format', 'csv')
        
        if format_type == 'csv':
            output = io.StringIO()
            comp_df.to_csv(output, index=False, encoding='utf-8-sig')
            output.seek(0)
            
            return send_file(
                io.BytesIO(output.getvalue().encode('utf-8-sig')),
                mimetype='text/csv',
                as_attachment=True,
                download_name=f'{company_name}_kpis.csv'
            )
        else:  # Excel
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                comp_df.to_excel(writer, index=False, sheet_name='KPIs')
            output.seek(0)
            
            return send_file(
                output,
                mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                as_attachment=True,
                download_name=f'{company_name}_kpis.xlsx'
            )
        
    except Exception as e:
        logger.error(f"Error exporting company data: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Starting ESG KPI Extractor API...")
    print("Available endpoints:")
    print("  GET  /api/health - Health check")
    print("  POST /api/process - Process PDF and extract KPIs")
    print("  GET  /api/statistics - Get overall statistics")
    print("  GET  /api/dashboard - Get dashboard data")
    print("  GET  /api/companies - Get list of companies")
    print("  GET  /api/company/<name> - Get company details")
    print("  GET  /api/comparison - Get comparison data")
    print("  GET  /api/export/csv - Export all data as CSV")
    print("  GET  /api/export/excel - Export all data as Excel")
    print("  GET  /api/export/company/<name> - Export company data")
    
    app.run(debug=True, host='0.0.0.0', port=5000)