# 📁 File: scraping/langchain_mistral_playwright.py

from langchain_ollama import OllamaLLM
from playwright.sync_api import sync_playwright

# ✅ Initialize local Mistral model via OllamaLLM
llm = OllamaLLM(model="mistral")

# ✅ Step 1. Scrape page with Playwright
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    # 🔗 Go to target page
    page.goto("https://www.ins.tn/en/statistiques")
    
    # 📝 Extract page text
    page_text = page.content()
    
    browser.close()

# ✅ Step 2. Process scraped text with Mistral LLM for structured extraction
prompt = f"""
You are an economic data extractor.

Here is the HTML content scraped from Tunisia INS statistics page:

{page_text}

🔎 Extract in a structured table the GDP, National Income, Population, and Inflation indicators for Tunisia from 2018 to 2025.

Format as a markdown table with columns: Year | GDP | National Income | Population | Inflation.
"""

result = llm.invoke(prompt)
print("✅ Extracted structured data:\n", result)
