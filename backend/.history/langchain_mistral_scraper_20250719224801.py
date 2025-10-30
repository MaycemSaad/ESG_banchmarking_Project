import asyncio
from datetime import datetime
import json
import logging
from pathlib import Path
from typing import Dict, Optional
from langchain_ollama import OllamaLLM
from playwright.async_api import async_playwright

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('economic_data_extraction.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)

class EconomicDataExtractor:
    def __init__(self):
        self.llm = OllamaLLM(
            model="mistral",
            temperature=0.2,
            top_p=0.85,
            num_ctx=4096,
            timeout=300
        )
        self.output_dir = Path("economic_data_output")
        self.output_dir.mkdir(exist_ok=True)
        self.timeout = 60000  # 60 seconds timeout for browser operations
        self.max_retries = 3

    async def scrape_page(self, url: str) -> Optional[str]:
        """Robust page scraping with retry mechanism."""
        retry_count = 0
        browser = None
        
        while retry_count < self.max_retries:
            try:
                async with async_playwright() as p:
                    browser = await p.chromium.launch(
                        headless=True,
                        args=[
                            '--disable-blink-features=AutomationControlled',
                            '--disable-dev-shm-usage',
                            '--no-sandbox'
                        ]
                    )
                    
                    context = await browser.new_context(
                        user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        java_script_enabled=True,
                        viewport={'width': 1920, 'height': 1080}
                    )
                    
                    page = await context.new_page()
                    
                    # Set up page error handling
                    page.on("pageerror", lambda err: logging.error(f"Page error: {err}"))
                    
                    logging.info(f"Attempting to navigate to {url} (attempt {retry_count + 1})")
                    await page.goto(
                        url,
                        timeout=self.timeout,
                        wait_until="networkidle"
                    )
                    
                    # Verify successful load
                    if page.url != url:
                        raise ValueError(f"Redirected to {page.url} instead of target URL")
                    
                    # Wait for critical content
                    await page.wait_for_selector('body', state='attached', timeout=10000)
                    
                    # Extract and clean content
                    content = await page.evaluate("""() => {
                        // Remove unnecessary elements
                        const removals = ['script', 'style', 'iframe', 'nav', 'footer'];
                        removals.forEach(selector => {
                            document.querySelectorAll(selector).forEach(el => el.remove());
                        });
                        return document.body.innerText;
                    }""")
                    
                    await context.close()
                    await browser.close()
                    return content
                    
            except Exception as e:
                retry_count += 1
                logging.error(f"Attempt {retry_count} failed: {str(e)}")
                
                if browser:
                    try:
                        await browser.close()
                    except:
                        pass
                
                if retry_count >= self.max_retries:
                    logging.error(f"Failed to scrape {url} after {self.max_retries} attempts")
                    return None
                
                await asyncio.sleep(2 ** retry_count)  # Exponential backoff

    async def extract_data(self, text_content: str) -> Optional[Dict]:
        """Enhanced data extraction with validation."""
        prompt = """**Economic Data Extraction Task**

Extract the following indicators from the provided content for years 2018-2025:
- GDP (current USD)
- National Income (current USD)
- Population
- Inflation rate (%)

Return ONLY valid JSON with this exact structure:
{
    "source": "Tunisia INS",
    "extracted_at": "YYYY-MM-DD",
    "data": [
        {
            "year": 2018,
            "gdp_usd": "X billion",
            "national_income_usd": "X billion",
            "population": "X",
            "inflation_rate": "X%"
        }
    ]
}

Content:
{content}"""
        
        try:
            # Clean and limit content
            clean_content = ' '.join(text_content.split())[:3000]
            
            # Execute LLM call with timeout
            response = await asyncio.wait_for(
                self.llm.agenerate([prompt.format(content=clean_content)]),
                timeout=300
            )
            
            # Extract JSON from response
            result = response.generations[0][0].text
            json_start = result.find('{')
            json_end = result.rfind('}') + 1
            
            if json_start == -1 or json_end == 0:
                raise ValueError("No JSON found in LLM response")
                
            return json.loads(result[json_start:json_end])
            
        except Exception as e:
            logging.error(f"Data extraction failed: {str(e)}")
            return None

    async def save_results(self, data: Dict) -> bool:
        """Save results with error handling."""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            base_path = self.output_dir / f"tunisia_economic_data_{timestamp}"
            
            # Save JSON
            json_path = f"{base_path}.json"
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            
            logging.info(f"Results saved to {json_path}")
            return True
            
        except Exception as e:
            logging.error(f"Failed to save results: {str(e)}")
            return False

    async def run_pipeline(self) -> bool:
        """Main execution pipeline with comprehensive error handling."""
        try:
            logging.info("Starting economic data extraction pipeline")
            
            # Step 1: Scrape
            url = "https://www.ins.tn/en/statistiques"
            content = await self.scrape_page(url)
            
            if not content:
                logging.error("Pipeline failed at scraping stage")
                return False
                
            # Step 2: Extract
            extracted_data = await self.extract_data(content)
            
            if not extracted_data:
                logging.error("Pipeline failed at data extraction stage")
                return False
                
            # Step 3: Save
            if not await self.save_results(extracted_data):
                logging.error("Pipeline failed at results saving stage")
                return False
                
            return True
            
        except Exception as e:
            logging.error(f"Pipeline execution failed: {str(e)}")
            return False

if __name__ == "__main__":
    async def main():
        extractor = EconomicDataExtractor()
        success = await extractor.run_pipeline()
        if not success:
            logging.error("Economic data extraction completed with errors")
            exit(1)
        logging.info("Economic data extraction completed successfully")
    
    asyncio.run(main())