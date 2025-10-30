import pdfplumber
import pandas as pd
import os
import re
from fuzzywuzzy import fuzz
import pytesseract
from pdf2image import convert_from_path

# ✅ Configure Tesseract path if needed
# pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

# 🗂️ Directories and files
pdf_dir = "reports"
kpi_csv = "esg kpis A+ critical(Sheet1).csv"

# ✅ Load KPI list with sector & subsector info
kpi_df = pd.read_csv(kpi_csv, encoding="ISO-8859-1", sep=";", on_bad_lines='skip')
print("✅ Columns in your KPI CSV:", kpi_df.columns.tolist())

# 🔎 Load KPI names and related sectors/subsectors
kpi_info = kpi_df[["kpi_name", "topic", "topic_fr"]].dropna()

# 🔁 Optional synonyms mapping for KPI variations in reports
kpi_synonyms = {
    "GHG Emissions": ["GHG Emissions", "Greenhouse Gas Emissions", "CO2 Emissions"],
    "Water Usage": ["Water Usage", "Water Consumption", "Water Use"]
    # ➡️ Extend this dict for your KPI list as needed
}

# 📝 Initialize data list
data = []

# 🔄 Loop through PDF reports
for filename in os.listdir(pdf_dir):
    if filename.endswith(".pdf"):
        file_path = os.path.join(pdf_dir, filename)
        company = filename.split("_")[0]
        text_combined = ""

        # ✅ Try text extraction with pdfplumber first
        with pdfplumber.open(file_path) as pdf:
            for i, page in enumerate(pdf.pages):
                text = page.extract_text()
                if text:
                    text_combined += text + "\n"

        # ⚠️ If no text extracted, fallback to OCR
        if not text_combined.strip():
            print(f"⚠️ No text found in {filename} using pdfplumber. Running OCR fallback...")
            images = convert_from_path(file_path)
            for img in images:
                ocr_text = pytesseract.image_to_string(img)
                text_combined += ocr_text + "\n"

        # ✅ Process text line by line
        lines = text_combined.split("\n")
        for line in lines:
            for idx, row in kpi_info.iterrows():
                kpi = row["kpi_name"]
                sector = row["topic"]
                subsector = row["topic_fr"]

                # 🔁 Check synonyms if defined
                synonyms = kpi_synonyms.get(kpi, [kpi])
                for syn in synonyms:
                    similarity = fuzz.partial_ratio(syn.lower(), line.lower())
                    if similarity > 70:
                        value_match = re.search(r"([\d,.]+)\s*([a-zA-Z%/]+)?", line)
                        if value_match:
                            value = value_match.group(1).replace(",", "")
                            unit = value_match.group(2) if value_match.group(2) else ""

                            data.append({
                                "KPI Name": kpi,
                                "Company": company,
                                "Value": value,
                                "Unit": unit,
                                "Year": "",  # Extract from filename if encoded
                                "Sector": sector,
                                "Subsector": subsector,
                                "Matched Synonym": syn,
                                "Line Extracted": line.strip()
                            })
                            print(f"✅ MATCH [{kpi}] with synonym [{syn}] in {filename}: {line.strip()}")

# ✅ Save results as Excel
df = pd.DataFrame(data)
output_file = "kpi_extraction_results_full.xlsx"

try:
    df.to_excel(output_file, index=False)
    print(f"✅ KPI extraction completed. Results saved to {output_file}")
except PermissionError:
    print(f"❌ Permission denied: Please close '{output_file}' if it's open and re-run.")
