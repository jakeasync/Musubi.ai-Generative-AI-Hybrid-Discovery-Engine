import os
import json
from typing import List, Optional
import httpx
import anthropic
from pydantic import BaseModel, Field

# ==============================================================================
# 📋 SYSTEM SCHEMAS (Pydantic Contract Enforcement)
# ==============================================================================

class BookCard(BaseModel):
    title: str = Field(description="The exact title verified against catalog records.")
    author: str = Field(description="The verified author name.")

class BookCollection(BaseModel):
    categoryName: str = Field(description="Highly specific, creative semantic category title.")
    recommendations: List[BookCard] = Field(
        description="Array containing EXACTLY 6 books.", 
        min_items=6, 
        max_items=6
    )

class RecommendationPayload(BaseModel):
    collections: List[BookCollection] = Field(min_items=3, max_items=3)


# ==============================================================================
# 🧠 COGNITIVE INFERENCE LAYER
# ==============================================================================

class RecommendationService:
    def __init__(self):
        # Fallback to local environment variable if client instantiation is missing
        self.api_key = os.getenv("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("CRITICAL: ANTHROPIC_API_KEY environment variable is not set.")
        
        self.client = anthropic.Anthropic(api_key=self.api_key)
        self.model_name = os.getenv("LLM_MODEL", "claude-3-5-sonnet-20241022").strip()

    async def get_recommendations(self, prompt: str, exclude_titles: Optional[List[str]] = None) -> dict:
        """
        Executes a multi-stage cognitive reranking task using Anthropic Claude.
        Forces strict JSON schema compliance via Pydantic schema validation.
        """
        exclude_titles = exclude_titles or []
        
        # Build strict system directives ensuring grounding compliance
        system_instruction = (
            "You are a deterministic re-ranking engine for a validated book catalog.\n"
            "Analyze the user's intent to construct 3 specific, creative book shelves.\n"
            "The first shelf MUST match the intent directly; the other 2 must be tangential.\n\n"
            "CRITICAL CONSTRAINTS:\n"
            "1. You must select EXACTLY 6 books per shelf category.\n"
            "2. Never hallucinate metadata or book pairings outside real publication records.\n"
            "3. If details are unverified, omit the asset entirely from the tool execution."
        )

        if exclude_titles:
            system_instruction += f"\n\nSTRICT EXCLUSIONS: Do not include these titles: {', '.join(exclude_titles)}"

        try:
            # Force tool execution to guarantee layout schema compliance and avoid truncations
            response = self.client.messages.create(
                model=self.model_name,
                max_tokens=1500, # Expanded token limits to support full 3x6 grid strings safely
                temperature=0.0, # Lock sampling distribution variance to completely stop drift on refreshes
                system=system_instruction,
                tools=[{
                    "name": "render_book_discovery_engine",
                    "description": "Output structured data to populate the frontend presentation components.",
                    "input_schema": RecommendationPayload.model_json_schema()
                }],
                tool_choice={"type": "tool", "name": "render_book_discovery_engine"},
                messages=[{"role": "user", "content": f"User Request Context: {prompt}"}]
            )

            # Extract the raw parsed JSON safely from the forced tool input hook
            return response.content.input

        except anthropic.APIError as api_err:
            # Catch transient downstream routing exceptions safely
            print(f"Anthropic SDK API Communication Failure: {api_err}")
            raise Exception("Downstream inference engine communication failure.")
            
        except Exception as err:
            print(f"Runtime execution failure in RecommendationService: {err}")
            raise err
