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
import hashlib
import uuid
from threading import Thread
import time

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
    nlp.max_length = 3000000
except OSError:
    print("Téléchargement du modèle spaCy...")
    os.system("python -m spacy download en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")
    nlp.max_length = 3000000

kpi_model = SentenceTransformer('all-MiniLM-L6-v2')

# =============================================================================
# CLASSE CHATBOT ESG INTELLIGENT
# =============================================================================

class ESGIntelligentChatbot:
    def __init__(self):
        self.ollama_available = False
        self.current_model = "mistral"
        self.initialize_ollama()
        
        # Contexte ESG spécialisé
        self.esg_context = self._load_esg_knowledge_base()
        
    def _load_esg_knowledge_base(self):
        """Base de connaissances ESG pour le chatbot"""
        return {
            "domains": {
                "environmental": [
                    "Émissions GES", "Gestion des déchets", "Efficacité énergétique",
                    "Consommation d'eau", "Biodiversité", "Économie circulaire"
                ],
                "social": [
                    "Diversité et inclusion", "Santé et sécurité", "Développement des employés",
                    "Relations communautaires", "Droits humains", "Pratiques d'emploi"
                ],
                "governance": [
                    "Éthique des affaires", "Transparence", "Rémunération des dirigeants",
                    "Droits des actionnaires", "Conformité réglementaire", "Risques ESG"
                ]
            },
            "frameworks": [
                "GRI", "SASB", "TCFD", "CDP", "UN SDGs", "EU Taxonomy"
            ],
            "best_practices": {
                "high_performance": "KPIs > 80% avec scores de confiance élevés",
                "medium_performance": "KPIs 50-80% avec bonnes pratiques",
                "low_performance": "KPIs < 50% nécessitant des améliorations"
            }
        }
    
    def initialize_ollama(self):
        """Initialise la connexion à Ollama"""
        try:
            response = requests.get("http://localhost:11434/api/tags", timeout=10)
            if response.status_code == 200:
                self.ollama_available = True
                logger.info("✅ Ollama disponible pour le chatbot ESG")
            else:
                logger.warning("❌ Ollama non accessible")
        except Exception as e:
            logger.warning(f"⚠️ Ollama non disponible: {e}")
    
    def generate_esg_insight(self, kpi_data, company_data, user_question):
        """Génère des insights ESG intelligents"""
        try:
            if not self.ollama_available:
                return self._generate_basic_insight(kpi_data, company_data, user_question)
            
            # Préparer le contexte des données
            context = self._build_esg_context(kpi_data, company_data)
            
            prompt = f"""Tu es un expert en analyse ESG (Environnemental, Social, Gouvernance). 
            Analyse les données ESG suivantes et réponds à la question de l'utilisateur de manière technique et précise.

CONTEXTE ESG:
{context}

QUESTION: {user_question}

INSTRUCTIONS:
- Base ton analyse sur les données ESG fournies
- Sois précis et technique dans tes recommandations
- Structure ta réponse de manière claire
- Propose des recommandations actionnables
- Compare avec les meilleures pratiques du secteur

Réponse experte ESG:"""

            response = requests.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": self.current_model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.3,
                        "num_predict": 800
                    }
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get('response', 'Erreur de génération')
            else:
                return self._generate_basic_insight(kpi_data, company_data, user_question)
                
        except Exception as e:
            logger.error(f"Erreur génération insight ESG: {e}")
            return self._generate_basic_insight(kpi_data, company_data, user_question)
    
    def _build_esg_context(self, kpi_data, company_data):
        """Construit le contexte ESG pour l'analyse"""
        context_parts = []
        
        # Statistiques générales
        if not kpi_data.empty:
            total_kpis = len(kpi_data)
            avg_confidence = kpi_data['confidence'].mean()
            high_confidence_kpis = len(kpi_data[kpi_data['confidence'] > 0.7])
            
            context_parts.append(f"ANALYSE ESG - STATISTIQUES:")
            context_parts.append(f"- KPIs totaux: {total_kpis}")
            context_parts.append(f"- Confiance moyenne: {avg_confidence:.1%}")
            context_parts.append(f"- KPIs haute confiance: {high_confidence_kpis}")
        
        # Analyse par domaine ESG
        if 'topic_fr' in kpi_data.columns:
            domain_analysis = kpi_data['topic_fr'].value_counts()
            context_parts.append("\nRÉPARTITION PAR DOMAINE ESG:")
            for domain, count in domain_analysis.head(5).items():
                context_parts.append(f"- {domain}: {count} KPIs")
        
        # Meilleurs et pires KPIs
        if not kpi_data.empty and 'confidence' in kpi_data.columns:
            top_kpis = kpi_data.nlargest(3, 'confidence')
            bottom_kpis = kpi_data.nsmallest(3, 'confidence')
            
            context_parts.append("\nMEILLEURS KPIs (haute confiance):")
            for _, kpi in top_kpis.iterrows():
                context_parts.append(f"- {kpi.get('kpi_name', 'N/A')}: {kpi.get('value', 'N/A')} {kpi.get('unit', '')} (confiance: {kpi.get('confidence', 0):.1%})")
            
            context_parts.append("\nKPIs À AMÉLIORER (faible confiance):")
            for _, kpi in bottom_kpis.iterrows():
                context_parts.append(f"- {kpi.get('kpi_name', 'N/A')}: {kpi.get('value', 'N/A')} {kpi.get('unit', '')} (confiance: {kpi.get('confidence', 0):.1%})")
        
        # Données entreprise
        if company_data:
            context_parts.append(f"\nCONTEXTE ENTREPRISE:")
            for key, value in company_data.items():
                context_parts.append(f"- {key}: {value}")
        
        return "\n".join(context_parts)
    
    def _generate_basic_insight(self, kpi_data, company_data, user_question):
        """Génère un insight basique sans Ollama"""
        insights = []
        
        if not kpi_data.empty:
            total_kpis = len(kpi_data)
            avg_confidence = kpi_data['confidence'].mean()
            
            insights.append(f"📊 Analyse ESG - {total_kpis} KPIs analysés")
            insights.append(f"🎯 Confiance moyenne: {avg_confidence:.1%}")
            
            # Analyse par domaine
            if 'topic_fr' in kpi_data.columns:
                domain_stats = kpi_data['topic_fr'].value_counts()
                insights.append("\n📈 Répartition par domaine:")
                for domain, count in domain_stats.head(3).items():
                    insights.append(f"  • {domain}: {count} KPIs")
            
            # Recommandations basiques
            if avg_confidence > 0.7:
                insights.append("\n✅ EXCELLENT: Qualité de données ESG élevée")
            elif avg_confidence > 0.5:
                insights.append("\n⚠️ MOYEN: Certains KPIs nécessitent vérification")
            else:
                insights.append("\n❌ AMÉLIORATION: Qualité des données à améliorer")
        
        return "\n".join(insights) if insights else "Aucune donnée ESG disponible pour analyse."

    def benchmark_companies(self, companies_data):
        """Réalise un benchmarking entre entreprises"""
        try:
            if not companies_data:
                return "Aucune donnée disponible pour le benchmarking."
            
            benchmark_context = self._build_benchmark_context(companies_data)
            
            if not self.ollama_available:
                return self._generate_basic_benchmark(companies_data)
            
            prompt = f"""Tu es un expert en benchmarking ESG. 
            Compare les performances ESG des entreprises suivantes et identifie les meilleures pratiques.

DONNÉES DE BENCHMARKING:
{benchmark_context}

INSTRUCTIONS:
- Compare les performances ESG entre entreprises
- Identifie les leaders et les suiveurs
- Propose des recommandations d'amélioration
- Mets en avant les meilleures pratiques
- Sois constructif et technique

Analyse comparative ESG:"""

            response = requests.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": self.current_model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.2,
                        "num_predict": 600
                    }
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get('response', 'Erreur de benchmarking')
            else:
                return self._generate_basic_benchmark(companies_data)
                
        except Exception as e:
            logger.error(f"Erreur benchmarking: {e}")
            return self._generate_basic_benchmark(companies_data)
    
    def _build_benchmark_context(self, companies_data):
        """Construit le contexte pour le benchmarking"""
        context_parts = ["BENCHMARKING ESG - COMPARAISON ENTRE ENTREPRISES:"]
        
        for company_name, data in companies_data.items():
            kpis = data.get('kpis', [])
            context_parts.append(f"\n🏢 {company_name}:")
            context_parts.append(f"  • KPIs: {len(kpis)}")
            
            if kpis:
                avg_conf = sum(kpi.get('confidence', 0) for kpi in kpis) / len(kpis)
                context_parts.append(f"  • Confiance moyenne: {avg_conf:.1%}")
                
                # Domaines couverts
                domains = set(kpi.get('topic_fr', 'Général') for kpi in kpis)
                context_parts.append(f"  • Domaines couverts: {', '.join(list(domains)[:3])}")
        
        return "\n".join(context_parts)
    
    def _generate_basic_benchmark(self, companies_data):
        """Génère un benchmarking basique"""
        insights = ["📊 BENCHMARKING ESG - COMPARAISON:"]
        
        for company_name, data in companies_data.items():
            kpis = data.get('kpis', [])
            if kpis:
                avg_conf = sum(kpi.get('confidence', 0) for kpi in kpis) / len(kpis)
                insights.append(f"\n🏢 {company_name}:")
                insights.append(f"  • {len(kpis)} KPIs - Confiance: {avg_conf:.1%}")
        
        return "\n".join(insights)

