import requests
from bs4 import BeautifulSoup
import pandas as pd

url = "https://sasb.ifrs.org/company-use/sasb-reporters/"

# ✅ Add headers to avoid 403 Forbidden
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36"
}

response = requests.get(url, headers=headers)
response.raise_for_status()

soup = BeautifulSoup(response.text, "html.parser")

table = soup.find("table")
rows = table.find("tbody").find_all("tr")

data = []

for row in rows:
    cols = row.find_all("td")
    if len(cols) >= 6:
        company_tag = cols[0].find("a")
        company_name = company_tag.text.strip() if company_tag else cols[0].text.strip()
        report_link = company_tag['href'].strip() if company_tag and 'href' in company_tag.attrs else ""

        industry = cols[1].text.strip()
        sector = cols[2].text.strip()
        country = cols[3].text.strip()
        report_type = cols[4].text.strip()
        report_year = cols[5].text.strip()

        data.append({
            "Company": company_name,
            "Industry": industry,
            "Sector": sector,
            "Country": country,
            "Report Type": report_type,
            "Report Year": report_year,
            "Report Link": report_link,
            "Source": "SASB"
        })

df = pd.DataFrame(data)
df.to_csv("sasb_esg_reports_full.csv", index=False)

print("✅ Scraping completed. Data saved to sasb_esg_reports_full.csv")
