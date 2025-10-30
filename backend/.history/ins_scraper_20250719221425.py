# 📁 File: scraping/ins_foreign_trade_scraper.py

import requests

# ==============================
# 🔧 1. API endpoint (à confirmer dans la doc INS)
# ==============================
api_url = "http://dataportal.ins.tn/fr/api/GetData"

# ==============================
# 🔧 2. XML payload exact
# ==============================
xml_payload = """
<QueryMessage SourceId='C_FOREIGNTRADE'>
    <Period From='1.06.2011' To='2.2.2013' Frequency='Y|M'>
    </Period>
    <DataWhere>
        <Dimension Id='RDS_DICT_FT_COUNTRIES'>
            <Element>9999</Element>
        </Dimension>
        <Dimension Id='RDS_DICT_FT_PRODUCTS'>
            <Element>23</Element>
            <Element>24</Element>
        </Dimension>
    </DataWhere>
</QueryMessage>
""".strip()

# ==============================
# 🔧 3. Headers
# ==============================
headers = {
    "Content-Type": "application/xml",
    "Accept": "application/xml"
}

# ==============================
# 🔧 4. Send POST request
# ==============================
try:
    response = requests.post(api_url, data=xml_payload.encode('utf-8'), headers=headers)
    print(f"➡️ Status code: {response.status_code}")

    response.raise_for_status()
    print("✅ Data retrieved successfully.\n")
    print(response.text[:1000])

except Exception as e:
    print(f"❌ Error retrieving data: {e}")
