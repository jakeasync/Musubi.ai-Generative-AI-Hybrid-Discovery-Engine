# Musubi.ai

A hybrid book discovery engine. Describe what you want to read ("a cozy mystery set in winter", "books to boost my confidence") and Musubi returns verified book recommendations with covers, summaries and where to find them.

> **Status:** in progress.

## How it works

```
Query -> FAISS semantic search (Gemini embeddings)
      -> Keyword extraction (Claude)
      -> Open Library candidate pool (async, semaphore-limited)
      -> Claude selects ONLY from verified candidate IDs
      -> Pydantic validates the JSON -> Next.js UI
```

- **Hybrid retrieval:** FAISS semantic matches plus Open Library keyword search build a pool of real, verified books.
- **Constrained generation:** Claude can only return candidate IDs, which are mapped back to catalog metadata, so titles and authors can't be invented.
- **Schema validation:** every LLM response is validated with Pydantic before it reaches the frontend.
- **AI store finder:** checks Open Library (borrowable) and Google Books (for sale) and has Claude rank where to read or buy each book.

### Measured results (10-prompt test, `backend/benchmark.py`)

| Metric | LLM names books from memory | Musubi pipeline |
|---|---|---|
| Books that failed Open Library verification | 20% (11/55) | 0% |
| Open Library requests per query | 5.5 | 4.2 (-24%) |
| Claude input tokens per query | 74 | ~2,200 |

The verified pipeline trades more input tokens for far fewer unverifiable recommendations. Small sample, single run, Claude Haiku 4.5.

## Tech stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend:** FastAPI (Python), Pydantic, httpx, FAISS
- **AI:** Anthropic Claude (Haiku 4.5), Gemini embeddings
- **Data:** Open Library API, Google Books API

## Run locally

1. Copy `.env.example` to `.env.local` and fill in your keys.
2. Frontend:
   ```bash
   npm install
   npm run dev
   ```
3. Backend (from the `backend` folder):
   ```bash
   pip install -r requirements.txt
   python -m uvicorn main:app --port 8000
   ```
4. Open http://localhost:3000.

The FAISS index in `backend/data/` can be rebuilt with `python build_index.py`.
