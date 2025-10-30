# 📁 File: tests/ollama_mistral_test.py

from langchain_community.llms import Ollama

# ✅ Initialize local Mistral model
llm = Ollama(model="mistral")

prompt = "Give me a short structured table of Tunisia GDP growth rates from 2018 to 2023 (mock data)."

response = llm.invoke(prompt)
print("✅ Mistral response:\n", response)
