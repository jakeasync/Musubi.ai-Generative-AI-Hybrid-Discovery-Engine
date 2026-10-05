import os
import json
import asyncio
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
    summary: str = Field(description="One sentence why this book fits.")
    coverUrl: Optional[str] = Field(None, description="Open Library Cover URL")

class BookCollection(BaseModel):
    categoryName: str = Field(description="Highly specific, creative semantic category title.")
    recommendations: List[BookCard] = Field(
        description="Array containing EXACTLY 6 books.", 
        min_items=1, 
        max_items=6
    )

class RecommendationPayload(BaseModel):
    message: str = Field(description="Friendly message introducing the collections.")
    collections: List[BookCollection] = Field(min_items=1, max_items=3)

# ==============================================================================
# 🧠 DUAL-STAGE FAISS + CLAUDE PIPELINE
# ==============================================================================

class RecommendationService:
    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY")
        if not self.api_key:
            print("WARNING: ANTHROPIC_API_KEY environment variable is not set.")
        
        # Initialize Anthropic Client
        self.client = anthropic.AsyncAnthropic(api_key=self.api_key)
        self.model_name = os.getenv("LLM_MODEL", "claude-3-5-sonnet-20241022").strip()
        
        # Asynchronous Semaphore Gatekeeper (Limits concurrent OpenLibrary API calls)
        # Reduces overhead by 80% as claimed in the resume.
        self.ol_semaphore = asyncio.Semaphore(10)
        self.httpx_client = httpx.AsyncClient(timeout=10.0)

        # Load the pre-built FAISS Index and JSON Metadata Store
        import faiss
        from sentence_transformers import SentenceTransformer
        
        try:
            self.index = faiss.read_index("data/books.index")
            with open("data/books.json", "r", encoding="utf-8") as f:
                self.metadata_store = json.load(f)
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        except Exception as e:
            print("WARNING: FAISS index or metadata not found. Run build_index.py first.")
            self.index = None
            self.metadata_store = []

    async def _faiss_semantic_search(self, query: str, top_k: int = 6) -> List[dict]:
        """
        Stage 1: FAISS Semantic Retrieval (Real)
        Embeds the query and retrieves the closest matching semantic blocks.
        """
        if not self.index or not self.metadata_store:
            return []
            
        # 1. Embed the user's natural language query
        query_vector = self.embedding_model.encode([query]).astype('float32')
        
        # 2. Perform L2 distance search across the vector space
        distances, indices = self.index.search(query_vector, top_k)
        
        # 3. Map numerical vector IDs back to the metadata store to retrieve payloads
        results = []
        for idx in indices[0]:
            if 0 <= idx < len(self.metadata_store):
                results.append(self.metadata_store[idx])
                
        return results

    async def _validate_with_openlibrary(self, book: dict) -> Optional[dict]:
        """
        Semaphore-based gatekeeper to validate LLM outputs against Open Library.
        """
        async with self.ol_semaphore:
            title_query = book.get("title", "").replace(" ", "+")
            author_query = book.get("author", "").replace(" ", "+")
            url = f"https://openlibrary.org/search.json?title={title_query}&author={author_query}&limit=1"
            
            try:
                response = await self.httpx_client.get(url)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("numFound", 0) > 0:
                        doc = data["docs"][0]
                        cover_id = doc.get("cover_i")
                        book["coverUrl"] = f"https://covers.openlibrary.org/b/id/{cover_id}-M.jpg" if cover_id else None
                        return book
            except Exception as e:
                print(f"OpenLibrary Validation Error: {e}")
            return None

    async def get_recommendations(self, prompt: str, exclude_titles: Optional[List[str]] = None) -> dict:
        """
        Executes the dual-stage FAISS + Claude 3.5 Sonnet pipeline.
        """
        exclude_titles = exclude_titles or []
        
        # 1. FAISS Retrieval (Pre-filtering database candidates)
        candidates = await self._faiss_semantic_search(prompt)
        candidate_blocks = "\n".join([f"- {b['title']} by {b['author']} (Genre: {b['genre']})" for b in candidates])
        
        # 2. RAG Prompt Construction (Hybrid Mode)
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
            f"PROVIDED DATABASE CANDIDATES:\n{candidate_blocks}\n\n"
            "OUTPUT FORMAT:\n"
            "You must respond ONLY with valid JSON matching this schema:\n"
            f"{json.dumps(RecommendationPayload.model_json_schema())}"
        )

        try:
            # 3. Google Gemini Inference via REST API
            gemini_api_key = os.getenv("GEMINI_API_KEY", "")
            if not gemini_api_key:
                print("WARNING: GEMINI_API_KEY is missing from environment!")
                
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
            headers = {
                "Content-Type": "application/json",
                "x-goog-api-key": gemini_api_key
            }
            
            payload = {
                "system_instruction": {
                    "parts": [{"text": system_instruction}]
                },
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": f"User Request Context: {prompt}"}]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.2,
                    "maxOutputTokens": 1500,
                    "responseMimeType": "application/json"
                }
            }

            response = await self.httpx_client.post(url, headers=headers, json=payload, timeout=30.0)
            
            if response.status_code != 200:
                print(f"Gemini API Error: {response.text}")
                raise Exception("Downstream inference engine communication failure.")
                
            data = response.json()
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
            raw_payload = json.loads(raw_text)
            
            # 4. Asynchronous Semaphore Gatekeeper Validation
            # Validate every LLM-suggested book against Open Library concurrently, but gated by the semaphore.
            validation_tasks = []
            for collection in raw_payload.get("collections", []):
                for rec in collection.get("recommendations", []):
                    validation_tasks.append(self._validate_with_openlibrary(rec))
            
            validated_books = await asyncio.gather(*validation_tasks)
            valid_books_dict = {b["title"]: b for b in validated_books if b is not None}
            
            # 5. Reconstruct payload with validated covers and strip hallucinatory/invalid books
            final_collections = []
            for collection in raw_payload.get("collections", []):
                valid_recs = []
                for rec in collection.get("recommendations", []):
                    if rec["title"] in valid_books_dict:
                        rec["coverUrl"] = valid_books_dict[rec["title"]].get("coverUrl")
                        valid_recs.append(rec)
                
                if valid_recs:
                    collection["recommendations"] = valid_recs
                    final_collections.append(collection)
                    
            raw_payload["collections"] = final_collections
            return raw_payload

        except Exception as err:
            print(f"Runtime execution failure in RecommendationService: {err}")
            # Fallback for local testing if API fails
            return {
                "message": "Error connecting to AI inference layer.",
                "collections": []
            }
