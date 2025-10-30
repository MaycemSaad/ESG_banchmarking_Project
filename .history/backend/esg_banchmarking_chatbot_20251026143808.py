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
                
                if (value_id not in seen_values):
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

def process_pdf_for_chat(pdf_path, kpi_embeddings, all_kpis, kpi_df, min_confidence=0.3):
    """Version simplifiée pour le traitement rapide de PDF dans le chat"""
    logger.info(f"Traitement rapide du PDF pour le chat: {os.path.basename(pdf_path)}")
    
    text = extract_text_from_pdf(pdf_path)
    
    if not text or len(text.strip()) < 100:
        logger.warning(f"Peu de texte extrait du PDF pour le chat")
        return []
    
    if not all_kpis or kpi_embeddings is None:
        return []
    
    # Traitement accéléré avec seuil de confiance réduit
    relevant_kpis = find_relevant_kpis(text, kpi_embeddings, all_kpis, threshold=0.3)
    
    results = []
    
    for kpi_name, matches in relevant_kpis.items():
        matches_sorted = sorted(matches, key=lambda x: x['score'], reverse=True)
        
        for match in matches_sorted[:2]:  # Limiter à 2 meilleures correspondances
            sentence = match['sentence']
            values = extract_kpi_values(sentence, kpi_name)
            
            for val in values[:1]:  # Prendre seulement la première valeur
                topic = "Unknown"
                topic_fr = "Inconnu"
                
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
                except Exception as e:
                    print(f"⚠️ Erreur métadonnées KPI: {e}")
                
                result_item = {
                    'kpi_name': kpi_name,
                    'value': val['value'],
                    'unit': val['unit'],
                    'source_file': os.path.basename(pdf_path),
                    'topic': topic,
                    'topic_fr': topic_fr,
                    'confidence': match['score'],
                    'extraction_date': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
                
                results.append(result_item)
    
    filtered_results = filter_results(results, min_confidence)
    logger.info(f"{len(filtered_results)} KPIs extraits pour le chat")
    
    return filtered_results

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
# NOUVELLE ROUTE POUR UPLOAD DE PDF DANS LE CHAT
# =============================================================================

@app.route('/api/chat-upload-pdf', methods=['POST'])
def chat_upload_pdf():
    """Endpoint pour uploader un PDF directement dans le chat"""
    try:
        if 'pdf_file' not in request.files or 'kpi_file' not in request.files:
            return jsonify({"error": "Fichier PDF et fichier KPI requis"}), 400
        
        pdf_file = request.files['pdf_file']
        kpi_file = request.files['kpi_file']
        
        if pdf_file.filename == '' or kpi_file.filename == '':
            return jsonify({"error": "Aucun fichier sélectionné"}), 400
        
        if not (allowed_file(pdf_file.filename) and allowed_file(kpi_file.filename)):
            return jsonify({"error": "Type de fichier non autorisé"}), 400
        
        # Sauvegarder les fichiers temporairement
        pdf_filename = secure_filename(f"chat_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{pdf_file.filename}")
        kpi_filename = secure_filename(f"chat_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{kpi_file.filename}")
        
        pdf_path = os.path.join(app.config['UPLOAD_FOLDER'], pdf_filename)
        kpi_path = os.path.join(app.config['UPLOAD_FOLDER'], kpi_filename)
        
        pdf_file.save(pdf_path)
        kpi_file.save(kpi_path)
        
        print(f"=== UPLOAD PDF CHAT ===")
        print(f"PDF: {pdf_filename}")
        print(f"KPI: {kpi_filename}")
        
        # Charger les KPIs
        try:
            kpi_df, kpi_list, kpi_list_fr, kpi_embeddings, all_kpis = load_kpi_list(kpi_path)
            
            if len(all_kpis) == 0:
                return jsonify({"error": "Aucun KPI trouvé dans le fichier"}), 400
                
        except Exception as e:
            print(f"❌ Erreur chargement fichier KPI: {e}")
            return jsonify({"error": f"Erreur chargement fichier KPI: {str(e)}"}), 400
        
        # Traitement rapide du PDF
        try:
            extracted_kpis = process_pdf_for_chat(pdf_path, kpi_embeddings, all_kpis, kpi_df, min_confidence=0.3)
        except Exception as e:
            print(f"❌ Erreur traitement PDF: {e}")
            return jsonify({"error": f"Erreur traitement PDF: {str(e)}"}), 500
        
        # Nettoyer les fichiers temporaires
        try:
            os.remove(pdf_path)
            os.remove(kpi_path)
        except:
            pass
        
        # Préparer la réponse
        response_data = {
            "success": True,
            "pdf_name": pdf_filename,
            "kpis_extracted": len(extracted_kpis),
            "extracted_data": extracted_kpis,
            "summary": {
                "total_kpis": len(extracted_kpis),
                "high_confidence": len([k for k in extracted_kpis if k.get('confidence', 0) > 0.7]),
                "domains": list(set(k.get('topic_fr', 'Inconnu') for k in extracted_kpis))
            }
        }
        
        print(f"✅ PDF traité pour le chat: {len(extracted_kpis)} KPIs extraits")
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"Erreur upload PDF chat: {e}")
        return jsonify({"error": "Erreur lors du traitement du PDF"}), 500

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