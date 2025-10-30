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
import requests
import json

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

# Configuration Ollama
OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL = "mistral"  # ou "llama3.2" selon votre préférence

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

# Charger la liste des KPIs - CORRIGÉ
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
    
    print(f"Colonnes disponibles: {list(df.columns)}")
    print(f"Shape du DataFrame: {df.shape}")
    
    # Vérifier si le fichier est le fichier de résultats existant ou un nouveau fichier KPI
    if 'kpi_name' in df.columns and 'value' in df.columns:
        # C'est un fichier de résultats existant, on le traite différemment
        print("Fichier de résultats existant détecté")
        kpi_list = df['kpi_name'].dropna().unique().tolist()
        kpi_list_fr = []
    else:
        # C'est un nouveau fichier KPI
        kpi_name_col = None
        kpi_name_fr_col = None
        
        for col in df.columns:
            col_lower = col.lower()
            if 'kpi' in col_lower and 'name' in col_lower and 'fr' not in col_lower:
                kpi_name_col = col
            elif 'kpi' in col_lower and 'name' in col_lower and 'fr' in col_lower:
                kpi_name_fr_col = col
            elif 'name' in col_lower and kpi_name_col is None:
                kpi_name_col = col
            elif 'nom' in col_lower and kpi_name_fr_col is None:
                kpi_name_fr_col = col
        
        # Fallback: utiliser les premières colonnes
        if kpi_name_col is None and len(df.columns) > 0:
            kpi_name_col = df.columns[0]
        if kpi_name_fr_col is None and len(df.columns) > 1:
            kpi_name_fr_col = df.columns[1]
        
        print(f"Colonne KPI anglais: {kpi_name_col}")
        print(f"Colonne KPI français: {kpi_name_fr_col}")
        
        kpi_list = df[kpi_name_col].dropna().unique().tolist() if kpi_name_col else []
        kpi_list_fr = df[kpi_name_fr_col].dropna().unique().tolist() if kpi_name_fr_col else []
    
    print(f"KPIs anglais chargés: {len(kpi_list)}")
    print(f"KPIs français chargés: {len(kpi_list_fr)}")
    
    all_kpis = kpi_list + kpi_list_fr
    if all_kpis:
        kpi_embeddings = kpi_model.encode(all_kpis, convert_to_tensor=True)
    else:
        kpi_embeddings = None
    
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
def find_relevant_kpis(text, kpi_embeddings, all_kpis, threshold=0.4):
    if not all_kpis or kpi_embeddings is None:
        return {}
        
    cleaned_text = clean_text(text)
    
    print(f"Texte nettoyé: {len(cleaned_text)} caractères")
    
    if len(cleaned_text) > 1000000:
        chunks = split_text_into_chunks(cleaned_text)
        print(f"Texte divisé en {len(chunks)} chunks")
    else:
        chunks = [cleaned_text]
    
    relevant_kpis = defaultdict(list)
    
    for chunk_idx, chunk in enumerate(chunks):
        print(f"Traitement du chunk {chunk_idx + 1}/{len(chunks)}")
        
        try:
            if len(chunk) > 10000:
                sentences = re.split(r'[.!?]+', chunk)
                sentences = [s.strip() for s in sentences if len(s.strip()) > 20]
            else:
                doc = nlp(chunk)
                sentences = [sent.text for sent in doc.sents if len(sent.text) > 20]
        except Exception as e:
            print(f"Erreur segmentation: {e}")
            sentences = re.split(r'[.!?]+', chunk)
            sentences = [s.strip() for s in sentences if len(s.strip()) > 20]
        
        print(f"Chunk {chunk_idx + 1}: {len(sentences)} phrases à traiter")
        
        for i, sentence in enumerate(sentences):
            if i % 50 == 0 and i > 0:
                print(f"  Traité {i}/{len(sentences)} phrases...")
                
            try:
                sentence_embedding = kpi_model.encode(sentence, convert_to_tensor=True)
                cos_scores = util.pytorch_cos_sim(sentence_embedding, kpi_embeddings)[0]
                top_results = np.argsort(-cos_scores.cpu().numpy())[:3]
                
                for idx in top_results:
                    if cos_scores[idx] > threshold:
                        kpi_name = all_kpis[idx]
                        if not any(match['sentence'] == sentence for match in relevant_kpis[kpi_name]):
                            relevant_kpis[kpi_name].append({
                                'sentence': sentence,
                                'score': float(cos_scores[idx])
                            })
            except Exception as e:
                print(f"Erreur traitement phrase: {e}")
                continue
    
    print(f"KPIs pertinents trouvés: {len(relevant_kpis)}")
    for kpi_name, matches in relevant_kpis.items():
        print(f"  - {kpi_name}: {len(matches)} correspondances")
    
    return relevant_kpis

