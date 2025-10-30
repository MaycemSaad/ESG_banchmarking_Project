import requests
import json
from datetime import datetime
import pandas as pd
from bs4 import BeautifulSoup
import logging
from typing import Dict, Any

# Configuration logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

DATA_SOURCES = {
    "worldbank": {
        "base_url": "https://api.worldbank.org/v2/country/tn/indicator",
        "indicators": {
            "NY.GDP.MKTP.KD": "PIB (constant USD)",
            "NY.GNP.MKTP.CD": "RNB (USD courants)",
            "NY.GNDY.TOTL.KD": "Revenu national disponible",
            "FP.CPI.TOTL.ZG": "Inflation (%)",
            "SP.POP.TOTL": "Population totale",
            "NY.GNS.ICTR.ZS": "Taux d'épargne brute"
        }
    },
    "ins": {
        "base_url": "http://dataportal.ins.tn",
        "api_endpoint": "/api/v1/indicators",
        "pages": {
            "comptes_nationaux": "/fr/themes/comptes-nationaux",
            "menages": "/fr/themes/conditions-de-vie-des-menages"
        }
    }
}

YEARS_RANGE = (2018, 2025)

def to_float(value: Any) -> float | None:
    """Convertit une valeur en float, retourne None si échec."""
    try:
        return float(str(value).replace(',', '').strip())
    except (ValueError, TypeError):
        return None

def fetch_worldbank_data() -> Dict[str, Any]:
    """Récupère les données de la Banque Mondiale."""
    results = {}
    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0"})
    logger.info("Récupération des données World Bank")
    for code, name in DATA_SOURCES["worldbank"]["indicators"].items():
        try:
            url = f"{DATA_SOURCES['worldbank']['base_url']}/{code}?format=json&date={YEARS_RANGE[0]}:{YEARS_RANGE[1]}"
            response = session.get(url, timeout=15)
            response.raise_for_status()
            data = response.json()
            if len(data) > 1 and isinstance(data[1], list):
                filtered_data = [
                    {
                        "date": item["date"],
                        "value": to_float(item["value"])
                    }
                    for item in data[1]
                    if item.get("value") is not None and YEARS_RANGE[0] <= int(item["date"]) <= YEARS_RANGE[1]
                ]
                results[name] = filtered_data
                logger.info(f"  -> {name} : {len(filtered_data)} enregistrements récupérés")
            else:
                logger.warning(f"Aucune donnée utile trouvée pour {name}")
        except Exception as e:
            logger.error(f"Erreur Banque Mondiale ({name}): {e}")
    return results

def fetch_ins_data() -> Dict[str, Any]:
    """Récupère les données de l'INS Tunisie via API et scraping."""
    results = {}
    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0"})
    logger.info("Récupération des données INS via API")
    try:
        api_url = f"{DATA_SOURCES['ins']['base_url']}{DATA_SOURCES['ins']['api_endpoint']}"
        response = session.get(api_url, timeout=15)
        response.raise_for_status()
        indicators = response.json()
        for indicator in indicators:
            code = indicator.get("code", "")
            if code in ["GDP", "GNDI", "CPI", "POP", "HH"]:
                values = indicator.get("values", [])
                filtered_values = [
                    {
                        "year": v["year"],
                        "value": to_float(v["value"])
                    }
                    for v in values
                    if YEARS_RANGE[0] <= int(v["year"]) <= YEARS_RANGE[1] and v.get("value") is not None
                ]
                results[indicator["name"]] = {
                    "values": filtered_values,
                    "unit": indicator.get("unit", "")
                }
        logger.info(f"  -> {len(results)} indicateurs API INS récupérés")
    except Exception as e:
        logger.error(f"Erreur API INS: {e}")

    logger.info("Récupération des données INS via scraping")
    results.update(scrape_ins_special_data(session))
    return results

