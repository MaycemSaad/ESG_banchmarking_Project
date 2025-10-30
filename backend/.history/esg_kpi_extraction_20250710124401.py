"""
ESG KPI Extraction Tool - Auto-Discovery Version
Automatically detects your sector/sub-sector structure
"""

import pdfplumber
import pandas as pd
import os
import re
from fuzzywuzzy import fuzz
import logging
from datetime import datetime
import sys

# Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REPORTS_ROOT = os.path.join(BASE_DIR, "reports")
KPI_CSV = "esg_kpis A+ critical(Sheet1).csv"
OUTPUT_CSV = "kpi_extraction_results_full.csv"
FUZZY_THRESHOLD = 75

def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s",
        handlers=[
            logging.FileHandler("extraction.log", encoding='utf-8'),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger(__name__)

logger = setup_logging()

def discover_structure():
    """Automatically discover sector/sub-sector structure"""
    structure = {}
    try:
        for sector in os.listdir(REPORTS_ROOT):
            sector_path = os.path.join(REPORTS_ROOT, sector)
            if os.path.isdir(sector_path):
                subs = []
                for item in os.listdir(sector_path):
                    item_path = os.path.join(sector_path, item)
                    if os.path.isdir(item_path):
                        subs.append(item)
                structure[sector] = subs
        return structure
    except Exception as e:
        logger.error(f"Error discovering structure: {str(e)}")
        return {}

def find_pdfs(structure):
    """Find all PDFs in the discovered structure"""
    pdf_files = []
    for sector, subsectors in structure.items():
        sector_path = os.path.join(REPORTS_ROOT, sector)
        
        # Check sector level PDFs
        for file in os.listdir(sector_path):
            if file.lower().endswith('.pdf'):
                pdf_files.append((sector, "", os.path.join(sector_path, file)))
        
        # Check subsector level PDFs
        for subsector in subsectors:
            subsector_path = os.path.join(sector_path, subsector)
            for file in os.listdir(subsector_path):
                if file.lower().endswith('.pdf'):
                    pdf_files.append((sector, subsector, os.path.join(subsector_path, file)))
    
    return pdf_files

def extract_metadata(filepath, sector, subsector):
    """Extract company and year from filename"""
    filename = os.path.basename(filepath)
    parts = filename.split('_')
    company = parts[0] if parts else "Unknown"
    year = next((p for p in parts if p.isdigit() and len(p) == 4), "Unknown")
    return company, year

def main():
    logger.info("Starting ESG KPI Extraction")
    
    # Auto-discover structure
    structure = discover_structure()
    if not structure:
        logger.error("Could not discover report structure")
        sys.exit(1)
    
    logger.info(f"Discovered structure: {structure}")
    
    # Find all PDFs
    pdf_files = find_pdfs(structure)
    if not pdf_files:
        logger.error("No PDF files found")
        sys.exit(1)
    
    logger.info(f"Found {len(pdf_files)} PDF files")
    
    # Process files (add your KPI extraction logic here)
    results = []
    for sector, subsector, filepath in pdf_files:
        company, year = extract_metadata(filepath, sector, subsector)
        logger.info(f"Processing: {sector}/{subsector}/{os.path.basename(filepath)}")
        
        # Add your PDF processing and KPI extraction here
        # results.append(...)
    
    # Save results
    if results:
        pd.DataFrame(results).to_csv(OUTPUT_CSV, index=False)
        logger.info(f"Results saved to {OUTPUT_CSV}")
    else:
        logger.warning("No results extracted")

if __name__ == "__main__":
    main()