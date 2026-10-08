import os
from dotenv import load_dotenv
load_dotenv('../.env.local')
import httpx
import asyncio

async def test():
    key = os.getenv('GROQ_API_KEY')
    resp = await httpx.AsyncClient().get(
        'https://api.groq.com/openai/v1/models',
        headers={'Authorization': f'Bearer {key}'}
    )
    import json
    data = resp.json()
    for model in data.get('data', []):
        print(model.get('id'))

asyncio.run(test())
