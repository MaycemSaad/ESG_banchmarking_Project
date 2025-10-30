import requests
import json
from datetime import datetime
import pandas as pd
from bs4 import BeautifulSoup
import logging
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import backoff
from ratelimit import limits, sleep_and_retry

# Constants
CACHE_DIR = Path(".cache")
CACHE_DIR.mkdir(exist_ok=True)
REQUEST_TIMEOUT = 20
MAX_THREADS = 5
CALLS_PER_MINUTE = 30

# Configuration logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("economic_indicators.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class DataSource(Enum):
    WORLD_BANK = "worldbank"
    INS_API = "ins_api"
    INS_SCRAPED = "ins_scraped"

@dataclass
class IndicatorMetadata:
    name: str
    unit: str
    source: DataSource
    description: str = ""

@dataclass
class DataPoint:
    year: int
    value: float
    metadata: IndicatorMetadata

class DataCollector:
    def __init__(self):
        self.session = self._create_session()
        self.data_sources = {
            DataSource.WORLD_BANK: {
                "base_url": "https://api.worldbank.org/v2/country/tn/indicator",
                "indicators": {
                    "NY.GDP.MKTP.KD": IndicatorMetadata(
                        name="PIB (constant USD)",
                        unit="USD",
                        source=DataSource.WORLD_BANK,
                        description="GDP in constant USD"
                    ),
                    "NY.GNP.MKTP.CD": IndicatorMetadata(
                        name="RNB (USD courants)",
                        unit="USD",
                        source=DataSource.WORLD_BANK,
                        description="Gross National Income in current USD"
                    ),
                    "NY.GNDY.TOTL.KD": IndicatorMetadata(
                        name="Revenu national disponible",
                        unit="USD",
                        source=DataSource.WORLD_BANK,
                        description="Gross National Disposable Income"
                    ),
                    "FP.CPI.TOTL.ZG": IndicatorMetadata(
                        name="Inflation (%)",
                        unit="%",
                        source=DataSource.WORLD_BANK,
                        description="Inflation, consumer prices (annual %)"
                    ),
                    "SP.POP.TOTL": IndicatorMetadata(
                        name="Population totale",
                        unit="habitants",
                        source=DataSource.WORLD_BANK,
                        description="Total population"
                    ),
                    "NY.GNS.ICTR.ZS": IndicatorMetadata(
                        name="Taux d'épargne brute",
                        unit="%",
                        source=DataSource.WORLD_BANK,
                        description="Gross savings (% of GNI)"
                    )
                }
            },
            DataSource.INS_API: {
                "base_url": "http://dataportal.ins.tn",
                "api_endpoint": "/api/v1/indicators",
                "indicators": {
                    "GDP": IndicatorMetadata(
                        name="Produit Intérieur Brut",
                        unit="TND",
                        source=DataSource.INS_API
                    ),
                    "GNDI": IndicatorMetadata(
                        name="Revenu National Disponible Brut",
                        unit="TND",
                        source=DataSource.INS_API
                    ),
                    "CPI": IndicatorMetadata(
                        name="Indice des Prix à la Consommation",
                        unit="Index",
                        source=DataSource.INS_API
                    ),
                    "POP": IndicatorMetadata(
                        name="Population",
                        unit="habitants",
                        source=DataSource.INS_API
                    ),
                    "HH": IndicatorMetadata(
                        name="Dépenses des Ménages",
                        unit="TND",
                        source=DataSource.INS_API
                    )
                }
            },
            DataSource.INS_SCRAPED: {
                "base_url": "http://dataportal.ins.tn",
                "pages": {
                    "comptes_nationaux": {
                        "path": "/fr/themes/comptes-nationaux",
                        "indicators": [
                            "Revenu disponible",
                            "Amortissements",
                            "Formation brute"
                        ]
                    },
                    "menages": {
                        "path": "/fr/themes/conditions-de-vie-des-menages",
                        "indicators": [
                            "Nombre de ménages",
                            "Taille moyenne"
                        ]
                    }
                }
            }
        }
        
        self.years_range = (2018, datetime.now().year)
        self.cache_enabled = True

    def _create_session(self) -> requests.Session:
        """Create and configure a requests session."""
        session = requests.Session()
        session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json",
            "Accept-Language": "en-US,en;q=0.5"
        })
        return session

    def _get_cache_key(self, source: DataSource, indicator: str = None) -> str:
        """Generate a cache key for requests."""
        key = f"{source.value}"
        if indicator:
            key += f"_{indicator}"
        key += f"_{self.years_range[0]}_{self.years_range[1]}"
        return key

    def _load_from_cache(self, key: str) -> Optional[Any]:
        """Load data from cache if available."""
        if not self.cache_enabled:
            return None
            
        cache_file = CACHE_DIR / f"{key}.json"
        if cache_file.exists():
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError) as e:
                logger.warning(f"Failed to load cache {key}: {e}")
        return None

    def _save_to_cache(self, key: str, data: Any) -> None:
        """Save data to cache."""
        if not self.cache_enabled:
            return
            
        try:
            cache_file = CACHE_DIR / f"{key}.json"
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except (TypeError, IOError) as e:
            logger.warning(f"Failed to save cache {key}: {e}")

    @backoff.on_exception(
        backoff.expo,
        (requests.exceptions.RequestException, requests.exceptions.Timeout),
        max_tries=3,
        jitter=backoff.full_jitter
    )
    @sleep_and_retry
    @limits(calls=CALLS_PER_MINUTE, period=60)
    def _make_request(self, url: str, params: Dict = None) -> requests.Response:
        """Make an HTTP request with retry logic and rate limiting."""
        try:
            response = self.session.get(
                url,
                params=params,
                timeout=REQUEST_TIMEOUT
            )
            response.raise_for_status()
            return response
        except requests.exceptions.HTTPError as e:
            logger.error(f"HTTP Error for {url}: {e}")
            raise
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed for {url}: {e}")
            raise

    @staticmethod
    def _to_float(value: Any) -> Optional[float]:
        """Convert a value to float, return None if fails."""
        try:
            if isinstance(value, (int, float)):
                return float(value)
            if isinstance(value, str):
                return float(value.replace(',', '').strip())
            return None
        except (ValueError, TypeError, AttributeError):
            return None

    def _process_worldbank_data(self, data: List[Dict], metadata: IndicatorMetadata) -> List[DataPoint]:
        """Process World Bank API response data."""
        results = []
        if len(data) > 1 and isinstance(data[1], list):
            for item in data[1]:
                try:
                    year = int(item["date"])
                    if self.years_range[0] <= year <= self.years_range[1]:
                        value = self._to_float(item.get("value"))
                        if value is not None:
                            results.append(DataPoint(
                                year=year,
                                value=value,
                                metadata=metadata
                            ))
                except (KeyError, ValueError) as e:
                    logger.debug(f"Failed to process World Bank item: {e}")
        return results

    def _fetch_worldbank_indicator(self, code: str, metadata: IndicatorMetadata) -> List[DataPoint]:
        """Fetch data for a single World Bank indicator."""
        cache_key = self._get_cache_key(DataSource.WORLD_BANK, code)
        cached_data = self._load_from_cache(cache_key)
        if cached_data:
            logger.debug(f"Using cached data for {metadata.name}")
            return [DataPoint(**item) for item in cached_data]

        url = f"{self.data_sources[DataSource.WORLD_BANK]['base_url']}/{code}"
        params = {
            "format": "json",
            "date": f"{self.years_range[0]}:{self.years_range[1]}"
        }

        try:
            logger.info(f"Fetching World Bank data for {metadata.name}")
            response = self._make_request(url, params=params)
            data = response.json()
            results = self._process_worldbank_data(data, metadata)
            
            if results:
                self._save_to_cache(cache_key, [vars(dp) for dp in results])
                logger.info(f"  -> {metadata.name}: {len(results)} records")
            else:
                logger.warning(f"No valid data found for {metadata.name}")
            
            return results
        except Exception as e:
            logger.error(f"Error fetching World Bank data for {metadata.name}: {e}")
            return []

    def fetch_worldbank_data(self) -> Dict[str, List[DataPoint]]:
        """Fetch all World Bank indicators using multithreading."""
        results = {}
        indicators = self.data_sources[DataSource.WORLD_BANK]["indicators"]
        
        with ThreadPoolExecutor(max_workers=MAX_THREADS) as executor:
            futures = {
                executor.submit(self._fetch_worldbank_indicator, code, metadata): metadata.name
                for code, metadata in indicators.items()
            }
            
            for future in as_completed(futures):
                indicator_name = futures[future]
                try:
                    data_points = future.result()
                    if data_points:
                        results[indicator_name] = data_points
                except Exception as e:
                    logger.error(f"Error processing {indicator_name}: {e}")
        
        return results

    def _fetch_ins_api_data(self) -> Dict[str, List[DataPoint]]:
        """Fetch data from INS API."""
        results = {}
        base_url = self.data_sources[DataSource.INS_API]["base_url"]
        endpoint = self.data_sources[DataSource.INS_API]["api_endpoint"]
        url = f"{base_url}{endpoint}"
        
        try:
            logger.info("Fetching INS API data")
            response = self._make_request(url)
            indicators = response.json()
            
            for indicator in indicators:
                code = indicator.get("code", "")
                if code in self.data_sources[DataSource.INS_API]["indicators"]:
                    metadata = self.data_sources[DataSource.INS_API]["indicators"][code]
                    values = indicator.get("values", [])
                    
                    data_points = []
                    for v in values:
                        try:
                            year = int(v["year"])
                            if self.years_range[0] <= year <= self.years_range[1]:
                                value = self._to_float(v.get("value"))
                                if value is not None:
                                    data_points.append(DataPoint(
                                        year=year,
                                        value=value,
                                        metadata=metadata
                                    ))
                        except (KeyError, ValueError) as e:
                            logger.debug(f"Failed to process INS API item: {e}")
                    
                    if data_points:
                        results[metadata.name] = data_points
            
            logger.info(f"  -> {len(results)} indicators from INS API")
        except Exception as e:
            logger.error(f"Error fetching INS API data: {e}")
        
        return results

    def _scrape_ins_table(self, url: str, indicator_names: List[str]) -> Dict[str, List[DataPoint]]:
        """Scrape data from INS HTML tables."""
        results = {}
        try:
            response = self._make_request(url)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            for table in soup.find_all('table'):
                headers = [th.get_text(strip=True) for th in table.find_all('th')]
                
                for indicator in indicator_names:
                    if any(indicator in header for header in headers):
                        data_points = []
                        rows = table.find_all('tr')[1:]  # Skip header row
                        
                        for row in rows:
                            cells = row.find_all(['th', 'td'])
                            if len(cells) >= 2:
                                year_str = cells[0].get_text(strip=True)
                                value_str = cells[1].get_text(strip=True)
                                
                                try:
                                    year = int(year_str)
                                    if self.years_range[0] <= year <= self.years_range[1]:
                                        value = self._to_float(value_str)
                                        if value is not None:
                                            metadata = IndicatorMetadata(
                                                name=indicator,
                                                unit="TND",  # Default, can be overridden
                                                source=DataSource.INS_SCRAPED,
                                                description=f"Scraped from {url}"
                                            )
                                            data_points.append(DataPoint(
                                                year=year,
                                                value=value,
                                                metadata=metadata
                                            ))
                                except ValueError:
                                    continue
                        
                        if data_points:
                            # Special unit handling for specific indicators
                            if "Nombre de ménages" in indicator:
                                for dp in data_points:
                                    dp.metadata.unit = "milliers"
                            elif "Taille moyenne" in indicator:
                                for dp in data_points:
                                    dp.metadata.unit = "personnes"
                            
                            results[indicator] = data_points
                        break  # Move to next indicator after first match
            
            return results
        except Exception as e:
            logger.error(f"Error scraping INS table from {url}: {e}")
            return {}

    def fetch_ins_data(self) -> Dict[str, List[DataPoint]]:
        """Fetch all INS data (API + scraped)."""
        results = {}
        
        # Fetch API data
        api_data = self._fetch_ins_api_data()
        results.update(api_data)
        
        # Scrape additional data
        base_url = self.data_sources[DataSource.INS_SCRAPED]["base_url"]
        for page_name, page_info in self.data_sources[DataSource.INS_SCRAPED]["pages"].items():
            url = f"{base_url}{page_info['path']}"
            scraped_data = self._scrape_ins_table(url, page_info["indicators"])
            results.update(scraped_data)
        
        logger.info(f"Total INS indicators fetched: {len(results)}")
        return results

    def save_results(self, wb_data: Dict[str, List[DataPoint]], ins_data: Dict[str, List[DataPoint]]):
        """Save results to JSON and CSV files with timestamps."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        json_filename = f"tunisia_economic_indicators_{timestamp}.json"
        csv_filename = f"tunisia_economic_indicators_{timestamp}.csv"
        
        # Prepare final data structure
        final_data = {
            "metadata": {
                "extraction_date": datetime.now().isoformat(),
                "target_years": f"{self.years_range[0]}-{self.years_range[1]}",
                "sources": [source.value for source in DataSource],
                "indicators_count": len(wb_data) + len(ins_data)
            },
            "data": {}
        }
        
        # Combine all data points
        all_data = {**wb_data, **ins_data}
        
        # Convert to serializable format
        for indicator, data_points in all_data.items():
            final_data["data"][indicator] = [
                {
                    "year": dp.year,
                    "value": dp.value,
                    "unit": dp.metadata.unit,
                    "source": dp.metadata.source.value,
                    "description": dp.metadata.description
                }
                for dp in data_points
            ]
        
        # Save JSON
        try:
            with open(json_filename, "w", encoding="utf-8") as f:
                json.dump(final_data, f, indent=2, ensure_ascii=False)
            logger.info(f"Data saved to {json_filename}")
        except IOError as e:
            logger.error(f"Failed to save JSON file: {e}")
            raise
        
        # Save CSV
        try:
            csv_data = []
            for indicator, items in final_data["data"].items():
                for item in items:
                    csv_data.append({
                        "indicator": indicator,
                        "year": item["year"],
                        "value": item["value"],
                        "unit": item["unit"],
                        "source": item["source"],
                        "description": item["description"]
                    })
            
            df = pd.DataFrame(csv_data)
            df.to_csv(csv_filename, index=False)
            logger.info(f"Data saved to {csv_filename}")
            
            # Also save as Excel for better readability
            excel_filename = f"tunisia_economic_indicators_{timestamp}.xlsx"
            df.to_excel(excel_filename, index=False)
            logger.info(f"Data saved to {excel_filename}")
        except Exception as e:
            logger.error(f"Failed to save CSV/Excel file: {e}")
            raise
        
        return final_data

    def run(self) -> Dict[str, Any]:
        """Main execution method."""
        logger.info("Starting economic indicators extraction...")
        start_time = time.time()
        
        try:
            # Fetch data from all sources
            with ThreadPoolExecutor(max_workers=2) as executor:
                wb_future = executor.submit(self.fetch_worldbank_data)
                ins_future = executor.submit(self.fetch_ins_data)
                
                wb_data = wb_future.result()
                ins_data = ins_future.result()
            
            # Save and return results
            results = self.save_results(wb_data, ins_data)
            
            duration = time.time() - start_time
            logger.info(
                f"Extraction completed in {duration:.2f} seconds. "
                f"Total indicators: {results['metadata']['indicators_count']}"
            )
            
            return results
        except Exception as e:
            logger.error(f"Extraction failed: {e}")
            raise

if __name__ == "__main__":
    collector = DataCollector()
    collector.run()