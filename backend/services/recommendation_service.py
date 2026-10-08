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
    summary: str = Field(description="Fallback AI synopsis.")
    coreIdea: str = Field(description="Core idea of the book.")
    whyItMatches: str = Field(description="Why this book matches the query.")
    aiAnalysis: str = Field(description="AI analysis tags/details.")
    coverUrl: Optional[str] = Field(None, description="Open Library Cover URL")
    openLibraryKey: Optional[str] = Field(None, description="Open Library Key")
    firstPublishYear: Optional[str] = Field(None, description="First Publish Year")

class BookCollection(BaseModel):
    categoryName: str = Field(description="Highly specific, creative semantic category title.")
    recommendations: List[BookCard] = Field(
        description="Books selected from the verified candidate pool.", 
        min_length=1, 
        max_length=6
    )

class RecommendationPayload(BaseModel):
    message: str = Field(description="Friendly message introducing the collections.")
    collections: List[BookCollection] = Field(min_length=0, max_length=3)

# LLM-specific schemas for intermediate validation
class LLMBookCard(BaseModel):
    id: str = Field(description="The exact candidate ID from the provided list.")
    summary: str = Field(description="Max 40 words fallback synopsis.")
    coreIdea: str = Field(description="Max 30 words core idea of the book.")
    whyItMatches: str = Field(description="Max 30 words explaining why it fits the query.")
    aiAnalysis: str = Field(description="Max 50 words analysis and tags (e.g. ★ Strong match • Practical).")

class LLMBookCollection(BaseModel):
    categoryName: str = Field(description="Category title.")
    recommendations: List[LLMBookCard] = Field(min_length=1, max_length=6)

class LLMRecommendationPayload(BaseModel):
    message: str = Field(description="Friendly message introducing the collections.")
    collections: List[LLMBookCollection] = Field(min_length=0, max_length=3)

# ==============================================================================
# 🧠 RE-ARCHITECTED PIPELINE: FAISS -> OL -> LLM
# ==============================================================================

