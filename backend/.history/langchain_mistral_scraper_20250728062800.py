import logging
from langchain_ollama import OllamaLLM
from scrapegraphai.tools import ScrapeGraphTool
from langchain.agents import Tool, initialize_agent, AgentType
from langchain.prompts import PromptTemplate

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# 🌍 Target URL
url = "https://www.ins.tn/en/statistiques"

# 🧠 LLM config
llm = OllamaLLM(model="mistral")

# 🧰 Tool: ScrapeGraph with custom extraction prompt
extraction_prompt = PromptTemplate.from_template("""
You are an expert economic data extractor.

From the web page below, extract the following macroeconomic indicators for Tunisia for the years 2018 to 2025:
- GDP
- National Income
- Population
- Inflation

Return the results in a clean markdown table with this format:
Year | GDP | National Income | Population | Inflation

Web page:
{input}
""")

scrapegraph_tool = ScrapeGraphTool(
    name="Tunisia Economic Data Extractor",
    description="Scrapes economic data like GDP and inflation from the INS website.",
    llm=llm,
    prompt=extraction_prompt
)

# 🛠️ Register the tool as a LangChain Tool
tools = [Tool.from_function(
    func=scrapegraph_tool.run,
    name="TunisiaINSExtractor",
    description="Extract economic indicators from Tunisia statistics website"
)]

# 🤖 Agent setup
agent = initialize_agent(
    tools=tools,
    llm=llm,
    agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
    verbose=True
)

# 🚀 Run scraping & extraction
logger.info("🌐 Starting ScrapeGraph extraction with Mistral...")

result = agent.run(f"Extract GDP, National Income, Population and Inflation for Tunisia from {url} and give them in a markdown table for 2018 to 2025.")

# 💾 Save to file
output_file = "tunisia_economic_data_scrapegraph.md"
with open(output_file, "w", encoding="utf-8") as f:
    f.write(result)

logger.info(f"✅ Extraction complete. Saved to '{output_file}'")