# Initialisation du chatbot
esg_chatbot = ESGIntelligentChatbot()

# =============================================================================
# FONCTIONS EXISTANTES (inchangées)
# =============================================================================

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def safe_read_csv(file_path):
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
    
    if 'kpi_name' in df.columns and 'value' in df.columns:
        print("Fichier de résultats existant détecté")
        kpi_list = df['kpi_name'].dropna().unique().tolist()
        kpi_list_fr = []
    else:
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

def is_value_coherent(kpi_name, value, unit):
    kpi_lower = kpi_name.lower()
    
    high_value_kpis = ['emission', 'ghg', 'co2', 'nox', 'sox', 'energy', 'water', 'waste', 'consumption']
    percentage_kpis = ['rate', 'ratio', 'percentage', 'coverage', 'compliance', 'approval']
    
    if any(term in kpi_lower for term in high_value_kpis) and unit == '%' and value < 1:
        return False
        
    if any(term in kpi_lower for term in percentage_kpis) and unit != '%' and value > 1000:
        return False
        
    return True

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

def process_pdf(pdf_path, kpi_embeddings, all_kpis, kpi_df, min_confidence=0.3):
    logger.info(f"Traitement de {os.path.basename(pdf_path)}...")
    
    text = extract_text_from_pdf(pdf_path)
    
    print(f"=== DEBUG EXTRACTION ===")
    print(f"Fichier: {os.path.basename(pdf_path)}")
    print(f"Texte extrait: {len(text)} caractères")
    
    if not text or len(text.strip()) < 100:
        logger.warning(f"Peu de texte extrait de {pdf_path}")
        print("❌ ERREUR: Texte insuffisant")
        return []
    
    debug_dir = "debug_texts"
    os.makedirs(debug_dir, exist_ok=True)
    debug_file = os.path.join(debug_dir, f"debug_{os.path.basename(pdf_path)}.txt")
    with open(debug_file, 'w', encoding='utf-8') as f:
        f.write(text[:5000] + "\n[...]")
    
    print(f"Texte debug sauvegardé: {debug_file}")
    
    if not all_kpis or kpi_embeddings is None:
        print("❌ AUCUN KPI DISPONIBLE - Vérifiez le fichier KPI")
        return []
    
    relevant_kpis = find_relevant_kpis(text, kpi_embeddings, all_kpis, threshold=0.4)
    
    results = []
    
    for kpi_name, matches in relevant_kpis.items():
        print(f"Traitement KPI: {kpi_name} ({len(matches)} correspondances)")
        
        matches_sorted = sorted(matches, key=lambda x: x['score'], reverse=True)
        
        for match in matches_sorted[:3]:
            sentence = match['sentence']
            values = extract_kpi_values(sentence, kpi_name)
            
            print(f"  Phrase: '{sentence[:100]}...' -> {len(values)} valeurs")
            
            for val in values:
                topic = "Unknown"
                topic_fr = "Inconnu"
                score = "Unknown"
                
                try:
                    if hasattr(kpi_df, 'columns') and len(kpi_df.columns) > 0:
                        kpi_matches = []
                        for col_idx in range(min(2, len(kpi_df.columns))):
                            if kpi_name in kpi_df.iloc[:, col_idx].values:
                                kpi_matches = kpi_df[kpi_df.iloc[:, col_idx] == kpi_name]
                                break
                        
                        if not kpi_matches.empty:
                            row = kpi_matches.iloc[0]
                            if len(kpi_df.columns) > 2:
                                topic = str(row.iloc[2]) if pd.notna(row.iloc[2]) else "Unknown"
                            if len(kpi_df.columns) > 3:
                                topic_fr = str(row.iloc[3]) if pd.notna(row.iloc[3]) else "Inconnu"
                            if len(kpi_df.columns) > 4:
                                score_val = row.iloc[4]
                                score = str(score_val) if pd.notna(score_val) else "Unknown"
                except Exception as e:
                    print(f"⚠️ Erreur lors de la récupération des métadonnées KPI: {e}")
                
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
    
    filtered_results = filter_results(results, min_confidence)
    logger.info(f"{len(filtered_results)} KPIs valides après filtrage")
    
    if filtered_results:
        print(f"🎉 EXTRACTION RÉUSSIE: {len(filtered_results)} KPIs uniques extraits")
    else:
        print("❌ AUCUN KPI EXTRACTÉ - Vérifiez le fichier KPI et le contenu du PDF")
    
    return filtered_results

