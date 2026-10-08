from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import os

try:
    from dotenv import load_dotenv
    # Load .env.local from the parent directory
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env.local"))
except ImportError:
    pass

from services.recommendation_service import RecommendationService

app = FastAPI(
    title="Musubi.ai Discovery API",
    description="High-performance backend routing for AI-powered semantic book recommendations.",
    version="1.0.0"
)

# Initialize the cognitive service layer singleton
recommendation_engine = RecommendationService()

class DiscoveryRequest(BaseModel):
    query: str
    exclude_titles: Optional[List[str]] = []

@app.post("/api/v1/discover")
async def generate_discovery_feed(request: DiscoveryRequest):
    """
    Primary endpoint for the Musubi.ai discovery engine.
    Ingests natural language queries and returns strictly validated recommendation JSON.
    """
    try:
        results = await recommendation_engine.get_recommendations(
            prompt=request.query, 
            exclude_titles=request.exclude_titles
        )
        return {"status": "success", "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
