# 🌿 ESG Benchmarking Platform

## 📌 Overview
The **ESG Benchmarking Platform** is an automated system designed to extract, process, and compare ESG (Environmental, Social, Governance) indicators from corporate sustainability reports.  
Its purpose is to **reduce manual analysis time** and **enhance the accuracy and consistency** of collected ESG metrics.

---

## 🎯 Project Objectives
- Automate the processing of **unstructured ESG reports** (PDFs, scans, images).  
- Extract, clean, and standardize **key ESG indicators**.  
- Build an **analysis & benchmarking engine** for company-level ESG comparison.  
- Centralize results into a **structured local database**.

---

## 🏗️ Project Architecture

### 1️⃣ Extraction & Processing Module
- Automated text extraction from PDF reports using **PDFPlumber**.  
- OCR on scanned pages/images with **PyTesseract**.  
- Text cleaning, filtering, and normalization using **Regex**.  
- Structuring ESG data into tabular format.

### 2️⃣ Semantic Enrichment & Analysis Module
- **Semantic matching** to group similar ESG indicators.  
- **Web scraping** of public sources to enrich ESG datasets.  
- Consolidation of a unified database with **30% additional indicators**.  
- Automatic generation of comparative ESG summaries.

---

## 🧰 Technologies Used

| Category | Tools & Technologies |
|----------|----------------------|
| Main Language | Python |
| Text Extraction | PDFPlumber, PyTesseract |
| Data Processing | Pandas, Regex, NumPy |
| Web Scraping | Requests, BeautifulSoup |
| NLP | spaCy, Sentence-BERT |
| Storage | CSV, JSON |
| Version Control | Git, GitHub |

---

## 📊 Key Results
- ⏱️ **60% reduction** in manual ESG report analysis time.  
- 📈 ESG database enriched by **+30% additional indicators**.  
- 🔄 End-to-end automated ESG processing and benchmarking pipeline.

---