def scrape_ins_special_data(session: requests.Session) -> Dict[str, Any]:
    """Scraping des données spéciales de l'INS."""
    special_data = {}
    try:
        # Comptes nationaux
        url = f"{DATA_SOURCES['ins']['base_url']}{DATA_SOURCES['ins']['pages']['comptes_nationaux']}"
        response = session.get(url, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')

        tables = soup.find_all('table')
        indicators_to_find = ["Revenu disponible", "Amortissements", "Formation brute"]
        for indicator in indicators_to_find:
            for table in tables:
                headers = [th.get_text(strip=True) for th in table.find_all('th')]
                if any(indicator in header for header in headers):
                    data = []
                    rows = table.find_all('tr')[1:]
                    for row in rows:
                        cells = row.find_all(['th', 'td'])
                        if len(cells) >= 2:
                            year = cells[0].get_text(strip=True)
                            value = to_float(cells[1].get_text(strip=True))
                            if year.isdigit() and YEARS_RANGE[0] <= int(year) <= YEARS_RANGE[1] and value is not None:
                                data.append({
                                    "year": year,
                                    "value": value,
                                    "source": f"INS Comptes Nationaux - {indicator}"
                                })
                    if data:
                        special_data[indicator] = {
                            "unit": "TND",
                            "data": data
                        }
                    break  # On ne cherche qu’une fois par indicateur

        # Données ménages
        url = f"{DATA_SOURCES['ins']['base_url']}{DATA_SOURCES['ins']['pages']['menages']}"
        response = session.get(url, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')

        for indicator in ["Nombre de ménages", "Taille moyenne"]:
            for table in soup.find_all('table'):
                if indicator in table.text:
                    data = []
                    rows = table.find_all('tr')[1:]
                    for row in rows:
                        cells = row.find_all(['th', 'td'])
                        if len(cells) >= 2:
                            year = cells[0].get_text(strip=True)
                            value = to_float(cells[1].get_text(strip=True))
                            if year.isdigit() and YEARS_RANGE[0] <= int(year) <= YEARS_RANGE[1] and value is not None:
                                data.append({
                                    "year": year,
                                    "value": value,
                                    "source": f"INS Ménages - {indicator}"
                                })
                    if data:
                        special_data[indicator] = {
                            "unit": "milliers" if "Nombre" in indicator else "personnes",
                            "data": data
                        }
                    break

        logger.info(f"  -> {len(special_data)} indicateurs scrapés INS")
    except Exception as e:
        logger.error(f"Erreur scraping INS: {e}")
    return special_data

def save_results(wb_data: Dict[str, Any], ins_data: Dict[str, Any]) -> Dict[str, Any]:
    """Sauvegarde les résultats dans JSON et CSV."""
    final_data = {
        "metadata": {
            "extraction_date": datetime.now().isoformat(),
            "target_years": f"{YEARS_RANGE[0]}-{YEARS_RANGE[1]}",
            "sources": ["World Bank", "INS Tunisie"]
        },
        "data": {}
    }

    for indicator, values in wb_data.items():
        final_data["data"][indicator] = [
            {
                "year": item["date"],
                "value": item["value"],
                "unit": "",
                "source": "World Bank"
            }
            for item in values if item["value"] is not None
        ]

    for indicator, values in ins_data.items():
        if "data" in values:  # Scrapé
            final_data["data"][indicator] = [
                {
                    "year": item["year"],
                    "value": item["value"],
                    "unit": values["unit"],
                    "source": item["source"]
                }
                for item in values["data"] if item["value"] is not None
            ]
        elif "values" in values:  # API
            final_data["data"][indicator] = [
                {
                    "year": item["year"],
                    "value": item["value"],
                    "unit": values["unit"],
                    "source": "INS API"
                }
                for item in values["values"] if item["value"] is not None
            ]

    with open("tunisia_economic_indicators.json", "w", encoding="utf-8") as f:
        json.dump(final_data, f, indent=2, ensure_ascii=False)

    csv_data = []
    for indicator, items in final_data["data"].items():
        for item in items:
            csv_data.append({
                "indicator": indicator,
                "year": item["year"],
                "value": item["value"],
                "unit": item["unit"],
                "source": item["source"]
            })

    df = pd.DataFrame(csv_data)
    df.to_csv("tunisia_economic_indicators.csv", index=False)
    logger.info("Fichiers JSON et CSV sauvegardés.")

    return final_data

def main():
    logger.info("Démarrage de l'extraction des indicateurs économiques...")
    wb_data = fetch_worldbank_data()
    ins_data = fetch_ins_data()
    results = save_results(wb_data, ins_data)
    logger.info(f"Extraction terminée, indicateurs extraits : {len(results['data'])}")

if __name__ == "__main__":
    main()
