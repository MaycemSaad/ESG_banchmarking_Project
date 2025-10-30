# 📁 File: scraping/langchain_mistral_playwright.py

import logging
from typing import Optional

from langchain_ollama import OllamaLLM
from playwright.sync_api import sync_playwright, Page, Browser

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)


def scrape_page_content(url: str, headless: bool = True) -> Optional[str]:
    """Scrapes the full HTML content of a given URL using Playwright."""
    logger.info(f"Starting browser to scrape URL: {url}")
    try:
        with sync_playwright() as p:
            browser: Browser = p.chromium.launch(headless=headless)
            page: Page = browser.new_page()
            page.goto(url, wait_until="networkidle")
            content = page.content()
            browser.close()
        logger.info("Page content successfully scraped.")
        return content
    except Exception as e:
        logger.error(f"Error during scraping: {e}")
        return None


def extract_economic_data(llm: OllamaLLM, html_content: str) -> str:
    """Use the Mistral model via OllamaLLM to extract structured economic data."""
    prompt = f"""
You are an expert economic data extractor.

Below is the raw HTML content from the Tunisia INS statistics page:

{html_content}

🔎 Extract and tabulate the GDP, National Income, Population, and Inflation indicators for Tunisia for the years 2018 to 2025.

Return the result as a markdown table with these columns:
| Year | GDP | National Income | Population | Inflation |

Ensure data accuracy and clean formatting.
"""
    logger.info("Sending prompt to Mistral LLM for extraction...")
    try:
        response = llm.invoke(prompt)
        logger.info("Extraction completed.")
        return response
    except Exception as e:
        logger.error(f"Error during LLM invocation: {e}")
        return "Extraction failed."


def main():
    TARGET_URL = "https://www.ins.tn/en/statistiques"
    MODEL_NAME = "mistral"

    logger.info(f"Initializing Ollama LLM with model '{MODEL_NAME}'")
    llm = OllamaLLM(model=MODEL_NAME)

    html_content = scrape_page_content(TARGET_URL)
    if html_content is None:
        logger.error("Failed to retrieve page content; aborting extraction.")
        return

    structured_data = extract_economic_data(llm, html_content)
    print("✅ Extracted structured data:\n", structured_data)


if __name__ == "__main__":
    main()
