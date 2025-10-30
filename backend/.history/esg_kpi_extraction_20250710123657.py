"""
ESG KPI Extraction Tool - Directory Structure Version
"""

import pdfplumber
import pandas as pd
import os
import re
from fuzzywuzzy import fuzz
from typing import List, Dict, Optional, Tuple
import logging
from datetime import datetime
import sys
import time

# Configuration - Update these to match your structure
BASE_DIR = "Agentic AI for Economic & ESG Data Automation"
REPORTS_DIR = os.path.join(BASE_DIR, "reports")
KPI_CSV_PATH = "esg kpis A+ critical(Sheet1).csv"
OUTPUT_CSV = "esg_kpi_results_with_sectors.csv"
DEBUG_FILE = "extraction_debug.log"
FUZZY_THRESHOLD = 75  # Lowered threshold for better matching
ENCODING = "ISO-8859-1"
CSV_SEPARATOR = ";"

def setup_logging():
    """Configure logging with UTF-8 support"""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s",
        handlers=[
            logging.FileHandler(DEBUG_FILE, encoding='utf-8'),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger(__name__)

logger = setup_logging()

def get_sector_from_path(filepath: str) -> str:
    """Extract sector from nested directory structure"""
    parts = filepath.split(os.sep)
    if len(parts) > 3:  # Expecting structure: BASE/reports/SECTOR/...
        return parts[-2]  # Second to last part is sector
    return "Unknown Sector"

def find_pdf_files() -> List[str]:
    """Find all PDF files in nested directory structure"""
    pdf_files = []
    for root, _, files in os.walk(REPORTS_DIR):
        for file in files:
            if file.lower().endswith('.pdf'):
                full_path = os.path.join(root, file)
                pdf_files.append(full_path)
    return pdf_files

def load_kpi_reference() -> Tuple[List[str], List[str]]:
    """Load KPI reference data with enhanced patterns"""
    try:
        kpi_df = pd.read_csv(
            KPI_CSV_PATH,
            encoding=ENCODING,
            sep=CSV_SEPARATOR,
            on_bad_lines='skip'
        )
        
        if "kpi_name" not in kpi_df.columns:
            raise ValueError("CSV must contain 'kpi_name' column")
            
        kpi_list = kpi_df["kpi_name"].dropna().str.strip().tolist()
        
        # Create alternative patterns for each KPI
        search_patterns = []
        for kpi in kpi_list:
            # Basic pattern - the original KPI
            search_patterns.append(kpi)
            
            # Split at common separators
            parts = re.split(r'[/|\\-–—]', kpi)
            for part in parts:
                clean_part = part.strip()
                if clean_part and len(clean_part) > 3:  # Ignore very short parts
                    search_patterns.append(clean_part)
                    
            # Create acronyms for long KPIs
            if len(kpi.split()) > 2:
                acronym = ''.join([word[0] for word in kpi.split() if word[0].isupper()])
                if acronym:
                    search_patterns.append(acronym)
        
        logger.info(f"Loaded {len(kpi_list)} KPIs and generated {len(search_patterns)} search patterns")
        return kpi_list, list(set(search_patterns))  # Remove duplicates
        
    except Exception as e:
        logger.error(f"Error loading KPI reference: {str(e)}")
        raise

def extract_company_info(filename: str) -> Tuple[str, str]:
    """Extract company and year from filename"""
    basename = os.path.splitext(os.path.basename(filename))[0]
    parts = basename.split('_')
    
    company = parts[0] if parts else "Unknown Company"
    year = next((p for p in parts if p.isdigit() and len(p) == 4), "Unknown Year")
    
    return company, year

def extract_value_unit(line: str) -> Dict[str, str]:
    """Enhanced value extraction with multiple patterns"""
    patterns = [
        r"([-+]?\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*([a-zA-Z%\/°²³]+)?\b",  # Numbers with commas/thousands
        r"\b([A-Z][A-Za-z\s]+):?\s*([-+]?\d[\d,.]*)\b",  # Label: value patterns
        r"\b(\d[\d,.]*\s*[a-zA-Z%\/°²³]+)\b",  # Combined value+unit
        r"([-+]?\d[\d,.]*)\s*(?:to|-)\s*(\d[\d,.]*)\s*([a-zA-Z%\/°²³]+)?"  # Ranges
    ]
    
    for pattern in patterns:
        match = re.search(pattern, line)
        if match:
            value = match.group(1).replace(',', '')
            unit = match.group(2) if len(match.groups()) > 1 and match.group(2) else ""
            return {"value": value, "unit": unit}
    
    return {"value": "", "unit": ""}

def process_pdf_file(filepath: str, kpi_list: List[str], patterns: List[str]) -> List[Dict]:
    """Process a single PDF file with enhanced extraction"""
    results = []
    company, year = extract_company_info(filepath)
    sector = get_sector_from_path(filepath)
    
    try:
        with pdfplumber.open(filepath) as pdf:
            for page_num, page in enumerate(pdf.pages, 1):
                try:
                    text = page.extract_text()
                    if not text or len(text) < 50:  # Skip pages with minimal text
                        continue
                        
                    lines = text.split('\n')
                    for line in lines:
                        line_clean = line.strip()
                        if not line_clean:
                            continue
                            
                        # Try both exact patterns and fuzzy matching
                        for pattern in patterns:
                            if pattern.lower() in line_clean.lower():
                                value_data = extract_value_unit(line_clean)
                                if value_data["value"]:
                                    results.append({
                                        "Company": company,
                                        "Sector": sector,
                                        "Year": year,
                                        "KPI Name": pattern,
                                        "KPI Value": value_data["value"],
                                        "Unit": value_data["unit"],
                                        "Page": page_num,
                                        "Source File": os.path.basename(filepath),
                                        "Match Type": "Exact Pattern",
                                        "Timestamp": datetime.now().isoformat()
                                    })
                                    
                        for kpi in kpi_list:
                            similarity = fuzz.partial_ratio(kpi.lower(), line_clean.lower())
                            if similarity > FUZZY_THRESHOLD:
                                value_data = extract_value_unit(line_clean)
                                if value_data["value"]:
                                    results.append({
                                        "Company": company,
                                        "Sector": sector,
                                        "Year": year,
                                        "KPI Name": kpi,
                                        "KPI Value": value_data["value"],
                                        "Unit": value_data["unit"],
                                        "Page": page_num,
                                        "Source File": os.path.basename(filepath),
                                        "Match Type": f"Fuzzy ({similarity}%)",
                                        "Timestamp": datetime.now().isoformat()
                                    })
                                    
                except Exception as page_error:
                    logger.warning(f"Error processing page {page_num} in {filepath}: {str(page_error)}")
                    continue
                    
    except Exception as e:
        logger.error(f"Failed to process {filepath}: {str(e)}")
        
    return results

def main():
    """Main execution with directory structure support"""
    logger.info("=== ESG KPI Extraction Started ===")
    logger.info(f"Base directory: {BASE_DIR}")
    logger.info(f"Reports directory: {REPORTS_DIR}")
    
    # Verify directory structure
    if not os.path.exists(REPORTS_DIR):
        logger.error(f"Reports directory not found: {REPORTS_DIR}")
        logger.info("Please ensure the directory structure matches:")
        logger.info(f"{BASE_DIR}/")
        logger.info(f"  └── reports/")
        logger.info(f"      └── [Sector folders]/")
        logger.info(f"          └── PDF files")
        sys.exit(1)
        
    # Load KPI data
    try:
        kpi_list, search_patterns = load_kpi_reference()
    except Exception as e:
        logger.critical("Failed to load KPI reference data")
        sys.exit(1)
        
    # Find and process all PDFs
    pdf_files = find_pdf_files()
    if not pdf_files:
        logger.error("No PDF files found in directory structure")
        sys.exit(1)
        
    logger.info(f"Found {len(pdf_files)} PDF files to process")
    
    all_results = []
    for i, pdf_file in enumerate(pdf_files, 1):
        logger.info(f"\nProcessing file {i}/{len(pdf_files)}: {os.path.basename(pdf_file)}")
        sector = get_sector_from_path(pdf_file)
        logger.info(f"Sector: {sector}")
        
        file_results = process_pdf_file(pdf_file, kpi_list, search_patterns)
        all_results.extend(file_results)
        
        if not file_results:
            logger.warning(f"No KPIs found in {os.path.basename(pdf_file)}")
        else:
            logger.info(f"Found {len(file_results)} KPIs in this file")
    
    # Save results
    if all_results:
        df = pd.DataFrame(all_results)
        
        # Reorder columns for better readability
        columns = [
            "Company", "Sector", "Year", "KPI Name", "KPI Value", "Unit",
            "Page", "Match Type", "Source File", "Timestamp"
        ]
        df = df[columns]
        
        df.to_csv(OUTPUT_CSV, index=False, encoding='utf-8-sig')
        logger.info(f"\n✅ Success! Saved {len(df)} KPIs to {OUTPUT_CSV}")
        
        # Show sample of extracted data
        logger.info("\nSample extracted data:")
        logger.info(df.head(3).to_string(index=False))
    else:
        logger.error("\n⚠️ No KPIs extracted from any files. Possible issues:")
        logger.error("1. PDFs might be scanned images (OCR needed)")
        logger.error("2. KPI names don't match content (check debug log)")
        logger.error("3. Text extraction failed (try different PDF library)")
        logger.error(f"See {DEBUG_FILE} for details")
        sys.exit(1)

if __name__ == "__main__":
    main()