import os
import requests
import pandas as pd
from tqdm import tqdm
from urllib.parse import urlparse

# Charger les rapports avec lien non vide
df = pd.read_csv("sasb_esg_reports_full.csv", sep=None, engine='python', encoding='utf-8', on_bad_lines='skip')
df = df[df['Report Link'].notna() & (df['Report Link'].str.strip() != "")]
df = df.head(50)  # ⚠️ Limite à 50 pour démarrer (objectif jour 1)

download_log = []

for i, row in tqdm(df.iterrows(), total=len(df), desc="📥 Downloading reports"):
    company = row['Company'].strip().replace("/", "-")
    sector = row['Sector'].strip().replace("/", "-")
    industry = row['Industry'].strip().replace("/", "-")
    year = str(row['Report Year']).strip()
    url = row['Report Link']

    # Déduire extension (PDF ou HTML)
    file_ext = "pdf" if ".pdf" in url.lower() else "html"
    file_name = f"{company}_{year}.{file_ext}"

    folder_path = os.path.join("reports", sector, industry)
    os.makedirs(folder_path, exist_ok=True)

    file_path = os.path.join(folder_path, file_name)

    try:
        r = requests.get(url, timeout=20)
        if r.status_code == 200:
            with open(file_path, "wb") as f:
                f.write(r.content)
            status = "success"
        else:
            status = f"fail ({r.status_code})"
            file_path = ""
    except Exception as e:
        status = f"fail ({str(e)})"
        file_path = ""

    # Log de téléchargement
    download_log.append({
        "Company": company,
        "Sector": sector,
        "Industry": industry,
        "Report Year": year,
        "Report URL": url,
        "File Name": file_name,
        "File Type": file_ext.upper(),
        "Status": status,
        "Local Path": file_path
    })

# Sauvegarder le log
log_df = pd.DataFrame(download_log)
log_df.to_csv("download_log.csv", index=False)

print("✅ Téléchargement terminé. Log sauvegardé dans download_log.csv.")