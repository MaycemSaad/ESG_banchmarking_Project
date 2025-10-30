import os
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
import logging
import pandas as pd

from langchain_community.document_loaders import WebBaseLoader, AsyncHtmlLoader
from langchain_community.document_transformers import BeautifulSoupTransformer
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda, RunnablePassthrough
from langchain_community.llms import Ollama  # or any other LLM you prefer
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain.tools import tool
from langchain.retrievers import WikipediaRetriever
from langchain.utilities import WikipediaAPIWrapper

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

# Initialize LLM (using Ollama as example - you can replace with OpenAI, Anthropic, etc.)
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
                        source=DataSource.WORLD_BANK
                    ),
                    # ... other indicators ...
                }
            },
            # ... other data sources ...
        }
        self.years_range = (2018, datetime.now().year)
        self.wikipedia = WikipediaAPIWrapper()

    @tool
    def get_worldbank_data(indicator_code: str) -> List[DataPoint]:
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
            response = requests.get(url, params=params)
            data = response.json()
            return self._process_worldbank_data(data, metadata)
        except Exception as e:
            logger.error(f"Error fetching World Bank data: {e}")
            return []

    @tool
    def scrape_ins_data(page_url: str) -> List[DataPoint]:
        """Scrape economic data from INS Tunisia website."""
        try:
            loader = AsyncHtmlLoader([page_url])
            docs = loader.load()
            bs_transformer = BeautifulSoupTransformer()
            docs_transformed = bs_transformer.transform_documents(
                docs, tags_to_extract=["table"]
            )
            
            # Process tables to extract data points
            data_points = []
            for doc in docs_transformed:
                # Implement table parsing logic here
                pass
                
            return data_points
        except Exception as e:
            logger.error(f"Error scraping INS data: {e}")
            return []

    @tool
    def get_wikipedia_economic_context(query: str) -> str:
        """Get economic context and explanations from Wikipedia."""
        try:
            return self.wikipedia.run(query)
        except Exception as e:
            logger.error(f"Error fetching Wikipedia data: {e}")
            return ""

    def _process_worldbank_data(self, data: Dict, metadata: IndicatorMetadata) -> List[DataPoint]:
        """Process World Bank API response."""
        data_points = []
        if len(data) > 1 and isinstance(data[1], list):
            for item in data[1]:
                try:
                    year = int(item["date"])
                    if self.years_range[0] <= year <= self.years_range[1]:
                        value = self._to_float(item.get("value"))
                        if value is not None:
                            data_points.append(DataPoint(
                                year=year,
                                value=value,
                                metadata=metadata
                            ))
                except (KeyError, ValueError) as e:
                    logger.debug(f"Failed to process item: {e}")
        return data_points

    def _to_float(self, value: Any) -> Optional[float]:
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
            self.scrape_ins_data,
            self.get_wikipedia_economic_context
        ]
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an expert economic data analyst. Use tools to gather data when needed."),
            ("user", "{input}")
        ])
        
        agent = create_tool_calling_agent(llm, tools, prompt)
        return AgentExecutor(agent=agent, tools=tools, verbose=True)

    def analyze_trends(self, data: List[DataPoint]) -> str:
        """Use LLM to analyze trends in the collected data."""
        template = """Analyze these economic indicators and identify key trends:
        {data}
        
        Provide insights about economic growth, inflation, and other important patterns.
        Include comparisons between different indicators where relevant."""
        
        prompt = ChatPromptTemplate.from_template(template)
        chain = prompt | llm | StrOutputParser()
        
        data_str = "\n".join(
            f"{dp.metadata.name} ({dp.year}): {dp.value} {dp.metadata.unit}"
            for dp in data
        )
        
        return chain.invoke({"data": data_str})

    def generate_report(self, analysis: str) -> str:
        """Generate a comprehensive economic report."""
        template = """Based on this economic analysis:
        {analysis}
        
        Write a professional report with:
        1. Executive summary
        2. Key findings
        3. Detailed analysis
        4. Recommendations"""
        
        prompt = ChatPromptTemplate.from_template(template)
        chain = prompt | llm | StrOutputParser()
        return chain.invoke({"analysis": analysis})

    def save_data(self, data: List[DataPoint], format: str = "csv") -> None:
        """Save collected data to file."""
        df_data = [{
            "indicator": dp.metadata.name,
            "year": dp.year,
            "value": dp.value,
            "unit": dp.metadata.unit,
            "source": dp.metadata.source.value
        } for dp in data]
        
        df = pd.DataFrame(df_data)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if format == "csv":
            filename = f"economic_data_{timestamp}.csv"
            df.to_csv(filename, index=False)
        else:
            filename = f"economic_data_{timestamp}.xlsx"
            df.to_excel(filename, index=False)
        
        logger.info(f"Data saved to {filename}")

    def run(self):
        """Main execution flow."""
        logger.info("Starting economic data collection...")
        
        # Create agent for data collection
        agent = self.create_agent()
        
        # Example: Collect GDP data
        gdp_data = agent.invoke({
            "input": "Get GDP data for Tunisia from World Bank for the specified years"
        })
        
        # Example: Scrape additional data
        ins_data = agent.invoke({
            "input": "Scrape household economic data from INS Tunisia website"
        })
        
        # Combine and analyze data
        all_data = gdp_data + ins_data
        analysis = self.analyze_trends(all_data)
        report = self.generate_report(analysis)
        
        # Save results
        self.save_data(all_data)
        with open(f"economic_report_{datetime.now().strftime('%Y%m%d')}.txt", "w") as f:
            f.write(report)
        
        logger.info("Economic data collection and analysis completed.")

if __name__ == "__main__":
    collector = EconomicDataCollector()
    collector.run()