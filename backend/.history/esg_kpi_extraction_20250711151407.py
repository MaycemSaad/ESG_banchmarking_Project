import pdfplumber
import pandas as pd
import os
import re
from fuzzywuzzy import fuzz

# 🗂️ Directories and files
pdf_dir = "reports"
kpi_csv = "esg kpis A+ critical(Sheet1).csv"

# ✅ Load KPI list with sector & subsector info
kpi_df = pd.read_csv(kpi_csv, encoding="ISO-8859-1", sep=";", on_bad_lines='skip')
print("✅ Columns in your KPI CSV:", kpi_df.columns.tolist())

# 🔎 Load KPI names and related sectors/subsectors
kpi_info = kpi_df[["kpi_name", "topic", "topic_fr"]].dropna()

# 📝 Initialize data list
data = []

# 🔄 Loop through PDF reports
for filename in os.listdir(pdf_dir):
    if filename.endswith(".pdf"):
        file_path = os.path.join(pdf_dir, filename)
        company = filename.split("_")[0]

        with pdfplumber.open(file_path) as pdf:
            for i, page in enumerate(pdf.pages):
                text = page.extract_text()
                if text:
                    lines = text.split("\n")
                    for line in lines:
                        for idx, row in kpi_info.iterrows():
                            kpi = row["kpi_name"]
                            sector = row["topic"]
                            subsector = row["topic_fr"]

                            # ✅ Fuzzy matching for flexible detection
                            if fuzz.partial_ratio(kpi.lower(), line.lower()) > 80:
                                value_match = re.search(r"([\d,.]+)\s*([a-zA-Z%/]+)?", line)
                                if value_match:
                                    value = value_match.group(1).replace(",", "")
                                    unit = value_match.group(2) if value_match.group(2) else ""

                                    data.append({
                                        "KPI Name": kpi,
                                        "Company": company,
                                        "Value": value,
                                        "Unit": unit,
                                        "Year": "",  # extract from filename if encoded
                                        "Sector": sector,
                                        "Subsector": subsector
                                    })

# ✅ Save results as Excel
df = pd.DataFrame(data)
output_file = "kpi_extraction_results_full.xlsx"

try:
    df.to_excel(output_file, index=False)
    print(f"✅ KPI extraction completed. Results saved to {output_file}")
except PermissionError:
    print(f"❌ Permission denied: Please close '{output_file}' if it's open and re-run.")
