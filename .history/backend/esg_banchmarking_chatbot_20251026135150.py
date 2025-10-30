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
# CLASSE CHATBOT ESG INTELLIGENT AVEC OLLAMA MISTRAL
# =============================================================================

class ESGIntelligentChatbot:
    def __init__(self):
        self.ollama_available = False
        self.current_model = "mistral"
        self.initialize_ollama()
        
        # Contexte ESG spécialisé enrichi
        self.esg_context = self._load_enhanced_esg_knowledge_base()
        
    def _load_enhanced_esg_knowledge_base(self):
        """Base de connaissances ESG enrichie pour le chatbot"""
        return {
            "sector_benchmarks": {
                "technologie": {"ghg_emissions": "50-100 tCO2e/M€", "gender_diversity": "35-45%", "board_independence": "60-70%"},
                "industrie": {"ghg_emissions": "200-500 tCO2e/M€", "gender_diversity": "25-35%", "board_independence": "50-60%"},
                "finance": {"ghg_emissions": "20-50 tCO2e/M€", "gender_diversity": "40-50%", "board_independence": "70-80%"},
                "énergie": {"ghg_emissions": "500-1000 tCO2e/M€", "gender_diversity": "20-30%", "board_independence": "55-65%"}
            },
            "regulations": {
                "CSRD": "Entrée en vigueur 2024 pour les grandes entreprises",
                "SFDR": "Règlement sur la publication d'informations en matière de durabilité",
                "Taxonomie UE": "Classification des activités durables",
                "Loi Climat": "Exigences renforcées de reporting climatique"
            },
            "best_practices": {
                "high_performance": "Intégration ESG dans la stratégie business, objectifs scientifiques validés, reporting transparent",
                "medium_performance": "Systèmes de collecte établis, initiatives ponctuelles, conformité réglementaire",
                "low_performance": "Approche réactive, données fragmentées, risque réglementaire élevé"
            }
        }
    
    def initialize_ollama(self):
        """Initialise la connexion à Ollama"""
        try:
            response = requests.get("http://localhost:11434/api/tags", timeout=10)
            if response.status_code == 200:
                self.ollama_available = True
                logger.info("✅ Ollama disponible pour le chatbot ESG")
                print("✅ Ollama connecté avec succès!")
                
                # Vérifier si Mistral est disponible
                models = response.json().get('models', [])
                mistral_available = any('mistral' in model.get('name', '').lower() for model in models)
                if mistral_available:
                    print("✅ Modèle Mistral disponible")
                else:
                    print("⚠️ Mistral non trouvé, utilisation du modèle par défaut")
                    
            else:
                logger.warning("❌ Ollama non accessible")
                print("❌ Ollama non accessible")
        except Exception as e:
            logger.warning(f"⚠️ Ollama non disponible: {e}")
            print(f"⚠️ Ollama non disponible: {e}")
    
    def generate_esg_insight(self, kpi_data, company_data, user_question):
        """Génère des insights ESG intelligents avec Ollama Mistral"""
        try:
            # Préparer le contexte des données
            context = self._build_comprehensive_esg_context(kpi_data, company_data, user_question)
            
            if not self.ollama_available:
                return self._generate_enhanced_detailed_insight(kpi_data, company_data, user_question, context)
            
            prompt = f"""En tant qu'expert senior en analyse ESG avec plus de 15 ans d'expérience, je vous propose une analyse approfondie basée sur les données disponibles.

CONTEXTE D'ANALYSE:
{context}

QUESTION SPÉCIFIQUE: {user_question}

Veuillez fournir une réponse structurée en paragraphes détaillés qui :

1. Commence par une analyse positionnelle de l'entreprise dans son secteur
2. Détaille les forces et faiblesses identifiées avec des exemples concrets
3. Explique les implications stratégiques et réglementaires
4. Propose des recommandations actionnables avec des échéances réalistes
5. Mentionne les risques et opportunités spécifiques

Évitez les listes à puces et privilégiez des paragraphes fluides et connectés. Utilisez un langage professionnel mais accessible, avec des références aux réglementations pertinentes (CSRD, SFDR, Taxonomie UE).

Analyse experte ESG:"""

            print(f"🔍 Envoi de la requête à Ollama Mistral...")
            response = requests.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": self.current_model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.3,
                        "num_predict": 1500,
                        "top_k": 40,
                        "top_p": 0.9
                    }
                },
                timeout=120
            )
            
            if response.status_code == 200:
                result = response.json()
                ai_response = result.get('response', '')
                print(f"✅ Réponse reçue de Mistral ({len(ai_response)} caractères)")
                return self._format_detailed_response(ai_response)
            else:
                print(f"❌ Erreur Ollama: {response.status_code}")
                return self._generate_enhanced_detailed_insight(kpi_data, company_data, user_question, context)
                
        except requests.exceptions.Timeout:
            print("⏰ Timeout Ollama, utilisation du mode fallback")
            return self._generate_enhanced_detailed_insight(kpi_data, company_data, user_question, "")
        except Exception as e:
            logger.error(f"Erreur génération insight ESG: {e}")
            print(f"❌ Erreur avec Ollama: {e}")
            return self._generate_enhanced_detailed_insight(kpi_data, company_data, user_question, "")
    
    def _format_detailed_response(self, response):
        """Formate la réponse pour assurer des paragraphes cohérents"""
        # Nettoyer et structurer la réponse
        paragraphs = [p.strip() for p in response.split('\n\n') if p.strip()]
        formatted_response = '\n\n'.join(paragraphs)
        return formatted_response
    
    def _build_comprehensive_esg_context(self, kpi_data, company_data, user_question):
        """Construit un contexte ESG complet et détaillé"""
        context_parts = []
        
        # Analyse quantitative détaillée
        if not kpi_data.empty:
            total_kpis = len(kpi_data)
            avg_confidence = kpi_data['confidence'].mean() if 'confidence' in kpi_data.columns else 0.5
            high_confidence_kpis = len(kpi_data[kpi_data['confidence'] > 0.7]) if 'confidence' in kpi_data.columns else 0
            medium_confidence_kpis = len(kpi_data[(kpi_data['confidence'] > 0.4) & (kpi_data['confidence'] <= 0.7)]) if 'confidence' in kpi_data.columns else 0
            low_confidence_kpis = len(kpi_data[kpi_data['confidence'] <= 0.4]) if 'confidence' in kpi_data.columns else 0
            
            context_parts.append("ANALYSE QUANTITATIVE DES DONNÉES ESG:")
            context_parts.append(f"L'ensemble de données comprend {total_kpis} indicateurs ESG distincts, avec un niveau de confiance moyen de {avg_confidence:.1%}. Parmi ceux-ci, {high_confidence_kpis} indicateurs présentent une fiabilité élevée (confiance > 70%), {medium_confidence_kpis} une fiabilité moyenne, et {low_confidence_kpis} indicateurs nécessitent une vérification approfondie en raison de leur faible niveau de confiance.")
        
        # Analyse qualitative par domaine
        if not kpi_data.empty and 'topic_fr' in kpi_data.columns:
            domain_analysis = kpi_data['topic_fr'].value_counts()
            context_parts.append("\nCOUVERTURE THÉMATIQUE DÉTAILLÉE:")
            
            domain_descriptions = []
            for domain, count in domain_analysis.items():
                if count >= 5:
                    domain_descriptions.append(f"une couverture robuste dans le domaine {domain} avec {count} indicateurs spécifiques")
                elif count >= 2:
                    domain_descriptions.append(f"une présence modérée en {domain} ({count} indicateurs)")
                else:
                    domain_descriptions.append(f"une couverture limitée pour {domain}")
            
            if domain_descriptions:
                context_parts.append("L'entreprise démontre " + ", ".join(domain_descriptions) + ".")
        
        # Analyse des performances
        if not kpi_data.empty and 'confidence' in kpi_data.columns:
            top_kpis = kpi_data.nlargest(3, 'confidence')
            bottom_kpis = kpi_data.nsmallest(3, 'confidence')
            
            context_parts.append("\nINDICATEURS À FORTE FIABILITÉ:")
            top_descriptions = []
            for _, kpi in top_kpis.iterrows():
                top_descriptions.append(f"l'indicateur {kpi.get('kpi_name', 'N/A')} avec une valeur de {kpi.get('value', 'N/A')} {kpi.get('unit', '')} et un score de confiance de {kpi.get('confidence', 0):.1%}")
            if top_descriptions:
                context_parts.append("Parmi les données les plus fiables figurent " + ", ".join(top_descriptions) + ".")
            
            context_parts.append("\nINDICATEURS REQUÉRANT UNE ATTENTION PARTICULIÈRE:")
            bottom_descriptions = []
            for _, kpi in bottom_kpis.iterrows():
                bottom_descriptions.append(f"{kpi.get('kpi_name', 'N/A')} (confiance: {kpi.get('confidence', 0):.1%})")
            if bottom_descriptions:
                context_parts.append("Certains indicateurs présentent des niveaux de confiance nécessitant une validation renforcée, notamment " + ", ".join(bottom_descriptions) + ".")
        
        # Contexte entreprise et sectoriel
        if company_data:
            context_parts.append(f"\nCONTEXTE STRATÉGIQUE:")
            company_context = []
            for key, value in company_data.items():
                company_context.append(f"{key}: {value}")
            if company_context:
                context_parts.append("Le profil de l'entreprise se caractérise par " + ", ".join(company_context) + ".")
        
        # Ajouter des insights sectoriels
        estimated_sector = self._estimate_company_sector(kpi_data)
        sector_insights = self._get_sector_insights(estimated_sector)
        context_parts.append(f"\nPERSPECTIVE SECTORIELLE:")
        context_parts.append(f"Basé sur le profil des indicateurs, l'entreprise évolue probablement dans le secteur {estimated_sector}. {sector_insights}")
        
        return "\n".join(context_parts)
    
    def _estimate_company_sector(self, kpi_data):
        """Estime le secteur d'activité basé sur les KPIs"""
        if kpi_data.empty:
            return "non déterminé"
            
        environmental_count = len(kpi_data[kpi_data['topic_fr'].str.contains('environnement|émis|énergie', na=False, case=False)]) if 'topic_fr' in kpi_data.columns else 0
        social_count = len(kpi_data[kpi_data['topic_fr'].str.contains('social|diversité|employé', na=False, case=False)]) if 'topic_fr' in kpi_data.columns else 0
        total_count = len(kpi_data)
        
        env_ratio = environmental_count / total_count if total_count > 0 else 0
        social_ratio = social_count / total_count if total_count > 0 else 0
        
        if env_ratio > 0.6:
            return "industriel ou énergétique"
        elif social_ratio > 0.5:
            return "services ou technologies"
        elif env_ratio > 0.3 and social_ratio > 0.3:
            return "manufacturier diversifié"
        else:
            return "général"
    
    def _get_sector_insights(self, sector):
        """Retourne des insights spécifiques au secteur"""
        insights = {
            "industriel ou énergétique": "Ce secteur fait face à des exigences réglementaires croissantes en matière d'émissions et d'efficacité énergétique, avec une attention particulière sur la transition bas-carbone et l'économie circulaire.",
            "services ou technologies": "Les enjeux prioritaires incluent la diversité des équipes, l'innovation responsable, et la gouvernance des données, avec des attentes croissantes en matière de transparence.",
            "manufacturier diversifié": "La double pression environnementale et sociale caractérise ce secteur, nécessitant une approche équilibrée entre réduction d'impact et développement des talents.",
            "général": "Une approche ESG progressive est recommandée, en commençant par les domaines à impact matériel le plus élevé pour l'activité spécifique de l'entreprise."
        }
        return insights.get(sector, "Une analyse sectorielle plus précise nécessiterait des informations complémentaires sur le cœur d'activité de l'entreprise.")
    
    def _generate_enhanced_detailed_insight(self, kpi_data, company_data, user_question, context=""):
        """Génère un insight détaillé amélioré avec paragraphes structurés (fallback)"""
        
        if kpi_data.empty:
            return self._get_contextual_fallback_response(user_question)
        
        # Analyse quantitative de base
        total_kpis = len(kpi_data)
        avg_confidence = kpi_data['confidence'].mean() if 'confidence' in kpi_data.columns else 0.5
        high_conf_count = len(kpi_data[kpi_data['confidence'] > 0.7]) if 'confidence' in kpi_data.columns else 0
        medium_conf_count = len(kpi_data[(kpi_data['confidence'] > 0.4) & (kpi_data['confidence'] <= 0.7)]) if 'confidence' in kpi_data.columns else 0
        low_conf_count = len(kpi_data[kpi_data['confidence'] <= 0.4]) if 'confidence' in kpi_data.columns else 0
        
        # Construction de la réponse en paragraphes détaillés
        response_parts = []
        
        # Introduction contextuelle
        response_parts.append(
            f"En ma qualité d'expert ESG senior, j'ai analysé en profondeur les {total_kpis} indicateurs disponibles "
            f"pour vous fournir une évaluation détaillée et personnalisée. La qualité globale des données présente "
            f"un niveau de confiance moyen de {avg_confidence:.1%}, ce qui se traduit par {high_conf_count} indicateurs "
            f"à haute fiabilité, {medium_conf_count} à fiabilité modérée, et {low_conf_count} indicateurs nécessitant "
            f"une attention particulière en raison de leur niveau de confiance plus limité."
        )
        
        # Analyse sectorielle et positionnement
        estimated_sector = self._estimate_company_sector(kpi_data)
        response_parts.append(
            f"Sur la base du profil des indicateurs analysés, votre organisation évolue probablement dans le secteur "
            f"{estimated_sector}. Cette appréciation sectorielle permet de contextualiser vos performances ESG au regard "
            f"des attentes spécifiques et des standards de votre industrie, notamment en matière d'intensité carbone, "
            f"de diversité des équipes et de gouvernance d'entreprise."
        )
        
        # Analyse par domaine détaillée
        if not kpi_data.empty and 'topic_fr' in kpi_data.columns:
            domain_stats = kpi_data['topic_fr'].value_counts()
            primary_domains = domain_stats.head(3)
            
            domain_analysis = "En examinant la répartition thématique, votre entreprise présente "
            domain_details = []
            for domain, count in primary_domains.items():
                if count >= 5:
                    domain_details.append(f"une maîtrise avancée du domaine {domain} matérialisée par {count} indicateurs dédiés")
                elif count >= 2:
                    domain_details.append(f"une couverture opérationnelle en {domain} avec {count} indicateurs de suivi")
                else:
                    domain_details.append(f"une présence émergente dans le domaine {domain}")
            
            if domain_details:
                response_parts.append(domain_analysis + ", ".join(domain_details) + ". Cette cartographie reflète les priorités stratégiques actuelles et identifie les axes de développement potentiels pour une couverture ESG plus exhaustive.")
        
        # Évaluation de la maturité ESG approfondie
        if avg_confidence > 0.7:
            maturity_assessment = (
                "Le niveau de maturité ESG apparaît particulièrement avancé, témoignant de systèmes de collecte "
                "robustes et d'une culture de transparence bien ancrée. Cette excellence opérationnelle constitue "
                "un atout stratégique majeur pour anticiper les évolutions réglementaires comme le CSRD et positionner "
                "l'entreprise comme référence dans son secteur. La prochaine étape pourrait consister à développer "
                "des indicateurs d'impact plus avancés et à intégrer les considérations ESG dans l'ensemble de la "
                "chaîne de valeur."
            )
        elif avg_confidence > 0.5:
            maturity_assessment = (
                "La maturité ESG se situe à un stade intermédiaire, indiquant des fondations solides mais "
                "des opportunités significatives d'optimisation. Les processus de collecte sont établis mais "
                "gagneraient en automatisation et en standardisation. Cette position offre l'avantage d'une "
                "base opérationnelle fiable tout en permettant une montée en compétence progressive vers "
                "l'excellence ESG. Les efforts devraient prioriser la consolidation des données sociales "
                "et environnementales, ainsi que leur intégration dans les mécanismes de décision stratégique."
            )
        else:
            maturity_assessment = (
                "Le stade de développement ESG est actuellement émergent, soulignant la nécessité d'investissements "
                "structurants dans les systèmes de mesure et la gouvernance associée. Cette situation, bien que "
                "représentant un défi immédiat, offre l'opportunité de construire une démarche ESG cohérente "
                "et alignée avec la stratégie business. Une approche priorisée ciblant initialement les domaines "
                "les plus matériels pour l'activité permettrait des progrès rapides et visibles, tout en "
                "posant les bases d'une transformation plus profonde."
            )
        
        response_parts.append(maturity_assessment)
        
        # Recommandations stratégiques contextuelles
        recommendations = self._generate_strategic_recommendations(kpi_data, user_question, avg_confidence)
        response_parts.append(recommendations)
        
        # Perspectives réglementaires
        regulatory_outlook = self._get_regulatory_outlook(estimated_sector)
        response_parts.append(regulatory_outlook)
        
        return "\n\n".join(response_parts)
    
    def _generate_strategic_recommendations(self, kpi_data, user_question, avg_confidence):
        """Génère des recommandations stratégiques contextuelles"""
        question_lower = user_question.lower()
        
        if any(word in question_lower for word in ['positionnement', 'comparer', 'secteur', 'benchmark']):
            return (
                "Pour affiner votre positionnement sectoriel, je recommande la mise en place d'une analyse comparative "
                "systématique intégrant à la fois les référentiels standards du secteur et les pratiques émergentes "
                "des leaders ESG. Cette démarche devrait s'accompagner d'un dialogue renforcé avec les parties prenantes "
                "clés pour identifier les attentes spécifiques et les critères de différenciation valorisés. La création "
                "d'un tableau de bord de benchmarking permettrait un suivi dynamique de votre position relative et "
                "l'identification rapide des domaines nécessitant une attention particulière."
            )
        
        elif any(word in question_lower for word in ['performance', 'résultat', 'amélioration']):
            return (
                "L'optimisation des performances ESG devrait s'articuler autour d'une approche duale combinant "
                "le renforcement de la fiabilité des données existantes et l'élargissement stratégique de la couverture "
                "thématique. Concernant la qualité des données, un programme de validation multi-niveaux incluant "
                "des audits ponctuels et des contrôles croisés permettrait d'atteindre un niveau d'excellence. "
                "Parallèlement, l'identification des domaines ESG matériels pour votre modèle d'affaires guidera "
                "l'extension progressive du périmètre de reporting vers des indicateurs plus avancés d'impact."
            )
        
        elif any(word in question_lower for word in ['règlementation', 'conformité', 'csrd', 'sfdr']):
            return (
                "Au regard de l'évolution rapide du paysage réglementaire, une cartographie exhaustive des exigences "
                "applicables s'impose, en particulier pour le CSRD qui représente une transformation majeure des "
                "obligations de reporting. La robustesse actuelle de vos données constitue un atout significatif "
                "pour une mise en conformité efficiente. Je recommande la réalisation d'un gap analysis détaillé "
                "pour identifier précisément les écarts à combler et l'élaboration d'un plan de transition progressif "
                "intégrant les échéances réglementaires, les ressources nécessaires et les impacts opérationnels."
            )
        
        else:
            if avg_confidence > 0.7:
                return (
                    "La qualité exceptionnelle de vos données ESG ouvre la voie à des initiatives stratégiques "
                    "avancées. Je recommande notamment le développement d'objectifs scientifiques alignés sur "
                    "les accords climatiques internationaux, l'intégration des critères ESG dans les mécanismes "
                    "de rémunération variable, et l'exploration de financements verts pour accélérer votre "
                    "transition durable. La prochaine étape consisterait à transformer vos données en avantage "
                    "concurrentiel through une communication d'impact différenciante et crédible."
                )
            else:
                return (
                    "La priorité immédiate consiste à consolider les fondations de votre démarche ESG through "
                    "une standardisation des processus de collecte et une clarification des responsabilités "
                    "opérationnelles. L'établissement d'un plan de progression clair avec des objectifs intermédiaires "
                    "mesurables permettrait de maintenir l'élan et de démontrer des avancées concrètes. "
                    "L'intégration des considérations ESG dans la planification stratégique à moyen terme "
                    "maximisera la création de valeur durable et renforcera la résilience de l'organisation."
                )
    
    def _get_regulatory_outlook(self, sector):
        """Retourne les perspectives réglementaires par secteur"""
        outlooks = {
            "industriel ou énergétique": (
                "Le secteur industriel et énergétique fait face à un renforcement significatif des exigences "
                "réglementaires, particulièrement sur les émissions de gaz à effet de serre et l'efficacité "
                "énergétique. La taxonomie européenne et le mécanisme d'ajustement carbone aux frontières "
                "vont progressivement reconfigurer les règles de concurrence. Une anticipation active de "
                "ces évolutions through l'innovation bas-carbone et l'économie circulaire deviendra un "
                "facteur clé de compétitivité dans les prochaines années."
            ),
            "services ou technologies": (
                "Les acteurs des services et technologies doivent se préparer à une transparence accrue "
                "sur leur gouvernance des données, leur impact social et leur empreinte environnementale "
                "indirecte. Le règlement SFDR et les exigences de due diligence vont renforcer les attentes "
                "en matière de reporting extra-financier. L'intégration de l'ESG dans l'innovation produit "
                "et service constituera un différentiateur stratégique face à une régulation de plus en plus "
                "exigeante sur la responsabilité numérique."
            ),
            "manufacturier diversifié": (
                "La double pression réglementaire environnementale et sociale caractérise le paysage "
                "des manufacturiers diversifiés. Les obligations de reporting se étendent progressivement "
                "à l'ensemble de la chaîne d'approvisionnement, tandis que les critères sociaux gagnent "
                "en importance dans les appels d'offres et les relations commerciales. Une approche "
                "proactive intégrant l'écoconception, l'économie circulaire et le développement des "
                "compétences sera essentielle pour naviguer dans ce environnement réglementaire complexe."
            )
        }
        return outlooks.get(sector, 
            "Le paysage réglementaire ESG connaît une évolution rapide et complexe, avec une harmonisation "
            "progressive au niveau européen through le CSRD et la taxonomie verte. Une veille réglementaire "
            "active et une approche flexible de conformité sont recommandées pour anticiper les changements "
            "et transformer les contraintes réglementaires en opportunités stratégiques."
        )
    
    def _get_contextual_fallback_response(self, user_question):
        """Réponses de fallback contextuelles et détaillées"""
        question_lower = user_question.lower()
        
        if any(word in question_lower for word in ['positionnement', 'comparer', 'benchmark']):
            return (
                "Pour établir un positionnement ESG précis et personnalisé, l'analyse nécessite l'accès "
                "à des données spécifiques sur les performances de votre entreprise. En l'absence de ces "
                "informations, je peux vous indiquer que les organisations leaders en matière ESG se "
                "caractérisent généralement par une intégration profonde des considérations de durabilité "
                "dans leur stratégie business, une transparence accrue dans leur reporting, et un engagement "
                "mesurable sur des objectifs ambitieux alignés avec les référentiels internationaux. "
                "Une évaluation personnalisée et actionnable nécessiterait l'extraction préalable des "
                "indicateurs ESG pertinents à partir de vos documents de reporting through notre système "
                "d'analyse automatisée."
            )
        
        elif any(word in question_lower for word in ['performance', 'résultat']):
            return (
                "L'évaluation précise de la performance ESG repose sur l'analyse systématique d'indicateurs "
                "quantitatifs et qualitatifs couvrant l'ensemble des dimensions environnementales, sociales "
                "et de gouvernance. Sans données spécifiques à votre organisation, je ne peux fournir "
                "une analyse personnalisée, mais je peux vous orienter vers les domaines typiquement "
                "évalués dans une démarche ESG complète : l'intensité carbone du scope 1, 2 et 3, "
                "la diversité et l'inclusion sous toutes ses dimensions, l'innovation durable, "
                "la robustesse des systèmes de contrôle interne, et l'engagement des parties prenantes. "
                "Le chargement de vos rapports ESG through notre interface permettrait une analyse "
                "détaillée et l'identification de leviers d'amélioration concrets."
            )
        
        else:
            return (
                "En ma qualité d'expert ESG disposant d'une expérience approfondie dans l'analyse des "
                "performances de durabilité des entreprises, je suis parfaitement équipé pour vous "
                "accompagner dans l'évaluation de votre stratégie ESG et l'identification des opportunités "
                "d'amélioration. Malheureusement, sans accès aux données spécifiques extraites de vos "
                "documents de reporting, mon analyse resterait nécessairement générique et moins "
                "pertinente pour votre contexte unique. Je vous recommande de charger vos rapports "
                "annuels, documents de durabilité ou tout autre document contenant des informations "
                "ESG through notre système d'extraction automatisée afin que je puisse vous fournir "
                "une évaluation personnalisée, des recommandations concrètes et un plan d'action "
                "adapté à votre situation spécifique."
            )

