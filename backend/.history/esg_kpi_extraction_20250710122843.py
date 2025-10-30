"""
ESG KPI Extraction Tool
Automated extraction of ESG KPIs from PDF reports using fuzzy matching.
"""

import pdfplumber
import pandas as pd
import os
import re
from fuzzywuzzy import fuzz
from typing import List, Dict, Optional
import logging
from datetime import datetime

# 𝗖𝗼𝗻𝗳𝗶𝗴𝘂𝗿𝗮𝘁𝗶𝗼𝗻 𝗦𝗲𝘁𝘁𝗶𝗻𝗴𝘀
PDF_DIRECTORY = "reports"  # Directory containing ESG reports
KPI_CSV_PATH = "esg_kpis_A+_critical.csv"  # Master KPI reference file
OUTPUT_CSV = "kpi_extraction_results.csv"  # Output file name
FUZZY_MATCH_THRESHOLD = 80  # Minimum similarity score for KPI matching
ENCODING = "ISO-8859-1"  # File encoding
CSV_SEPARATOR = ";"  # CSV delimiter

# 𝗦𝗲𝘁𝘂𝗽 𝗹𝗼𝗴𝗴𝗶𝗻𝗴
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("kpi_extraction.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def load_kpi_reference(file_path: str) -> List[str]:
    """
    Load KPI reference list from CSV file
    
    Args:
        file_path: Path to KPI reference CSV
        
    Returns:
        List of KPI names
        
    Raises:
        FileNotFoundError: If reference file doesn't exist
        pd.errors.EmptyDataError: If file is empty
    """
    try:
        kpi_df = pd.read_csv(
            file_path,
            encoding=ENCODING,
            sep=CSV_SEPARATOR,
            on_bad_lines='skip'
        )
        
        if "kpi_name" not in kpi_df.columns:
            raise ValueError("CSV file must contain 'kpi_name' column")
            
        logger.info(f"✅ Successfully loaded KPI reference with {len(kpi_df)} KPIs")
        logger.debug(f"Sample KPIs: {kpi_df['kpi_name'].head(5).tolist()}")
        
        return kpi_df["kpi_name"].dropna().str.strip().tolist()
        
    except FileNotFoundError:
        logger.error(f"❌ KPI reference file not found: {file_path}")
        raise
    except pd.errors.EmptyDataError:
        logger.error("❌ KPI reference file is empty")
        raise

def extract_company_name(filename: str) -> str:
    """
    Extract company name from filename (format: COMPANY_YYYY_Report.pdf)
    
    Args:
        filename: PDF filename
        
    Returns:
        Extracted company name
    """
    return os.path.splitext(filename)[0].split("_")[0]

def extract_year_from_filename(filename: str) -> Optional[str]:
    """
    Extract year from filename if present (format: COMPANY_YYYY_Report.pdf)
    
    Args:
        filename: PDF filename
        
    Returns:
        Extracted year or None if not found
    """
    match = re.search(r"_(\d{4})_", filename)
    return match.group(1) if match else None

def extract_kpi_value(line: str) -> Dict[str, str]:
    """
    Extract numeric value and unit from text line
    
    Args:
        line: Text line containing potential KPI value
        
    Returns:
        Dictionary with 'value' and 'unit' (empty strings if not found)
    """
    value_match = re.search(
        r"(-?\d[\d,.]+)\s*([a-zA-Z%/°²³]+)?(?:\s|$)",  # Improved regex pattern
        line.strip()
    )
    
    if value_match:
        return {
            "value": value_match.group(1).replace(",", ""),
            "unit": value_match.group(2) if value_match.group(2) else ""
        }
    return {"value": "", "unit": ""}

def process_pdf_report(file_path: str, kpi_list: List[str]) -> List[Dict]:
    """
    Process single PDF report to extract matching KPIs
    
    Args:
        file_path: Path to PDF file
        kpi_list: Reference list of KPIs
        
    Returns:
        List of extracted KPI records
    """
    extracted_data = []
    filename = os.path.basename(file_path)
    company = extract_company_name(filename)
    year = extract_year_from_filename(filename)
    
    try:
        with pdfplumber.open(file_path) as pdf:
            for page_num, page in enumerate(pdf.pages, 1):
                text = page.extract_text()
                
                if not text:
                    continue
                    
                # Debug logging for first page
                if page_num == 1:
                    logger.debug(f"First page sample from {filename}:\n{text[:300]}...")
                
                for line in text.split("\n"):
                    line_processed = line.strip()
                    for kpi in kpi_list:
                        similarity = fuzz.partial_ratio(
                            kpi.lower(),
                            line_processed.lower()
                        )
                        
                        if similarity > FUZZY_MATCH_THRESHOLD:
                            value_data = extract_kpi_value(line_processed)
                            
                            if value_data["value"]:
                                extracted_data.append({
                                    "Company": company,
                                    "Report Year": year,
                                    "KPI Name": kpi,
                                    "KPI Value": value_data["value"],
                                    "Unit": value_data["unit"],
                                    "Source Page": page_num,
                                    "Match Confidence": f"{similarity}%",
                                    "Extraction Timestamp": datetime.now().isoformat(),
                                    "Source File": filename
                                })
                                
                                logger.debug(f"Matched KPI: {kpi} | Value: {value_data['value']} | Page: {page_num}")
                                
    except Exception as e:
        logger.error(f"Error processing {file_path}: {str(e)}")
        
    return extracted_data

def main():
    """Main execution function"""
    logger.info("=== ESG KPI Extraction Process Started ===")
    
    # Load KPI reference data
    try:
        kpi_reference = load_kpi_reference(KPI_CSV_PATH)
    except Exception as e:
        logger.critical("Failed to load KPI reference data. Exiting.")
        return
        
    # Process all PDF reports
    extracted_data = []
    processed_files = 0
    
    for filename in os.listdir(PDF_DIRECTORY):
        if filename.lower().endswith(".pdf"):
            file_path = os.path.join(PDF_DIRECTORY, filename)
            logger.info(f"🔍 Processing file: {filename}")
            
            file_results = process_pdf_report(file_path, kpi_reference)
            extracted_data.extend(file_results)
            processed_files += 1
            
    # Save results
    if extracted_data:
        results_df = pd.DataFrame(extracted_data)
        
        # Reorder columns for better readability
        column_order = [
            "Company", "Report Year", "KPI Name", "KPI Value", "Unit",
            "Match Confidence", "Source Page", "Source File", "Extraction Timestamp"
        ]
        results_df = results_df[column_order]
        
        results_df.to_csv(OUTPUT_CSV, index=False, encoding='utf-8-sig')
        logger.info(f"✅ Successfully processed {processed_files} files")
        logger.info(f"📊 Extracted {len(results_df)} KPI records")
        logger.info(f"💾 Results saved to {OUTPUT_CSV}")
    else:
        logger.warning("⚠️ No KPI data extracted from any files")

if __name__ == "__main__":
    main()