# 📁 File: scraping/ins_foreign_trade_scraper.py

import requests
import xml.etree.ElementTree as ET

# ==============================
# 🔧 1. API endpoint (adjust if different)
# ==============================
api_url = "http://dataportal.ins.tn/fr/api/GetData"

# ==============================
# 🔧 2. Build XML payload based on your provided example
# ==============================

query = ET.Element("QueryMessage", SourceId="C_FOREIGNTRADE")

# ➡️ Period (update dates for your project needs)
period = ET.SubElement(query, "Period", From="2011", To="2013", Frequency="Y|M")

datawhere = ET.SubElement(query, "DataWhere")

# ➡️ Dimension: Countries
dim_country = ET.SubElement(datawhere, "Dimension", Id="RDS_DICT_FT_COUNTRIES")
ET.SubElement(dim_country, "Element").text = "9999"

# ➡️ Dimension: Products
dim_product = ET.SubElement(datawhere, "Dimension", Id="RDS_DICT_FT_PRODUCTS")
ET.SubElement(dim_product, "Element").text = "23"
ET.SubElement(dim_product, "Element").text = "24"

# ✅ Convert XML tree to string
xml_payload = ET.tostring(query, encoding="utf-8")

# ==============================
# 🔧 3. Set request headers
# ==============================
headers = {
    "Content-Type": "application/xml",
    "Accept": "application/xml"
}

# ==============================
# 🔧 4. Send POST request
# ==============================
try:
    response = requests.post(api_url, data=xml_payload, headers=headers)
    response.raise_for_status()
    print("✅ Data retrieved successfully from INS API.\n")

    # ==============================
    # 🔧 5. Print first 1000 chars to inspect structure
    # ==============================
    print(response.text[:1000])

    # ==============================
    # 🔧 6. Parse XML response (example)
    # ==============================
    root = ET.fromstring(response.content)

    # ➡️ Print all tag-text pairs to understand structure
    for elem in root.iter():
        print(f"{elem.tag}: {elem.text}")

except Exception as e:
    print(f"❌ Error retrieving data: {e}")
