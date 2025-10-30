import logging
from langchain_ollama import OllamaLLM
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from playwright.sync_api import sync_playwright

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def scrape_page(url: str, timeout_ms: int = 10000) -> str:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
        content = page.content()
        browser.close()
    return content

def main():
    url = "https://www.ins.tn/en/statistiques"
    llm = OllamaLLM(model="mistral")

    prompt_template = """
You are an expert economic data extractor.

Extract GDP, National Income, Population, and Inflation indicators for Tunisia from 2018 to 2025 from this HTML:

{html_content}

Output a markdown table with columns: Year | GDP | National Income | Population | Inflation.
"""

    prompt = PromptTemplate(input_variables=["html_content"], template=prompt_template)
    chain = LLMChain(llm=llm, prompt=prompt)

    logger.info("Scraping the page...")
    html_content = scrape_page(url, timeout_ms=7000)

    logger.info("Extracting structured data...")
    result = chain.run(html_content=html_content)

    output_file = "tunisia_economic_data.md"
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(result)
    logger.info(f"Extraction complete. Result saved to '{output_file}'")

if __name__ == "__main__":
    main()
