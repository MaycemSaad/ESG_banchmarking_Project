import os
import requests
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import logging
import pandas as pd

from langchain_community.document_loaders import WebBaseLoader, AsyncHtmlLoader
from langchain_community.document_transformers import BeautifulSoupTransformer
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda, RunnablePassthrough
from langchain_community.llms import Ollama
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain.tools import tool
from langchain_community.retrievers import WikipediaRetriever
from langchain_community.utilities import WikipediaAPIWrapper

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("economic_indicators.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Set user agent for requests
os.environ["USER_AGENT"] = "EconomicDataCollector/1.0 (+https://example.com)"

# Initialize LLM (using Ollama - make sure you have it running locally)
llm = Ollama(model="mistral")

class DataSource(Enum):
    WORLD_BANK = "worldbank"
    INS_API = "ins_api"
    INS_SCRAPED = "ins_scraped"
    WIKIPEDIA = "wikipedia"

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

class EconomicDataCollector:
    def __init__(self):
        self.data_sources = {
            DataSource.WORLD_BANK: {
                "base_url": "https://api.worldbank.org/v2/country/tn/indicator",
                "indicators": {
                    "NY.GDP.MKTP.KD": IndicatorMetadata(
                        name="GDP (constant USD)",
                        unit="USD",
                        source=DataSource.WORLD_BANK,
                        description="GDP in constant 2015 US$"
                    ),
                    "NY.GNP.MKTP.CD": IndicatorMetadata(
                        name="GNI (current USD)",
                        unit="USD",
                        source=DataSource.WORLD_BANK,
                        description="Gross National Income in current US$"
                    )
                }
            },
            DataSource.INS_SCRAPED: {
                "base_url": "http://dataportal.ins.tn",
                "pages": {
                    "comptes_nationaux": "/fr/themes/comptes-nationaux",
                    "menages": "/fr/themes/conditions-de-vie-des-menages"
                }
            }
        }
        self.years_range = (2018, datetime.now().year)
        self.wikipedia = WikipediaAPIWrapper()

    @tool
    def get_worldbank_data(self, indicator_code: str) -> List[Dict]:
        """Fetch economic indicator data from World Bank API."""
        metadata = self.data_sources[DataSource.WORLD_BANK]["indicators"].get(indicator_code)
        if not metadata:
            return []
        
        url = f"{self.data_sources[DataSource.WORLD_BANK]['base_url']}/{indicator_code}"
        params = {
            "format": "json",
            "date": f"{self.years_range[0]}:{self.years_range[1]}"
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            return self._process_worldbank_data(data, metadata)
        except Exception as e:
            logger.error(f"Error fetching World Bank data: {e}")
            return []

    def _process_worldbank_data(self, data: Dict, metadata: IndicatorMetadata) -> List[Dict]:
        """Process World Bank API response."""
        results = []
        if len(data) > 1 and isinstance(data[1], list):
            for item in data[1]:
                try:
                    year = int(item["date"])
                    if self.years_range[0] <= year <= self.years_range[1]:
                        value = self._to_float(item.get("value"))
                        if value is not None:
                            results.append({
                                "year": year,
                                "value": value,
                                "indicator": metadata.name,
                                "unit": metadata.unit,
                                "source": metadata.source.value
                            })
                except (KeyError, ValueError) as e:
                    logger.debug(f"Failed to process item: {e}")
        return results

    @tool
    def scrape_ins_data(self, page_name: str) -> List[Dict]:
        """Scrape economic data from INS Tunisia website."""
        if page_name not in self.data_sources[DataSource.INS_SCRAPED]["pages"]:
            return []
            
        url = f"{self.data_sources[DataSource.INS_SCRAPED]['base_url']}{self.data_sources[DataSource.INS_SCRAPED]['pages'][page_name]}"
        
        try:
            loader = AsyncHtmlLoader([url])
            docs = loader.load()
            bs_transformer = BeautifulSoupTransformer()
            docs_transformed = bs_transformer.transform_documents(
                docs, tags_to_extract=["table"]
            )
            
            # Simplified table processing - you'll need to customize this
            data_points = []
            for doc in docs_transformed:
                # Example: Extract first table with year-value pairs
                # You'll need to implement specific parsing logic for your data
                data_points.append({
                    "year": 2023,
                    "value": 1000,
                    "indicator": f"INS Data from {page_name}",
                    "unit": "TND",
                    "source": DataSource.INS_SCRAPED.value
                })
                
            return data_points
        except Exception as e:
            logger.error(f"Error scraping INS data: {e}")
            return []

    @staticmethod
    def _to_float(value: Any) -> Optional[float]:
        """Convert value to float safely."""
        try:
            if isinstance(value, (int, float)):
                return float(value)
            if isinstance(value, str):
                return float(value.replace(',', '').strip())
            return None
        except (ValueError, TypeError):
            return None

    def create_agent(self):
        """Create a LangChain agent with economic data tools."""
        tools = [
            self.get_worldbank_data,
            self.scrape_ins_data
        ]
        
        # Updated prompt template that includes required variables
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert economic data analyst. 
             Use the available tools to gather economic data when needed.
             Always include the 'agent_scratchpad' in your responses.
             
             Available tools:
             {tools}"""),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad")
        ])
        
        agent = create_tool_calling_agent(llm, tools, prompt)
        return AgentExecutor(agent=agent, tools=tools, verbose=True)

    def analyze_data(self, data: List[Dict]) -> str:
        """Use LLM to analyze the collected data."""
        template = """Analyze these economic indicators:
        {data}
        
        Identify key trends and provide insights about:
        - Economic growth patterns
        - Year-over-year changes
        - Potential correlations between indicators
        - Any notable anomalies"""
        
        prompt = ChatPromptTemplate.from_template(template)
        chain = prompt | llm | StrOutputParser()
        
        data_str = "\n".join(
            f"{item['indicator']} ({item['year']}): {item['value']} {item.get('unit', '')}"
            for item in data
        )
        
        return chain.invoke({"data": data_str})

    def save_data(self, data: List[Dict], format: str = "csv") -> str:
        """Save collected data to file."""
        df = pd.DataFrame(data)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"economic_data_{timestamp}.{format}"
        
        if format == "csv":
            df.to_csv(filename, index=False)
        else:
            df.to_excel(filename, index=False)
        
        logger.info(f"Data saved to {filename}")
        return filename

    def run(self):
        """Main execution flow."""
        logger.info("Starting economic data collection...")
        
        try:
            # Create agent for data collection
            agent = self.create_agent()
            
            # Collect data
            result = agent.invoke({
                "input": "Get GDP data for Tunisia from World Bank for the specified years"
            })
            
            # Process and analyze data
            if result and "output" in result:
                data = result["output"]
                analysis = self.analyze_data(data)
                
                # Save results
                filename = self.save_data(data)
                
                logger.info(f"Analysis complete. Data saved to {filename}")
                logger.info(f"Key Analysis:\n{analysis[:500]}...")  # Show first 500 chars
            else:
                logger.warning("No data was collected")
                
        except Exception as e:
            logger.error(f"Error during data collection: {e}")
            raise

if __name__ == "__main__":
    collector = EconomicDataCollector()
    collector.run()