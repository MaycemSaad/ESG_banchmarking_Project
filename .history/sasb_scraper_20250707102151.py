import requests
from bs4 import BeautifulSoup
import pandas as pd

# ✅ SASB reporters page
url = "https://sasb.ifrs.org/company-use/sasb-reporters/"

# 🟢 1. Send GET request
response = requests.get(url)
response.raise_for_status()

# 🟢 2. Parse HTML content
soup = BeautifulSoup(response.text, "html.parser")

# 🟢 3. Find the table containing companies
table = soup.find("table")

# 🟢 4. Extract table rows
rows = table.find("tbody").find_all("tr")

# 🟢 5. Prepare data list
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

# 🟢 6. Save to CSV
df = pd.DataFrame(data)
df.to_csv("sasb_esg_reports_full.csv", index=False)

print("✅ Scraping completed. Data saved to sasb_esg_reports_full.csv")