# Vérifier la cohérence des valeurs
def is_value_coherent(kpi_name, value, unit):
    kpi_lower = kpi_name.lower()
    
    high_value_kpis = ['emission', 'ghg', 'co2', 'nox', 'sox', 'energy', 'water', 'waste', 'consumption']
    percentage_kpis = ['rate', 'ratio', 'percentage', 'coverage', 'compliance', 'approval']
    
    if any(term in kpi_lower for term in high_value_kpis) and unit == '%' and value < 1:
        return False
        
    if any(term in kpi_lower for term in percentage_kpis) and unit != '%' and value > 1000:
        return False
        
    return True

# Extraire les valeurs numériques
def extract_kpi_values(text, kpi_name):
    patterns = [
        r"(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:tons?|tonnes|t|%|kg|kWh|CO2|CO₂|ppm|ppb|µg/m³|mg/m³|employees|people|€|EUR|USD|\$|m³|MWh|GWh|TJ)",
        r"(\d{1,3}(?:,\d{3})*(?:\.\d+)?\%)(?:\s|$)",
        r"(?:is|was|are|were|:|\=)\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)",
        r"(?:value of|rate of|amount of|total|reduction of|approximately|about)\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)",
        r"\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:million|billion|thousand)?\s*(?:tons?|tonnes|percent|%)?"
    ]
    
    values = []
    seen_values = set()
    
    for pattern in patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            value_str = match.group(1).replace(',', '')
            try:
                multiplier = 1
                if re.search(r'million', match.group(0), re.IGNORECASE):
                    multiplier = 1000000
                elif re.search(r'billion', match.group(0), re.IGNORECASE):
                    multiplier = 1000000000
                elif re.search(r'thousand', match.group(0), re.IGNORECASE):
                    multiplier = 1000
                
                numeric_value = float(value_str) * multiplier if '.' in value_str else int(value_str) * multiplier
                unit = determine_unit(text, kpi_name)
                
                value_id = f"{numeric_value}_{unit}"
                
                if (value_id not in seen_values and 
                    is_value_coherent(kpi_name, numeric_value, unit)):
                    values.append({
                        'value': numeric_value,
                        'unit': unit
                    })
                    seen_values.add(value_id)
            except ValueError:
                continue
    
    return values

# Déterminer l'unité
def determine_unit(text, kpi_name):
    unit_patterns = {
        r'tons?|tonnes|tCO2e|t CO2e': 'tons',
        r'kg|kilograms': 'kg',
        r'%|percent|percentage': '%',
        r'kWh|kilowatt-hours': 'kWh',
        r'MWh|megawatt-hours': 'MWh',
        r'GWh|gigawatt-hours': 'GWh',
        r'CO2|CO₂|carbon dioxide': 'tCO2e',
        r'ppm|parts per million': 'ppm',
        r'employees|workers|people': 'people',
        r'€|EUR|USD|\$|dollars': 'currency',
        r'm³|cubic meters': 'm³'
    }
    
    for pattern, u in unit_patterns.items():
        if re.search(pattern, text, re.IGNORECASE):
            return u
    
    kpi_lower = kpi_name.lower()
    if any(term in kpi_lower for term in ['rate', 'ratio', 'percentage', 'coverage', 'reduction']):
        return '%'
    elif any(term in kpi_lower for term in ['emission', 'ghg', 'co2', 'carbon']):
        return 'tCO2e'
    elif any(term in kpi_lower for term in ['energy', 'consumption', 'electricity']):
        return 'kWh'
    elif any(term in kpi_lower for term in ['water', 'usage']):
        return 'm³'
    
    return 'unknown'

