import asyncio
from datetime import datetime
from typing import Dict, List, Optional
import logging
from langchain_community.llms import Ollama
from playwright.async_api import async_playwright
import nest_asyncio

# Apply nest_asyncio for environments with existing event loops (like Jupyter)
nest_asyncio.apply()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('scraping_pipeline.log'),
        logging.StreamHandler()
    ]
)

class TunisiaDataExtractor:
    def __init__(self):
        self.llm = Ollama(
            model="mistral",
            temperature=0.3,  # More deterministic output
            top_p=0.9,
            num_ctx=4096  # Match your context window
        )
        self.timeout = 30000  # 30 seconds timeout for browser operations
        self.max_retries = 3

    async def scrape_page(self, url: str) -> Optional[str]:
        """Asynchronously scrape page content with retry logic and error handling."""
        retry_count = 0
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage'
                ]
            )
            
            context = await browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                viewport={'width': 1920, 'height': 1080}
            )
            
            while retry_count < self.max_retries:
                try:
                    page = await context.new_page()
                    await page.goto(
                        url,
                        timeout=self.timeout,
                        wait_until="networkidle"
                    )
                    
                    # Wait for critical content to load
                    await page.wait_for_selector('body', state='attached')
                    
                    # Extract cleaned content
                    content = await page.content()
                    await browser.close()
                    return content
                    
                except Exception as e:
                    retry_count += 1
                    logging.warning(f"Attempt {retry_count} failed: {str(e)}")
                    if retry_count >= self.max_retries:
                        logging.error(f"Failed to scrape {url} after {self.max_retries} attempts")
                        await browser.close()
                        return None
                    await asyncio.sleep(2 ** retry_count)  # Exponential backoff

    async def extract_economic_data(self, html_content: str) -> Optional[str]:
        """Process scraped content with LLM for structured data extraction."""
        try:
            start_time = datetime.now()
            
            prompt_template = """You are an expert economic data extractor. Extract the following indicators from the provided HTML content:

            Required indicators:
            - GDP (in current USD)
            - National Income
            - Population
            - Inflation rate

            For years: 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025

            Format as a clean markdown table with columns: 
            Year | GDP (USD) | National Income | Population | Inflation Rate (%)

            HTML Content:
            {content}
            """
            
            # Truncate content if needed to fit model context
            max_content_length = 3000  # Conservative estimate
            truncated_content = html_content[:max_content_length] if len(html_content) > max_content_length else html_content
            
            prompt = prompt_template.format(content=truncated_content)
            
            # Stream the response for better performance with large outputs
            response = await self.llm.agenerate([prompt])
            
            processing_time = (datetime.now() - start_time).total_seconds()
            logging.info(f"LLM processing completed in {processing_time:.2f} seconds")
            
            return response.generations[0][0].text
            
        except Exception as e:
            logging.error(f"Data extraction failed: {str(e)}")
            return None

    async def run_pipeline(self):
        """Execute the full scraping and data extraction pipeline."""
        try:
            logging.info("Starting Tunisia economic data extraction pipeline")
            
            # Step 1: Scrape target page
            url = "https://www.ins.tn/en/statistiques"
            html_content = await self.scrape_page(url)
            
            if not html_content:
                raise ValueError("Failed to retrieve page content")
                
            # Step 2: Extract structured data
            extracted_data = await self.extract_economic_data(html_content)
            
            if extracted_data:
                logging.info("✅ Successfully extracted economic data:")
                print(extracted_data)
                return extracted_data
            else:
                raise ValueError("Data extraction returned no results")
                
        except Exception as e:
            logging.error(f"Pipeline execution failed: {str(e)}")
            return None

# Main execution
if __name__ == "__main__":
    extractor = TunisiaDataExtractor()
    asyncio.run(extractor.run_pipeline())