from playwright.sync_api import sync_playwright
import pandas as pd

# 🟢 Initialize Playwright
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    # ✅ Go to SASB reporters page
    page.goto("https://sasb.ifrs.org/company-use/sasb-reporters/")

    # 🟢 Wait for table to load
    page.wait_for_selector("table")

    # 🟢 Extract table rows
    rows = page.query_selector_all("table tbody tr")

    data = []

    for row in rows:
        cols = row.query_selector_all("td")
        if len(cols) >= 6:
            company_tag = cols[0].query_selector("a")
            company_name = company_tag.inner_text().strip() if company_tag else cols[0].inner_text().strip()
            report_link = company_tag.get_attribute("href").strip() if company_tag else ""

            industry = cols[1].inner_text().strip()
            sector = cols[2].inner_text().strip()
            country = cols[3].inner_text().strip()
            report_type = cols[4].inner_text().strip()
            report_year = cols[5].inner_text().strip()

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

    # ✅ Save to CSV
    df = pd.DataFrame(data)
    df.to_csv("sasb_esg_reports_full.csv", index=False)

    print("✅ Scraping completed. Data saved to sasb_esg_reports_full.csv")

    browser.close()
