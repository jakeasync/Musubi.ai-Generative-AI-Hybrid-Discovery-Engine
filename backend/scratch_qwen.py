import os
import json
import asyncio
from dotenv import load_dotenv
import httpx

load_dotenv('../.env.local')

async def test_qwen():
    groq_api_key = os.getenv("GROQ_API_KEY")
    prompt = "lizzie bodern collection her name title nad some of the similar"
    system_instruction = (
        "You are a dual-stage Book Recommendation Engine. You have been provided with a pre-filtered list "
        "of candidate books retrieved via FAISS semantic search from our database.\n\n"
        "YOUR TASK: Construct 1 to 3 thematic shelves (collections) that match the user's intent.\n"
        "1. You should prioritize recommending books from the Provided Database Candidates list (Semantic Matches).\n"
        "2. HYBRID FALLBACK: If the user asks for a highly specific topic, entity, or author (e.g. 'Lizzie Borden') "
        "and there are NO direct matches in the candidates, you MAY recommend real, verified books from your global knowledge for the first shelf.\n"
        "3. You must NEVER hallucinate fake books or authors. All books will be verified against Open Library.\n\n"
        "ORGANIZATION RULES:\n"
        "- Dynamically name your collections to distinguish the relationship (e.g., 'Direct Matches', 'Related Themes', 'Semantic Recommendations', 'More by this Author').\n"
        "- If the query has no direct matches, gracefully fall back to related/semantic recommendations and name the shelf accordingly (e.g., 'Similar True-Crime to Lizzie Borden').\n\n"
        "PROVIDED DATABASE CANDIDATES:\n[]\n\n"
        "OUTPUT FORMAT:\n"
        "You must respond ONLY with valid JSON."
    )
    
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {groq_api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "qwen/qwen3.8-27b",
        "messages": [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": f"User Request Context: {prompt}"}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.2,
        "max_tokens": 800
    }
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=headers, json=payload, timeout=30.0)
        print(resp.status_code)
        print(resp.text)

asyncio.run(test_qwen())