class RecommendationService:
    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY")
        if not self.api_key:
            print("WARNING: ANTHROPIC_API_KEY environment variable is not set.")
        
        # Initialize Anthropic Client
        self.client = anthropic.AsyncAnthropic(api_key=self.api_key)
        
        # Asynchronous Semaphore Gatekeeper (Limits concurrent OpenLibrary API calls)
        self.ol_semaphore = asyncio.Semaphore(10)
        self.httpx_client = httpx.AsyncClient(timeout=10.0)

        # Load the pre-built FAISS Index and JSON Metadata Store
        import faiss
        import numpy as np
        from google import genai
        
        try:
            self.index = faiss.read_index("data/books.index")
            with open("data/books.json", "r", encoding="utf-8") as f:
                self.metadata_store = json.load(f)
            self.genai_client = genai.Client()
        except Exception as e:
            print("WARNING: FAISS index or metadata not found. Run build_index.py first.")
            self.index = None
            self.metadata_store = []
            self.genai_client = None

    async def _faiss_semantic_search(self, query: str, top_k: int = 6) -> List[dict]:
        """
        Stage 1: FAISS Semantic Retrieval (Real)
        Embeds the query using Gemini and retrieves the closest matching semantic blocks.
        """
        import numpy as np
        if not self.index or not self.metadata_store or not self.genai_client:
            return []
            
        response = await asyncio.to_thread(
            self.genai_client.models.embed_content,
            model="gemini-embedding-2",
            contents=query
        )
        
        query_vector = np.array([response.embeddings[0].values], dtype='float32')
        
        distances, indices = self.index.search(query_vector, top_k)
        
        results = []
        for idx in indices[0]:
            if 0 <= idx < len(self.metadata_store):
                results.append(self.metadata_store[idx])
                
        return results

    async def _fetch_ol_candidates(self, queries: List[str]) -> dict:
        """
        Stage 2: Retrieve metadata for candidate books before LLM inference.
        """
        verified_pool = {}
        
        async def fetch(q: str):
            async with self.ol_semaphore:
                import urllib.parse
                url = f"https://openlibrary.org/search.json?q={urllib.parse.quote(q)}&limit=5"
                try:
                    resp = await self.httpx_client.get(url)
                    if resp.status_code == 200:
                        data = resp.json()
                        docs = data.get("docs", [])
                        for doc in docs:
                            # Must have cover, title, and author to be a valid candidate
                            if doc.get("cover_i") and doc.get("title") and doc.get("author_name"):
                                key = doc["key"]
                                verified_pool[key] = {
                                    "id": key,
                                    "title": doc["title"],
                                    "author": doc["author_name"][0],
                                    "coverUrl": f"https://covers.openlibrary.org/b/id/{doc['cover_i']}-L.jpg",
                                    "openLibraryKey": key,
                                    "firstPublishYear": str(doc.get("first_publish_year", ""))
                                }
                except Exception as e:
                    print(f"OpenLibrary Validation Error for query '{q}': {e}")

        await asyncio.gather(*(fetch(q) for q in queries))
        return verified_pool

    async def get_recommendations(self, prompt: str, exclude_titles: Optional[List[str]] = None) -> dict:
        """
        Executes the re-architected pipeline: FAISS -> Open Library -> Qwen/LLM
        """
        exclude_titles = exclude_titles or []
        groq_api_key = os.getenv("GROQ_API_KEY", "")
        model_name = os.getenv("LLM_MODEL", "qwen/qwen3.8-27b").strip()
        headers = {
            "Authorization": f"Bearer {groq_api_key}",
            "Content-Type": "application/json"
        }
        
        # 1. FAISS Retrieval (Semantic query)
        faiss_candidates = await self._faiss_semantic_search(prompt)
        
        # 2. Extract precise search keywords using Groq for OpenLibrary
        search_queries = [prompt]
        if groq_api_key:
            try:
                extract_prompt = (
                    "Extract 1 to 3 highly effective search keywords/phrases from this query for a book database. "
                    "Omit conversational filler like 'books about', 'recommend', 'help me'. "
                    "Return ONLY a JSON array of strings, e.g. [\"self confidence\", \"interview preparation\"].\n"
                    f"Query: {prompt}"
                )
                payload = {
                    "model": model_name,
                    "messages": [{"role": "user", "content": extract_prompt}],
                    "temperature": 0.1,
                    "max_tokens": 100
                }
                res = await self.httpx_client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload, timeout=10.0)
                if res.status_code == 200:
                    content = res.json()["choices"][0]["message"]["content"]
                    import re
                    match = re.search(r'\[.*\]', content, re.DOTALL)
                    if match:
                        queries = json.loads(match.group(0))
                        search_queries.extend([str(q) for q in queries])
            except Exception as e:
                print(f"Keyword extraction failed: {e}")
        
        # 3. Open Library API Search + verify books
        # We query OL for the extracted keywords, plus the titles from FAISS
        for b in faiss_candidates:
            search_queries.append(f"{b['title']} {b['author']}")
            
        verified_books = await self._fetch_ol_candidates(search_queries)
        
        if not verified_books:
            return {
                "message": "I couldn't find any verified books matching your query in the Open Library database.",
                "collections": []
            }
            
        candidate_blocks = json.dumps(list(verified_books.values()), indent=2)
        
        # 3. LLM Prompt Construction
        system_instruction = (
            "You are a Book Recommendation Engine.\n"
            "YOUR TASK: Construct 1 to 3 thematic shelves (collections) that match the user's intent.\n"
            "1. You may ONLY select books from the provided VERIFIED OPEN LIBRARY CANDIDATES list.\n"
            "2. If the database candidates are irrelevant, you MUST NOT invent or recommend books from your own knowledge. Only use books supplied in the VERIFIED OPEN LIBRARY CANDIDATES.\n"
            "3. Do not create titles. Do not create authors. Do not create IDs. Do not modify book metadata.\n"
            "4. You may only provide the candidate ID, a fallback summary (max 40 words), core idea (max 30 words), why it matches (max 30 words), and an analysis (max 50 words).\n\n"
            "ORGANIZATION RULES:\n"
            "- Dynamically name your collections to distinguish the relationship (e.g., 'Essential Reads', 'Related Themes').\n\n"
            f"VERIFIED OPEN LIBRARY CANDIDATES:\n{candidate_blocks}\n\n"
            "OUTPUT FORMAT:\n"
            "You must respond ONLY with valid JSON matching this exact structure:\n"
            "{\n"
            "  \"message\": \"Friendly message introducing the collections.\",\n"
            "  \"collections\": [\n"
            "    {\n"
            "      \"categoryName\": \"Name of the category\",\n"
            "      \"recommendations\": [\n"
            "        {\n"
            "          \"id\": \"Candidate ID (e.g. /works/OL12345W)\",\n"
            "          \"summary\": \"Fallback synopsis.\",\n"
            "          \"coreIdea\": \"Core idea of the book.\",\n"
            "          \"whyItMatches\": \"Why this book fits.\",\n"
            "          \"aiAnalysis\": \"Analysis and tags (e.g. ★ Strong match • Practical).\"\n"
            "        }\n"
            "      ]\n"
            "    }\n"
            "  ]\n"
            "}"
        )

        try:
            # 4. LLM Inference via Groq REST API
            if not groq_api_key:
                print("WARNING: GROQ_API_KEY is missing from environment!")
                
            url = "https://api.groq.com/openai/v1/chat/completions"
            max_tokens = int(os.getenv("LLM_MAX_TOKENS", "800").strip())
            
            payload = {
                "model": model_name,
                "messages": [
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": f"User Request Context: {prompt}"}
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.2,
                "max_tokens": max_tokens
            }

            response = await self.httpx_client.post(url, headers=headers, json=payload, timeout=30.0)
            
            if response.status_code != 200:
                print(f"Groq API Error: {response.text}")
                raise Exception("Downstream inference engine communication failure.")
                
            data = response.json()
            raw_text = data["choices"][0]["message"]["content"]
            raw_payload = json.loads(raw_text)
            
            # 5. Pydantic Validation of LLM Output
            validated_payload = LLMRecommendationPayload.model_validate(raw_payload)
            
            # 6. Construct Final Backend Metadata
            final_collections = []
            for collection in validated_payload.collections:
                recs = []
                for rec in collection.recommendations:
                    # Map the LLM's chosen ID back to the verified book data
                    if rec.id in verified_books:
                        ol_book = verified_books[rec.id]
                        recs.append(BookCard(
                            title=ol_book["title"],
                            author=ol_book["author"],
                            summary=rec.summary,
                            coreIdea=rec.coreIdea,
                            whyItMatches=rec.whyItMatches,
                            aiAnalysis=rec.aiAnalysis,
                            coverUrl=ol_book["coverUrl"],
                            openLibraryKey=ol_book["openLibraryKey"],
                            firstPublishYear=ol_book["firstPublishYear"]
                        ))
                
                if recs:
                    final_collections.append(BookCollection(
                        categoryName=collection.categoryName,
                        recommendations=recs
                    ))
                    
            final_payload = RecommendationPayload(
                message=validated_payload.message,
                collections=final_collections
            )
            
            return final_payload.model_dump()

        except Exception as err:
            print(f"Runtime execution failure in RecommendationService: {err}")
            # Fallback for local testing if API fails
            return {
                "message": f"Error connecting to AI inference layer. Details: {str(err)}",
                "collections": []
            }