# Filtrer les résultats
def filter_results(results, min_confidence=0.3):
    filtered = []
    seen = set()
    
    results_sorted = sorted(results, key=lambda x: x['confidence'], reverse=True)
    
    for result in results_sorted:
        identifier = f"{result['kpi_name']}_{result['value']}_{result['unit']}_{result['source_file']}"
        
        if (identifier not in seen and 
            result['confidence'] >= min_confidence):
            filtered.append(result)
            seen.add(identifier)
    
    kpi_groups = defaultdict(list)
    for result in filtered:
        kpi_groups[result['kpi_name']].append(result)
    
    final_results = []
    for kpi_name, occurrences in kpi_groups.items():
        best_occurrence = max(occurrences, key=lambda x: x['confidence'])
        final_results.append(best_occurrence)
    
    return final_results

# Traiter un PDF - CORRIGÉ
def process_pdf(pdf_path, kpi_embeddings, all_kpis, kpi_df, min_confidence=0.3):
    logger.info(f"Traitement de {os.path.basename(pdf_path)}...")
    
    # Extraire le texte
    text = extract_text_from_pdf(pdf_path)
    
    print(f"=== DEBUG EXTRACTION ===")
    print(f"Fichier: {os.path.basename(pdf_path)}")
    print(f"Texte extrait: {len(text)} caractères")
    
    if not text or len(text.strip()) < 100:
        logger.warning(f"Peu de texte extrait de {pdf_path}")
        print("❌ ERREUR: Texte insuffisant")
        return []
    
    # Sauvegarder le texte extrait pour debug
    debug_dir = "debug_texts"
    os.makedirs(debug_dir, exist_ok=True)
    debug_file = os.path.join(debug_dir, f"debug_{os.path.basename(pdf_path)}.txt")
    with open(debug_file, 'w', encoding='utf-8') as f:
        f.write(text[:5000] + "\n[...]")
    
    print(f"Texte debug sauvegardé: {debug_file}")
    
    # Vérifier si on a des KPIs à chercher
    if not all_kpis or kpi_embeddings is None:
        print("❌ AUCUN KPI DISPONIBLE - Vérifiez le fichier KPI")
        return []
    
    # Trouver les KPIs pertinents
    relevant_kpis = find_relevant_kpis(text, kpi_embeddings, all_kpis, threshold=0.4)
    
    results = []
    
    # Pour chaque KPI pertinent, extraire les valeurs - CORRECTION ICI
    for kpi_name, matches in relevant_kpis.items():
        print(f"Traitement KPI: {kpi_name} ({len(matches)} correspondances)")
        
        matches_sorted = sorted(matches, key=lambda x: x['score'], reverse=True)
        
        for match in matches_sorted[:3]:
            sentence = match['sentence']
            values = extract_kpi_values(sentence, kpi_name)
            
            print(f"  Phrase: '{sentence[:100]}...' -> {len(values)} valeurs")
            
            for val in values:
                # CORRECTION : Gestion sécurisée des colonnes du DataFrame KPI
                topic = "Unknown"
                topic_fr = "Inconnu"
                score = "Unknown"
                
                try:
                    # Vérifier si kpi_df est un DataFrame valide
                    if hasattr(kpi_df, 'columns') and len(kpi_df.columns) > 0:
                        # Chercher le KPI dans toutes les colonnes de nom
                        kpi_matches = []
                        for col_idx in range(min(2, len(kpi_df.columns))):
                            if kpi_name in kpi_df.iloc[:, col_idx].values:
                                kpi_matches = kpi_df[kpi_df.iloc[:, col_idx] == kpi_name]
                                break
                        
                        if not kpi_matches.empty:
                            row = kpi_matches.iloc[0]
                            # Récupérer les colonnes de manière sécurisée
                            if len(kpi_df.columns) > 2:
                                topic = str(row.iloc[2]) if pd.notna(row.iloc[2]) else "Unknown"
                            if len(kpi_df.columns) > 3:
                                topic_fr = str(row.iloc[3]) if pd.notna(row.iloc[3]) else "Inconnu"
                            if len(kpi_df.columns) > 4:
                                score_val = row.iloc[4]
                                score = str(score_val) if pd.notna(score_val) else "Unknown"
                except Exception as e:
                    print(f"⚠️ Erreur lors de la récupération des métadonnées KPI: {e}")
                    # Utiliser les valeurs par défaut en cas d'erreur
                
                result_item = {
                    'kpi_name': kpi_name,
                    'value': val['value'],
                    'unit': val['unit'],
                    'source_file': os.path.basename(pdf_path),
                    'topic': topic,
                    'topic_fr': topic_fr,
                    'score': score,
                    'confidence': match['score'],
                    'extraction_date': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
                
                results.append(result_item)
                print(f"  ✅ KPI extrait: {kpi_name} = {val['value']} {val['unit']} (confiance: {match['score']:.3f})")
    
    # Filtrer les résultats
    filtered_results = filter_results(results, min_confidence)
    logger.info(f"{len(filtered_results)} KPIs valides après filtrage")
    
    if filtered_results:
        print(f"🎉 EXTRACTION RÉUSSIE: {len(filtered_results)} KPIs uniques extraits")
    else:
        print("❌ AUCUN KPI EXTRACTÉ - Vérifiez le fichier KPI et le contenu du PDF")
    
    return filtered_results

# Fonctions pour le chatbot
def check_ollama_connection():
    """Vérifier si Ollama est accessible"""
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=10)
        return response.status_code == 200
    except requests.exceptions.RequestException:
        return False

