import pdfplumber
import pandas as pd
import os
import re
from fuzzywuzzy import fuzz

# 🗂️ Directories and files
pdf_dir = "reports"
kpi_csv = "esg kpis A+ critical(Sheet1).csv"

# ✅ Load KPI list from CSV
kpi_df = pd.read_csv(kpi_csv, encoding="ISO-8859-1", sep=";", on_bad_lines='skip')
print("✅ Columns in your KPI CSV:", kpi_df.columns.tolist())

# 🔎 Load KPI names
kpi_list = kpi_df["kpi_name"].dropna().tolist()
print("🔎 Sample KPIs loaded:", kpi_list[:5])

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
                
                # 🔍 Debug: check if text is extracted
                if i == 0 and text:
                    print(f"🔎 First page text sample from {filename}:\n", text[:500])
                
                if text:
                    lines = text.split("\n")
                    for line in lines:
                        for kpi in kpi_list:
                            # ✅ Fuzzy matching to handle slight differences in KPI naming
                            if fuzz.partial_ratio(kpi.lower(), line.lower()) > 80:
                                value_match = re.search(r"([\d,.]+)\s*([a-zA-Z%/]+)?", line)
                                if value_match:
                                    value = value_match.group(1).replace(",", "")
                                    unit = value_match.group(2) if value_match.group(2) else ""

                                    data.append({
                                        "Company": company,
                                        "KPI Name": kpi,
                                        "Value": value,
                                        "Unit": unit,
                                        "Year": "",  # Extract from filename if encoded
                                        "Page Number": i + 1
                                    })

# ✅ Save results
df = pd.DataFrame(data)
df.to_csv("kpi_extraction_results_full.csv", index=False)

print("✅ KPI extraction from ESG PDFs completed. Results saved to kpi_extraction_results_full.csv")
