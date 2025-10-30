"""
ESG KPI Extraction Tool - Complete Version
With full KPI extraction and sector/sub-sector handling
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
KPI_CSV = ""
OUTPUT_CSV = "kpi_extraction_results_full.csv"
FUZZY_THRESHOLD = 75
ENCODING = "ISO-8859-1"
CSV_SEPARATOR = ";"

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

def load_kpi_reference():
    """Load KPI reference data from CSV"""
    try:
        kpi_df = pd.read_csv(
            KPI_CSV,
            encoding=ENCODING,
            sep=CSV_SEPARATOR,
            on_bad_lines='skip'
        )
        if "kpi_name" not in kpi_df.columns:
            raise ValueError("CSV must contain 'kpi_name' column")
        return kpi_df["kpi_name"].dropna().str.strip().tolist()
    except Exception as e:
        logger.error(f"Error loading KPI reference: {str(e)}")
        sys.exit(1)

def discover_structure():
    """Discover sector/sub-sector structure"""
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
    """Find all PDFs in the structure"""
    pdf_files = []
    for sector, subsectors in structure.items():
        sector_path = os.path.join(REPORTS_ROOT, sector)
        
        # Sector-level PDFs
        for file in os.listdir(sector_path):
            if file.lower().endswith('.pdf'):
                pdf_files.append((sector, "", os.path.join(sector_path, file)))
        
        # Subsector-level PDFs
        for subsector in subsectors:
            subsector_path = os.path.join(sector_path, subsector)
            for file in os.listdir(subsector_path):
                if file.lower().endswith('.pdf'):
                    pdf_files.append((sector, subsector, os.path.join(subsector_path, file)))
    
    return pdf_files

def extract_metadata(filename, sector, subsector):
    """Extract company and year from filename"""
    basename = os.path.splitext(filename)[0]
    parts = basename.split('_')
    company = parts[0] if parts else "Unknown"
    year = next((p for p in parts if p.isdigit() and len(p) == 4), "Unknown")
    return company, year

def extract_kpi_data(text, kpi_list):
    """Extract KPI matches from text"""
    results = []
    lines = text.split('\n')
    
    for line in lines:
        line_clean = line.strip()
        if not line_clean:
            continue
            
        for kpi in kpi_list:
            # First try exact match
            if kpi.lower() in line_clean.lower():
                value = extract_value(line_clean)
                if value:
                    results.append((kpi, value))
                    continue
                    
            # Then try fuzzy match
            similarity = fuzz.partial_ratio(kpi.lower(), line_clean.lower())
            if similarity > FUZZY_THRESHOLD:
                value = extract_value(line_clean)
                if value:
                    results.append((kpi, value))
    
    return results

def extract_value(line):
    """Extract numeric value from line"""
    patterns = [
        r"([-+]?\d[\d,.]*)\s*([a-zA-Z%\/°²³]+)?\b",  # Standard numbers
        r"\b([A-Z][A-Za-z\s]+):?\s*([-+]?\d[\d,.]*)",  # Label: value
        r"\b(\d[\d,.]*\s*[a-zA-Z%\/°²³]+)\b"  # Combined value+unit
    ]
    
    for pattern in patterns:
        match = re.search(pattern, line)
        if match:
            value = match.group(1).replace(',', '')
            unit = match.group(2) if len(match.groups()) > 1 and match.group(2) else ""
            return f"{value} {unit}".strip()
    return None

def process_pdf(filepath, kpi_list):
    """Process a single PDF file"""
    try:
        with pdfplumber.open(filepath) as pdf:
            text = "\n".join(page.extract_text() or "" for page in pdf.pages)
            return extract_kpi_data(text, kpi_list)
    except Exception as e:
        logger.error(f"Error processing {filepath}: {str(e)}")
        return []

def main():
    logger.info("Starting ESG KPI Extraction")
    
    # Load KPI reference
    kpi_list = load_kpi_reference()
    logger.info(f"Loaded {len(kpi_list)} KPIs from reference")
    
    # Discover structure
    structure = discover_structure()
    if not structure:
        logger.error("Could not discover report structure")
        sys.exit(1)
    
    logger.info(f"Discovered {len(structure)} sectors with sub-sectors")
    
    # Find all PDFs
    pdf_files = find_pdfs(structure)
    if not pdf_files:
        logger.error("No PDF files found")
        sys.exit(1)
    
    logger.info(f"Found {len(pdf_files)} PDF files")
    
    # Process files
    results = []
    for sector, subsector, filepath in pdf_files:
        company, year = extract_metadata(filepath, sector, subsector)
        logger.info(f"Processing: {sector}/{subsector}/{os.path.basename(filepath)}")
        
        kpi_matches = process_pdf(filepath, kpi_list)
        for kpi, value in kpi_matches:
            results.append({
                "Company": company,
                "Year": year,
                "Sector": sector,
                "Sub-Sector": subsector,
                "KPI": kpi,
                "Value": value,
                "Source File": os.path.basename(filepath),
                "Extraction Date": datetime.now().strftime("%Y-%m-%d")
            })
    
    # Save results
    if results:
        df = pd.DataFrame(results)
        df.to_csv(OUTPUT_CSV, index=False, encoding='utf-8-sig')
        logger.info(f"Success! Saved {len(df)} KPI matches to {OUTPUT_CSV}")
        
        # Show sample of extracted data
        logger.info("\nSample extracted KPIs:")
        logger.info(df.head(3).to_string(index=False))
    else:
        logger.warning("No KPIs extracted. Possible issues:")
        logger.warning("- PDFs might be image-based (need OCR)")
        logger.warning("- KPI names don't match content")
        logger.warning("- Check extraction.log for details")

if __name__ == "__main__":
    main()