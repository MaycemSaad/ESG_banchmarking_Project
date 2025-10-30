import pdfplumber
import pandas as pd
import os
import re

# 🗂️ Directories and files
pdf_dir = "reports"
kpi_csv = "esg kpis A+ critical(Sheet1).csv"

# ✅ Load KPI list from CSV
kpi_df = pd.read_csv(kpi_csv, encoding="ISO-8859-1", sep=";", on_bad_lines='skip')
print("✅ Columns in your KPI CSV:", kpi_df.columns.tolist())


# 🔄 Replace 'KPI' below with actual column name printed
kpi_list = kpi_df["kpi_name"].dropna().tolist()



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
                    for kpi in kpi_list:
                        # 🕵️ Search for KPI mention (case-insensitive, flexible spacing)
                        pattern = re.compile(rf"{re.escape(kpi)}.*", re.IGNORECASE)
                        matches = pattern.findall(text)
                        for match in matches:
                            # 🔍 Extract numeric value in the same line
                            value_match = re.search(r"([\d,.]+)\s*([a-zA-Z%/]+)?", match)
                            if value_match:
                                value = value_match.group(1).replace(",", "")
                                unit = value_match.group(2) if value_match.group(2) else ""

                                data.append({
                                    "Company": company,
                                    "KPI Name": kpi,
                                    "Value": value,
                                    "Unit": unit,
                                    "Year": "",  # extract from filename if encoded
                                    "Page Number": i + 1
                                })

# ✅ Save results
df = pd.DataFrame(data)
df.to_csv("kpi_extraction_results_full.csv", index=False)

print("✅ KPI extraction from ESG PDFs completed. Results saved to kpi_extraction_results_full.csv")