# =============================================================================
# ROUTES API EXISTANTES (inchangées)
# =============================================================================

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "message": "ESG KPI Extractor API is running"})

@app.route('/api/process', methods=['POST'])
def process_pdf_route():
    try:
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
        
        existing_results = load_existing_results()
        
        if (not existing_results.empty and 
            pdf_filename in existing_results['source_file'].values and 
            not rerun_if_exists):
            print("⚠️ PDF déjà traité")
            return jsonify({
                "warning": f"PDF {pdf_filename} was already processed",
                "processed": False
            }), 200
        
        print("Chargement des KPIs...")
        try:
            kpi_df, kpi_list, kpi_list_fr, kpi_embeddings, all_kpis = load_kpi_list(kpi_path)
            
            if len(all_kpis) == 0:
                return jsonify({"error": "No KPIs found in the KPI file"}), 400
                
        except Exception as e:
            print(f"❌ Erreur lors du chargement du fichier KPI: {e}")
            return jsonify({"error": f"Error loading KPI file: {str(e)}"}), 400
        
        print("Traitement du PDF...")
        try:
            new_results = process_pdf(pdf_path, kpi_embeddings, all_kpis, kpi_df, min_confidence)
        except Exception as e:
            print(f"❌ Erreur lors du traitement du PDF: {e}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return jsonify({"error": f"Error processing PDF: {str(e)}"}), 500
        
        response_data = {
            "processed": True,
            "pdf_name": pdf_filename,
            "kpis_loaded": len(all_kpis),
            "new_kpis_extracted": len(new_results),
            "results": new_results
        }
        
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
        
        if 'confidence' in df.columns:
            df_display = df[df['confidence'] >= min_confidence].copy()
        else:
            df_display = df.copy()
        
        metrics = {
            "total_kpis": len(df_display),
            "companies": df_display['source_file'].nunique(),
            "unique_topics": df_display['topic_fr'].nunique() if 'topic_fr' in df_display.columns else df_display['topic'].nunique(),
            "last_extraction": df_display['extraction_date'].max() if 'extraction_date' in df_display.columns else "Unknown"
        }
        
        benchmark_data = []
        if not df_display.empty and 'value' in df_display.columns:
            try:
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
        
        if 'confidence' in df.columns:
            df_display = df[df['confidence'] >= min_confidence].copy()
        else:
            df_display = df.copy()
        
        comp_df = df_display[df_display['source_file'] == company_name].copy()
        
        if comp_df.empty:
            return jsonify({"error": "Company not found"}), 404
        
        metrics = {
            "kpi_count": len(comp_df),
            "avg_confidence": float(comp_df['confidence'].mean()) if 'confidence' in comp_df.columns else 0,
            "topic_coverage": comp_df['topic_fr'].nunique() / max(1, df_display['topic_fr'].nunique()) if 'topic_fr' in comp_df.columns else 0
        }
        
        top_kpis = []
        if not comp_df.empty:
            top_kpis = comp_df.sort_values('confidence', ascending=False).head(10)[
                ['kpi_name', 'value', 'unit', 'confidence', 'topic_fr']
            ].fillna('').to_dict('records')
        
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
        
        if 'confidence' in df.columns:
            df_display = df[df['confidence'] >= min_confidence].copy()
        else:
            df_display = df.copy()
        
        if not companies:
            return jsonify({"error": "No companies selected"}), 400
        
        comp_df = df_display[df_display['source_file'].isin(companies)]
        
        if comp_df.empty:
            return jsonify({"error": "No data for selected companies"}), 404
        
        radar_data = {
            "categories": [],
            "companies": {}
        }
        
        try:
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
        else:
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

# =============================================================================
# NOUVELLES ROUTES POUR LE CHATBOT ESG
# =============================================================================

@app.route('/api/esg-chat', methods=['POST'])
def esg_chat():
    """Endpoint pour le chatbot ESG intelligent"""
    try:
        data = request.get_json() or {}
        user_message = data.get('message', '').strip()
        company_name = data.get('company_name')
        
        if not user_message:
            return jsonify({"error": "Message vide"}), 400
        
        # Charger les données existantes
        df = load_existing_results()
        
        # Filtrer par entreprise si spécifiée
        if company_name:
            company_data = df[df['source_file'] == company_name]
        else:
            company_data = df
        
        # Préparer les données pour l'analyse
        company_info = {}
        if company_name:
            company_info = {
                'entreprise': company_name,
                'total_kpis': len(company_data),
                'domaine_principal': company_data['topic_fr'].mode().iloc[0] if not company_data.empty and 'topic_fr' in company_data.columns else 'Non spécifié'
            }
        
        # Générer la réponse intelligente
        ai_response = esg_chatbot.generate_esg_insight(company_data, company_info, user_message)
        
        return jsonify({
            "response": ai_response,
            "company": company_name,
            "ai_used": esg_chatbot.ollama_available,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Erreur chat ESG: {e}")
        return jsonify({"error": "Erreur lors du traitement de votre requête"}), 500

@app.route('/api/esg-benchmark', methods=['POST'])
def esg_benchmark():
    """Endpoint pour le benchmarking ESG entre entreprises"""
    try:
        data = request.get_json() or {}
        companies = data.get('companies', [])
        
        if not companies:
            return jsonify({"error": "Aucune entreprise spécifiée"}), 400
        
        # Charger les données
        df = load_existing_results()
        
        # Préparer les données de comparaison
        companies_data = {}
        for company in companies:
            company_data = df[df['source_file'] == company]
            if not company_data.empty:
                companies_data[company] = {
                    'kpis': company_data.to_dict('records'),
                    'stats': {
                        'total_kpis': len(company_data),
                        'avg_confidence': company_data['confidence'].mean() if 'confidence' in company_data.columns else 0,
                        'domains': company_data['topic_fr'].nunique() if 'topic_fr' in company_data.columns else 0
                    }
                }
        
        # Générer l'analyse comparative
        benchmark_analysis = esg_chatbot.benchmark_companies(companies_data)
        
        return jsonify({
            "analysis": benchmark_analysis,
            "companies_compared": list(companies_data.keys()),
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Erreur benchmarking ESG: {e}")
        return jsonify({"error": "Erreur lors du benchmarking"}), 500

@app.route('/api/esg-recommendations', methods=['POST'])
def esg_recommendations():
    """Endpoint pour obtenir des recommandations ESG personnalisées"""
    try:
        data = request.get_json() or {}
        company_name = data.get('company_name')
        
        if not company_name:
            return jsonify({"error": "Nom d'entreprise requis"}), 400
        
        # Charger les données de l'entreprise
        df = load_existing_results()
        company_data = df[df['source_file'] == company_name]
        
        if company_data.empty:
            return jsonify({"error": "Aucune donnée trouvée pour cette entreprise"}), 404
        
        # Générer des recommandations
        recommendations_prompt = f"""
        Analyse les performances ESG de {company_name} et propose des recommandations d'amélioration spécifiques.
        Focus sur les domaines avec les scores de confiance les plus bas et les opportunités d'amélioration.
        """
        
        recommendations = esg_chatbot.generate_esg_insight(company_data, {'entreprise': company_name}, recommendations_prompt)
        
        return jsonify({
            "company": company_name,
            "recommendations": recommendations,
            "total_kpis": len(company_data),
            "avg_confidence": company_data['confidence'].mean() if 'confidence' in company_data.columns else 0,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Erreur recommandations ESG: {e}")
        return jsonify({"error": "Erreur lors de la génération des recommandations"}), 500

@app.route('/api/chatbot-status', methods=['GET'])
def chatbot_status():
    """Statut du chatbot ESG"""
    return jsonify({
        "ollama_available": esg_chatbot.ollama_available,
        "current_model": esg_chatbot.current_model,
        "esg_knowledge_base": {
            "domains": len(esg_chatbot.esg_context["domains"]),
            "frameworks": len(esg_chatbot.esg_context["frameworks"])
        }
    })

if __name__ == '__main__':
    print("🚀 Démarrage de l'API ESG Analytics avec Chatbot Intelligent...")
    print("=" * 60)
    print("📊 Fonctionnalités ESG:")
    print("  ✅ Extraction automatique de KPIs ESG")
    print("  🤖 Chatbot intelligent avec analyse RAG")
    print("  📈 Benchmarking entre entreprises")
    print("  💡 Recommandations personnalisées")
    print("  📊 Dashboard analytique complet")
    print("=" * 60)
    print(f"🔧 Chatbot ESG: {'✅ ACTIF' if esg_chatbot.ollama_available else '⚠️ MODE BASIQUE'}")
    print(f"🌐 URL: http://localhost:5000")
    print("=" * 60)
    
    app.run(debug=True, host='0.0.0.0', port=5000)