# Initialisation du chatbot
esg_chatbot = ESGIntelligentChatbot()

# =============================================================================
# FONCTIONS UTILITAIRES
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

# =============================================================================
# ROUTES API
# =============================================================================

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy", 
        "message": "ESG KPI Extractor API is running",
        "ollama_available": esg_chatbot.ollama_available,
        "ollama_model": esg_chatbot.current_model
    })

@app.route('/api/chatbot-status', methods=['GET'])
def chatbot_status():
    return jsonify({
        "ollama_available": esg_chatbot.ollama_available,
        "current_model": esg_chatbot.current_model,
        "status": "ready"
    })

@app.route('/api/esg-chat', methods=['POST'])
def esg_chat():
    """Endpoint pour le chatbot ESG intelligent avec support des PDF uploadés"""
    try:
        data = request.get_json() or {}
        user_message = data.get('message', '').strip()
        company_name = data.get('company_name', '')
        pdf_data = data.get('pdf_data')  # Données PDF extraites
        
        if not user_message:
            return jsonify({"error": "Message vide"}), 400
        
        print(f"💬 Requête chat reçue: {user_message[:100]}...")
        print(f"🏢 Entreprise: {company_name}")
        print(f"📄 Données PDF: {len(pdf_data) if pdf_data else 0} KPIs")
        
        # Charger les données existantes
        df = load_existing_results()
        
        # Si des données PDF sont fournies, les intégrer
        if pdf_data and isinstance(pdf_data, list):
            temp_df = pd.DataFrame(pdf_data)
            if not temp_df.empty:
                df = pd.concat([df, temp_df], ignore_index=True)
                print(f"📄 Données PDF intégrées: {len(pdf_data)} KPIs")
        
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
        elif pdf_data:
            # Utiliser les données du PDF comme contexte
            company_info = {
                'entreprise': 'Document PDF uploadé',
                'total_kpis': len(pdf_data),
                'domaine_principal': 'Analyse en temps réel'
            }
        
        # Générer la réponse intelligente et détaillée
        print("🧠 Génération de la réponse avec Mistral...")
        ai_response = esg_chatbot.generate_esg_insight(company_data, company_info, user_message)
        
        response_data = {
            "response": ai_response,
            "company": company_name or "PDF Uploadé",
            "ai_used": esg_chatbot.ollama_available,
            "pdf_data_included": pdf_data is not None,
            "timestamp": datetime.now().isoformat()
        }
        
        print(f"✅ Réponse générée avec succès ({len(ai_response)} caractères)")
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Erreur chat ESG: {e}")
        import traceback
        print(f"❌ ERREUR CHAT: {traceback.format_exc()}")
        return jsonify({"error": "Erreur lors du traitement de votre requête"}), 500

