# 📁 File: scraping/ins_foreign_trade_scraper_advanced.py

import requests

# ==============================
# 🔧 1. Liste d’URLs possibles (ajoute d’autres variantes si tu en as)
# ==============================
api_urls = [
    "http://dataportal.ins.tn/api/GetData",
    "http://dataportal.ins.tn/fr/api/GetData",
    "http://dataportal.ins.tn/en/api/GetData",
    "http://dataportal.ins.tn/api/getdata",
    "http://dataportal.ins.tn/fr/api/getdata"
]

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
# 🔧 4. Tester chaque URL en mode avancé
# ==============================
for api_url in api_urls:
    try:
        print(f"\n🔎 Testing URL: {api_url}")

        # ➡️ Send POST request with allow_redirects=True
        response = requests.post(api_url, data=xml_payload.encode('utf-8'), headers=headers, allow_redirects=True)

        print(f"➡️ Status code: {response.status_code}")
        print(f"➡️ Final URL after redirects: {response.url}")

        # ➡️ Print headers to check auth or tokens required
        print("➡️ Response headers:")
        for key, value in response.headers.items():
            print(f"   {key}: {value}")

        # ➡️ Save full response text for debug
        with open("INS_response_debug.xml", "w", encoding="utf-8") as f:
            f.write(response.text)
        print("✅ Response saved to INS_response_debug.xml")

        # ➡️ If status code is 200, print preview and break
        if response.status_code == 200:
            print("✅ Data retrieved successfully.\n")
            print(response.text[:1000])  # Print first 1000 chars
            break
        else:
            print(f"❌ Failed with status {response.status_code}")

    except Exception as e:
        print(f"❌ Error retrieving data from {api_url}: {e}")

print("\n🔴 TEST COMPLETED. Review INS_response_debug.xml for details.")
