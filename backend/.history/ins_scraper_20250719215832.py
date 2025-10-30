# 📁 File: scraping/ins_scraper.py

import requests
import pandas as pd

# ✅ INS API base URL (example structure, adjust based on actual INS endpoint)
API_BASE = "http://dataportal.ins.tn/api/indicator_endpoint"

# 🔧 Example parameters (adjust to match actual API)
params = {
    "indicator": "GDP",       # e.g. GDP indicator code or name
    "year_start": 2018,
    "year_end": 2025,
    "format": "json"
}

# 🔍 Send GET request
try:
    response = requests.get(API_BASE, params=params)
    response.raise_for_status()
    data = response.json()
    print("✅ Data retrieved successfully from INS API.")
except Exception as e:
    print(f"❌ Error retrieving data from INS API: {e}")
    data = []

# 🔎 Process response (adjust keys based on real API response structure)
if data:
    df = pd.json_normalize(data)

    # ✅ Clean column names (example)
    df.columns = df.columns.str.replace(" ", "_").str.lower()

    # ✅ Filter and reformat for your needs
    # For example, keep year, indicator value, unit
    if 'year' in df.columns and 'value' in df.columns:
        df = df[['year', 'value', 'unit']] if 'unit' in df.columns else df[['year', 'value']]
    else:
        print("⚠️ Expected columns 'year' and 'value' not found.")

    # 💾 Save processed data
    output_path = "../data/processed/ins_gdp_2018_2025.csv"
    df.to_csv(output_path, index=False)
    print(f"✅ Processed data saved to {output_path}")
else:
    print("⚠️ No data to process from INS API.")