def get_available_models():
    """Obtenir la liste des modèles disponibles"""
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags")
        if response.status_code == 200:
            return response.json().get('models', [])
        return []
    except requests.exceptions.RequestException:
        return []

def query_ollama(prompt, context_data=""):
    """Interroger le modèle Ollama"""
    try:
        # Préparer le contexte avec les données ESG
        system_prompt = f"""
        Tu es un assistant expert en analyse ESG (Environnement, Social, Gouvernance). 
        Tu aides les utilisateurs à comprendre les données extraites des rapports ESG.
        
        Contexte des données ESG disponibles:
        {context_data}
        
        Réponds en français de manière claire et concise. Si tu n'as pas assez d'informations pour répondre, indique-le.
        """
        
        payload = {
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "system": system_prompt,
            "stream": False,
            "options": {
                "temperature": 0.3,
                "top_p": 0.9,
                "top_k": 40
            }
        }
        
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json=payload,
            timeout=120
        )
        
        if response.status_code == 200:
            result = response.json()
            return result.get('response', 'Désolé, je n\'ai pas pu générer de réponse.')
        else:
            return f"Erreur Ollama: {response.status_code} - {response.text}"
            
    except requests.exceptions.RequestException as e:
        return f"Erreur de connexion à Ollama: {str(e)}"
    except Exception as e:
        return f"Erreur inattendue: {str(e)}"

def prepare_chatbot_context():
    """Préparer le contexte pour le chatbot basé sur les données extraites"""
    try:
        df = load_existing_results()
        
        if df.empty:
            return "Aucune donnée ESG n'a été extraite pour le moment. Veuillez d'abord traiter des documents PDF."
        
        # Résumer les données disponibles
        context_parts = []
        
        # Informations générales
        context_parts.append(f"Nombre total de KPIs extraits: {len(df)}")
        context_parts.append(f"Entreprises analysées: {', '.join(df['source_file'].unique())}")
        
        # KPIs par catégorie
        if 'topic_fr' in df.columns:
            topics = df['topic_fr'].value_counts()
            context_parts.append("KPIs par catégorie:")
            for topic, count in topics.head(5).items():
                context_parts.append(f"  - {topic}: {count} KPIs")
        
        # Exemples de KPIs importants
        if not df.empty:
            context_parts.append("Exemples de KPIs extraits:")
            sample_kpis = df.head(3)[['kpi_name', 'value', 'unit']].to_dict('records')
            for kpi in sample_kpis:
                context_parts.append(f"  - {kpi['kpi_name']}: {kpi['value']} {kpi.get('unit', '')}")
        
        return "\n".join(context_parts)
        
    except Exception as e:
        return f"Erreur lors de la préparation du contexte: {str(e)}"

