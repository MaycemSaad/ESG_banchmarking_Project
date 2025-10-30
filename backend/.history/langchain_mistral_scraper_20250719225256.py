import asyncio
from datetime import datetime
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional
from langchain_ollama import OllamaLLM  # Updated import
from playwright.async_api import async_playwright

# Configure robust logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('data_extraction.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)

class EconomicDataExtractor:
    def __init__(self):
        self.llm = OllamaLLM(
            model="mistral",
            temperature=0.2,  # More deterministic output
            top_p=0.85,
            num_ctx=4096,
            timeout=300  # 5 minutes timeout for LLM
        )
        self.output_dir = Path("output")
        self.output_dir.mkdir(exist_ok=True)
        self.timeout = 45000  # 45 seconds timeout for browser

    async def scrape_page(self, url: str) -> Optional[str]:
        """Advanced page scraping with error recovery."""
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    '--single-process',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-dev-shm-usage'
                ]
            )
            
            context = await browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                java_script_enabled=True,
                locale='en-US'
            )
            
            try:
                page = await context.new_page()
                await page.goto(
                    url,
                    timeout=self.timeout,
                    wait_until="domcontentloaded"
                )
                
                # Wait for critical elements to load
                await page.wait_for_selector('body', state='attached', timeout=10000)
                
                # Extract cleaned content
                content = await page.evaluate("""() => {
                    // Remove unnecessary elements
                    document.querySelectorAll('script, style, iframe, nav, footer').forEach(el => el.remove());
                    return document.body.innerText;
                }""")
                
                return content
                
            except Exception as e:
                logging.error(f"Scraping failed: {str(e)}")
                return None
            finally:
                await browser.close()

    async def extract_structured_data(self, text_content: str) -> Optional[Dict]:
        """Optimized data extraction with improved prompt engineering."""
        prompt = """**Task:** Extract economic indicators from the provided content.

**Requirements:**
1. Extract data for years 2018-2025
2. Required indicators:
   - GDP (in current USD)
   - National Income (in current USD)
   - Population (total)
   - Inflation rate (annual %)

**Output Format:** JSON with this structure:
{
    "source": "Tunisia INS Statistics",
    "extracted_at": "YYYY-MM-DD",
    "data": [
        {
            "year": 2018,
            "gdp_usd": "X billion",
            "national_income_usd": "X billion",
            "population": "X",
            "inflation_rate": "X%"
        },
        ...other years
    ]
}

**Content:**
{content}
"""
        
        try:
            # Pre-process content to remove excessive whitespace
            cleaned_content = ' '.join(text_content.split()[:2500])  # Limit tokens
            
            response = await self.llm.agenerate([prompt.format(content=cleaned_content)])
            result = response.generations[0][0].text
            
            # Clean and parse the JSON response
            json_start = result.find('{')
            json_end = result.rfind('}') + 1
            json_str = result[json_start:json_end]
            
            return json.loads(json_str)
            
        except Exception as e:
            logging.error(f"Data extraction failed: {str(e)}")
            return None

    async def save_results(self, data: Dict, format: str = 'all') -> None:
        """Save results in multiple formats."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        base_path = self.output_dir / f"tunisia_economic_data_{timestamp}"
        
        if format in ('json', 'all'):
            with open(f"{base_path}.json", 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        
        if format in ('md', 'all'):
            markdown = self._generate_markdown(data)
            with open(f"{base_path}.md", 'w', encoding='utf-8') as f:
                f.write(markdown)
        
        if format in ('csv', 'all'):
            csv = self._generate_csv(data)
            with open(f"{base_path}.csv", 'w', encoding='utf-8') as f:
                f.write(csv)

    def _generate_markdown(self, data: Dict) -> str:
        """Generate markdown table from extracted data."""
        headers = "| Year | GDP (USD) | National Income | Population | Inflation Rate |\n"
        separator = "|------|-----------|-----------------|------------|----------------|\n"
        rows = []
        
        for entry in data.get('data', []):
            row = f"| {entry['year']} | {entry.get('gdp_usd', 'N/A')} | " \
                  f"{entry.get('national_income_usd', 'N/A')} | " \
                  f"{entry.get('population', 'N/A')} | " \
                  f"{entry.get('inflation_rate', 'N/A')} |"
            rows.append(row)
        
        return headers + separator + '\n'.join(rows)

    def _generate_csv(self, data: Dict) -> str:
        """Generate CSV from extracted data."""
        headers = "Year,GDP (USD),National Income,Population,Inflation Rate\n"
        rows = []
        
        for entry in data.get('data', []):
            row = f"{entry['year']},{entry.get('gdp_usd', 'N/A')}," \
                  f"{entry.get('national_income_usd', 'N/A')}," \
                  f"{entry.get('population', 'N/A')}," \
                  f"{entry.get('inflation_rate', 'N/A')}"
            rows.append(row)
        
        return headers + '\n'.join(rows)

    async def run_pipeline(self):
        """Execute the complete data extraction workflow."""
        logging.info("Starting economic data extraction pipeline")
        
        # Step 1: Scrape target page
        url = "https://www.ins.tn/en/statistiques"
        content = await self.scrape_page(url)
        
        if not content:
            logging.error("Failed to retrieve page content")
            return None
        
        # Step 2: Extract structured data
        extracted_data = await self.extract_structured_data(content)
        
        if extracted_data:
            # Step 3: Save results
            await self.save_results(extracted_data)
            logging.info(f"Successfully saved results to {self.output_dir}/")
            return extracted_data
        
        return None

if __name__ == "__main__":
    extractor = EconomicDataExtractor()
    
    try:
        asyncio.run(extractor.run_pipeline())
    except KeyboardInterrupt:
        logging.info("Pipeline interrupted by user")
    except Exception as e:
        logging.error(f"Fatal error in pipeline: {str(e)}")