# =============================================================================
# ROUTES EXISTANTES (simplifiées pour l'exemple)
# =============================================================================

@app.route('/api/process', methods=['POST'])
def process_pdf_route():
    """Endpoint simplifié pour le traitement PDF"""
    try:
        return jsonify({
            "message": "Fonctionnalité de traitement PDF disponible",
            "status": "success"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/companies', methods=['GET'])
def get_companies():
    """Retourne la liste des entreprises disponibles"""
    try:
        df = load_existing_results()
        companies = df['source_file'].unique().tolist() if not df.empty else []
        return jsonify(companies)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/export/csv', methods=['GET'])
def export_csv():
    """Exporte les données en CSV"""
    try:
        if os.path.exists(OUTPUT_CSV):
            return send_file(OUTPUT_CSV, as_attachment=True)
        else:
            return jsonify({"error": "Aucune donnée à exporter"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/export/excel', methods=['GET'])
def export_excel():
    """Exporte les données en Excel"""
    try:
        if os.path.exists(OUTPUT_EXCEL):
            return send_file(OUTPUT_EXCEL, as_attachment=True)
        else:
            return jsonify({"error": "Aucune donnée à exporter"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# =============================================================================
# DÉMARRAGE DE L'APPLICATION
# =============================================================================

if __name__ == '__main__':
    print("🚀 Démarrage de l'API ESG Analytics avec Chatbot Intelligent...")
    print("=" * 60)
    print("📊 Fonctionnalités ESG Avancées:")
    print("  ✅ Extraction automatique de KPIs ESG")
    print(f"  🤖 Chatbot expert avec Ollama Mistral: {'✅ CONNECTÉ' if esg_chatbot.ollama_available else '⚠️ HORS LIGNE'}")
    print("  📄 Upload de PDF directement dans le chat")
    print("  📈 Benchmarking approfondi entre entreprises")
    print("  💡 Recommandations stratégiques personnalisées")
    print("=" * 60)
    print(f"🔧 Chatbot ESG: {'✅ MODE AVANCÉ (Ollama Mistral)' if esg_chatbot.ollama_available else '⚠️ MODE STANDARD'}")
    print(f"🌐 URL: http://localhost:5001")
    print("=" * 60)
    
    app.run(debug=True, host='0.0.0.0', port=5001)