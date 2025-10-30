import logging
from langchain_ollama import OllamaLLM
from langchain.prompts import PromptTemplate
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

def scrape_page_text(url: str, timeout_ms: int = 7000) -> str:
    """Scrapes visible text from the page using Playwright."""
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(url, wait_until="networkidle", timeout=timeout_ms)
            text = page.inner_text("body")
            browser.close()
        logger.info("✅ Page text successfully scraped.")
        return text
    except PlaywrightTimeoutError:
        logger.error(f"⏰ Timeout when loading {url}")
        return ""
    except Exception as e:
        logger.error(f"❌ Error scraping {url}: {e}")
        return ""

def extract_data(llm: OllamaLLM, text: str) -> str:
    """Uses LangChain prompt + model to extract structured economic data."""
    prompt_template = """
You are an expert economic data extractor.

Extract GDP, National Income, Population, and Inflation indicators for Tunisia from 2018 to 2025 from this text:

{text}

Output a clean markdown table with columns: Year | GDP | National Income | Population | Inflation.
"""

    prompt = PromptTemplate(input_variables=["text"], template=prompt_template)
    chain = prompt | llm

    logger.info("💡 Sending prompt to LLM...")
    return chain.invoke({"text": text})

def main():
    url = "https://www.ins.tn/en/statistiques"
    llm = OllamaLLM(model="mistral")

    logger.info("🌐 Starting scraping process...")
    page_text = scrape_page_text(url)

    if not page_text.strip():
        logger.error("❌ No page text retrieved. Exiting.")
        return

    logger.info("🔍 Extracting structured data with Mistral...")
    result = extract_data(llm, page_text)

    output_file = "tunisia_economic_data.md"
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(result)

    logger.info(f"✅ Extraction complete. Result saved to '{output_file}'")

if __name__ == "__main__":
    main()
