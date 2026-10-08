import os
from dotenv import load_dotenv
load_dotenv('../.env.local')
import httpx
import asyncio

async def test():
    key = os.getenv('GROQ_API_KEY')
    print("Key loaded:", key is not None)
    
    resp = await httpx.AsyncClient().post(
        'https://api.groq.com/openai/v1/chat/completions',
        headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
        json={
            'model': 'llama-3.1-8b-instant',
            'messages': [{'role': 'system', 'content': 'You are a helpful assistant.'}, {'role': 'user', 'content': 'Give me a JSON object with key "status" and value "ok"'}],
            'response_format': {'type': 'json_object'}
        }
    )
    print("Status:", resp.status_code)
    print("Text:", resp.text)

asyncio.run(test())
