# 📁 File: scraping/langchain_mistral_scraper.py

from langchain_community.llms import Ollama
from langchain.agents import initialize_agent, AgentType, load_tools

# ✅ Initialize local Mistral LLM via Ollama
llm = Ollama(model="mistral")

# ✅ Load Playwright tool for browsing
tools = load_tools(["playwright-browser"])

# ✅ Initialize LangChain agent with tools and Mistral LLM
agent = initialize_agent(
    tools,
    llm,
    agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
    verbose=True,
)

# ✅ Run scraping task
result = agent.run(
    "Navigate to https://www.ins.tn/en/statistiques and extract Tunisia GDP, National Income, Population, and Inflation from 2018 to 2025 in a clean structured table."
)

print("✅ Scraped data:\n", result)
