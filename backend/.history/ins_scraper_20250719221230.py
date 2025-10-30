# 📁 File: scraping/ins_foreign_trade_scraper.py

import requests
import xml.etree.ElementTree as ET

# ==============================
# 🔧 1. List of possible API endpoints
# ==============================
api_urls = [
    "http://dataportal.ins.tn/api/GetData",
    "http://dataportal.ins.tn/fr/api/GetData",
    "http://dataportal.ins.tn/en/api/GetData",
    "http://dataportal.ins.tn/api/getdata",
    "http://dataportal.ins.tn/fr/api/getdata"
]

# ==============================
# 🔧 2. Build XML payload
# ==============================

query = ET.Element("QueryMessage", SourceId="C_FOREIGNTRADE")

# ➡️ Period
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
# 🔧 4. Try each URL
# ==============================
for api_url in api_urls:
    try:
        print(f"🔎 Testing URL: {api_url}")
        response = requests.post(api_url, data=xml_payload, headers=headers)
        print(f"➡️ Status code: {response.status_code}")

        if response.status_code == 200:
            print("✅ Data retrieved successfully.\n")
            print(response.text[:1000])  # Print first 1000 chars

            # 🔧 5. Parse XML response
            root = ET.fromstring(response.content)
            for elem in root.iter():
                print(f"{elem.tag}: {elem.text}")
            break  # Exit loop if successful
        else:
            print(f"❌ Failed with status {response.status_code}\n")

    except Exception as e:
        print(f"❌ Error retrieving data from {api_url}: {e}")
