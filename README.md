# 🌿 ESG Benchmarking Platform

## Description générale 

Il s’agit d’une **plateforme d’analyse et de benchmarking ESG (Environnemental, Social et Gouvernance)** permettant d’automatiser la lecture, l’extraction et la comparaison des indicateurs issus de rapports de durabilité d’entreprises.

L’objectif principal est de **réduire le temps d’analyse manuelle** des rapports PDF tout en **améliorant la fiabilité et la richesse des indicateurs ESG collectés**.

---

## Objectifs du projet
- Automatiser le **traitement de rapports ESG non structurés** (PDF, scans, images).  
- Extraire, nettoyer et standardiser les **indicateurs ESG clés**.  
- Mettre en place un **moteur d’analyse et de comparaison** entre entreprises selon leurs performances ESG.  
- Centraliser les résultats dans une **base locale structurée** pour exploitation et visualisation.

---

## Architecture du projet
La plateforme s’articule autour de deux modules principaux :

### 1. **Module d’extraction et de traitement**
- Extraction automatique de texte à partir des **rapports PDF** via `PDFPlumber`.  
- Reconnaissance optique de caractères (OCR) sur images avec `PyTesseract`.  
- Nettoyage, filtrage et normalisation du texte à l’aide de **Regex**.  
- Structuration des données ESG sous format tabulaire.

### 2. **Module d’enrichissement et d’analyse sémantique**
- **Matching sémantique** pour regrouper et harmoniser les indicateurs similaires.  
- **Web scraping** de sources publiques pour compléter les données ESG.  
- Construction d’une base consolidée enrichie de **plus de 30 %** de nouveaux indicateurs.  
- Analyse comparative et génération automatique de synthèses ESG.

---

##  Technologies utilisées
| Catégorie | Outils & Technologies |
|------------|-----------------------|
| Langage principal | Python |
| Extraction de texte | PDFPlumber, PyTesseract |
| Traitement de données | Pandas, Regex, NumPy |
| Web scraping | Requests, BeautifulSoup |
| NLP / Matching sémantique | spaCy, Sentence-BERT |
| Stockage local | CSV, JSON |
| Versioning | Git, GitHub |

---

## Résultats clés
-  Réduction de **60 % du temps d’analyse manuelle**.  
-  Enrichissement automatique de la base de données ESG de **+30 %**.  
-  Mise en place d’un pipeline complet de traitement et d’analyse ESG automatisé.  

---


