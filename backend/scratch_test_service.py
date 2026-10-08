import asyncio
import os
from dotenv import load_dotenv

load_dotenv('../.env.local')

from services.recommendation_service import RecommendationService

async def test():
    service = RecommendationService()
    try:
        res = await service.get_recommendations("Books to help prepare for a job interview")
        import json
        print(json.dumps(res, indent=2))
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(test())