# Routes API

@app.route('/api/health', methods=['GET'])
def health_check():
    ollama_status = "connected" if check_ollama_connection() else "disconnected"
    return jsonify({
        "status": "healthy", 
        "message": "ESG KPI Extractor API is running",
        "ollama": ollama_status
    })

@app.route('/api/chatbot/models', methods=['GET'])
def get_chatbot_models():
    """Obtenir la liste des modèles disponibles"""
    try:
        models = get_available_models()
        return jsonify({"models": models, "current_model": OLLAMA_MODEL})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/chatbot/chat', methods=['POST'])
def chatbot_chat():
    """Endpoint pour discuter avec le chatbot"""
    try:
        data = request.get_json()
        question = data.get('question', '')
        
        if not question:
            return jsonify({"error": "La question est requise"}), 400
        
        # Préparer le contexte avec les données ESG
        context_data = prepare_chatbot_context()
        
        # Générer la réponse
        response = query_ollama(question, context_data)
        
        return jsonify({
            "question": question,
            "response": response,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Erreur chatbot: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/chatbot/context', methods=['GET'])
def get_chatbot_context():
    """Obtenir le contexte actuel du chatbot"""
    try:
        context = prepare_chatbot_context()
        return jsonify({"context": context})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/process', methods=['POST'])
def process_pdf_route():
    try:
        # Vérifier les fichiers
        if 'kpi_file' not in request.files or 'pdf_file' not in request.files:
            return jsonify({"error": "KPI file and PDF file are required"}), 400
        
        kpi_file = request.files['kpi_file']
        pdf_file = request.files['pdf_file']
        min_confidence = float(request.form.get('min_confidence', 0.3))
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
        
        print(f"=== DÉBUT TRAITEMENT ===")
        print(f"KPI file: {kpi_filename}")
        print(f"PDF file: {pdf_filename}")
        print(f"Min confidence: {min_confidence}")
        
        # Charger les résultats existants
        existing_results = load_existing_results()
        
        # Vérifier si le PDF a déjà été traité
        if (not existing_results.empty and 
            pdf_filename in existing_results['source_file'].values and 
            not rerun_if_exists):
            print("⚠️ PDF déjà traité")
            return jsonify({
                "warning": f"PDF {pdf_filename} was already processed",
                "processed": False
            }), 200
        
        # Charger la liste des KPIs
        print("Chargement des KPIs...")
        try:
            kpi_df, kpi_list, kpi_list_fr, kpi_embeddings, all_kpis = load_kpi_list(kpi_path)
            
            if len(all_kpis) == 0:
                return jsonify({"error": "No KPIs found in the KPI file"}), 400
                
        except Exception as e:
            print(f"❌ Erreur lors du chargement du fichier KPI: {e}")
            return jsonify({"error": f"Error loading KPI file: {str(e)}"}), 400
        
        # Traiter le PDF
        print("Traitement du PDF...")
        try:
            new_results = process_pdf(pdf_path, kpi_embeddings, all_kpis, kpi_df, min_confidence)
        except Exception as e:
            print(f"❌ Erreur lors du traitement du PDF: {e}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return jsonify({"error": f"Error processing PDF: {str(e)}"}), 500
        
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
            try:
                if existing_results.empty:
                    all_results = pd.DataFrame(new_results)
                else:
                    new_df = pd.DataFrame(new_results)
                    all_results = pd.concat([existing_results, new_df], ignore_index=True)
                    all_results = all_results.drop_duplicates(
                        subset=['kpi_name', 'value', 'unit', 'source_file'], 
                        keep='last'
                    )
                
                save_success = save_results(all_results)
                if save_success:
                    response_data["total_kpis"] = len(all_results)
                    print(f"💾 Données sauvegardées: {len(all_results)} KPIs au total")
                else:
                    print("❌ Erreur sauvegarde")
            except Exception as e:
                print(f"❌ Erreur lors de la sauvegarde: {e}")
        
        # Nettoyer les fichiers temporaires
        try:
            os.remove(kpi_path)
            os.remove(pdf_path)
        except:
            pass
        
        print(f"=== FIN TRAITEMENT: {len(new_results)} nouveaux KPIs ===")
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"Error processing PDF: {e}")
        import traceback
        print(f"❌ ERREUR: {traceback.format_exc()}")
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
                "last_extraction": "Unknown",
                "processed_files": []
            })
        
        statistics = {
            "total_kpis": len(df),
            "companies": df['source_file'].nunique(),
            "unique_topics": df['topic'].nunique() if 'topic' in df.columns else 0,
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
        min_confidence = float(request.args.get('min_confidence', 0.3))
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
        
        # Benchmark par entreprise
        benchmark_data = []
        if not df_display.empty and 'value' in df_display.columns:
            try:
                # Gérer les valeurs manquantes
                df_numeric = df_display.dropna(subset=['value'])
                if not df_numeric.empty:
                    benchmark = df_numeric.groupby('source_file')['value'].agg([
                        'mean', 'median', 'min', 'max', 'std', 'count'
                    ]).reset_index()
                    benchmark = benchmark.rename(columns={'source_file': 'company'})
                    benchmark_data = benchmark.fillna(0).to_dict('records')
            except Exception as e:
                print(f"Error in benchmark calculation: {e}")
                benchmark_data = []
        
        # Données pour les graphiques
        chart_data = {
            "confidence_distribution": {}
        }
        
        if 'confidence' in df_display.columns:
            try:
                confidence_counts = df_display['confidence'].round(2).value_counts().to_dict()
                chart_data["confidence_distribution"] = confidence_counts
            except:
                chart_data["confidence_distribution"] = {}
        
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
        min_confidence = float(request.args.get('min_confidence', 0.3))
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
            "avg_confidence": float(comp_df['confidence'].mean()) if 'confidence' in comp_df.columns else 0,
            "topic_coverage": comp_df['topic_fr'].nunique() / max(1, df_display['topic_fr'].nunique()) if 'topic_fr' in comp_df.columns else 0
        }
        
        # Top KPIs par confiance
        top_kpis = []
        if not comp_df.empty:
            top_kpis = comp_df.sort_values('confidence', ascending=False).head(10)[
                ['kpi_name', 'value', 'unit', 'confidence', 'topic_fr']
            ].fillna('').to_dict('records')
        
        # Données pour les graphiques
        chart_data = {
            "value_vs_confidence": comp_df[['value', 'confidence']].fillna(0).to_dict('records') if 'confidence' in comp_df.columns else []
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
        min_confidence = float(request.args.get('min_confidence', 0.3))
        
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
        radar_data = {
            "categories": [],
            "companies": {}
        }
        
        try:
            # Préparer les données pour le radar
            agg = comp_df.groupby(['source_file', compare_by])['value'].mean().reset_index()
            pivot = agg.pivot(index='source_file', columns=compare_by, values='value').fillna(0)
            
            radar_data = {
                "categories": pivot.columns.tolist(),
                "companies": {}
            }
            
            for company in pivot.index:
                radar_data["companies"][company] = pivot.loc[company].tolist()
        except Exception as e:
            print(f"Error creating radar data: {e}")
        
        # Données de similarité
        similarity_data = {}
        try:
            if len(pivot) >= 2:
                from sklearn.metrics.pairwise import cosine_similarity
                sim = cosine_similarity(pivot.values)
                similarity_data = {
                    "companies": pivot.index.tolist(),
                    "matrix": sim.tolist()
                }
        except:
            similarity_data = {}
        
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
    print("  GET  /api/chatbot/models - Get available chatbot models")
    print("  POST /api/chatbot/chat - Chat with the ESG assistant")
    print("  GET  /api/chatbot/context - Get chatbot context")
    
    # Vérifier la connexion Ollama
    if check_ollama_connection():
        print("✅ Ollama est connecté et accessible")
        models = get_available_models()
        if models:
            print(f"✅ Modèles disponibles: {[model.get('name', 'Unknown') for model in models]}")
        else:
            print("⚠️ Aucun modèle trouvé dans Ollama")
    else:
        print("❌ Ollama n'est pas accessible. Vérifiez qu'il est démarré sur le port 11434")
    
    app.run(debug=True, host='0.0.0.0', port=5000)