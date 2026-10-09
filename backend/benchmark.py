"""
Benchmark: Open Library request overhead + verification quality.

OLD  = LLM names books from memory -> 1 Open Library title search per book to verify.
NEW  = current pipeline (FAISS + keyword extraction -> Open Library candidate pool -> Claude picks IDs).

Run from the backend folder:  python benchmark.py
"""
import asyncio, json, os, re, statistics, sys
import httpx
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))
from services.recommendation_service import RecommendationService

PROMPTS = [
    "Books to help prepare for a job interview",
    "Books to boost my self confidence",
    "Find authors similar to George Orwell",
    "I need a gripping true crime mystery",
    "A cozy mystery set in winter",
    "Short thrillers I can finish in a weekend",
    "A slow-burn romance with a happy ending",
    "Biographies about George W. Bush",
    "Dark academia novels",
    "Science fiction about first contact",
]

KEY = os.getenv("ANTHROPIC_API_KEY", "").strip()
MODEL = os.getenv("LLM_MODEL", "claude-haiku-4-5-20251001").strip()
HEAD = {"x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"}

OLD_SYSTEM = (
    "You are a book recommendation engine. Recommend 3 to 8 real, published books. "
    'Respond ONLY with JSON: {"message":"string","collections":[{"categoryName":"string",'
    '"recommendations":[{"title":"string","author":"string","summary":"string"}]}]}'
)


def author_match(doc_authors, author):
    a = author.lower().strip()
    toks = [t for t in a.split() if len(t) > 2] or [a]
    for d in doc_authors:
        d = d.lower().strip()
        if d in a or a in d or all(t in d for t in toks):
            return True
    return False


async def old_arm(client, prompt):
    r = await client.post("https://api.anthropic.com/v1/messages", headers=HEAD, json={
        "model": MODEL, "max_tokens": 1500, "temperature": 0.2, "system": OLD_SYSTEM,
        "messages": [{"role": "user", "content": prompt}]})
    r.raise_for_status()
    j = r.json()
    text = j["content"][0]["text"]
    data = json.loads(re.search(r"\{.*\}", text, re.DOTALL).group(0))
    books = [b for c in data.get("collections", []) for b in c.get("recommendations", [])]
    ol_requests, verified = 0, 0
    for b in books:
        ol_requests += 1  # verifyBook = 1 request per book
        rr = await client.get("https://openlibrary.org/search.json",
                              params={"title": b["title"], "limit": 20})
        docs = rr.json().get("docs", []) if rr.status_code == 200 else []
        if any(d.get("author_name") and author_match(d["author_name"], b["author"]) for d in docs):
            verified += 1
    return {"ol_requests": ol_requests, "books": len(books), "verified": verified,
            "in_tokens": j["usage"]["input_tokens"], "out_tokens": j["usage"]["output_tokens"]}


async def new_arm(svc, prompt):
    counter = {"ol": 0, "llm": 0, "in": 0, "out": 0}
    real_get, real_post = svc.httpx_client.get, svc.httpx_client.post

    async def get(url, *a, **k):
        if "openlibrary.org" in str(url):
            counter["ol"] += 1
        return await real_get(url, *a, **k)

    async def post(url, *a, **k):
        resp = await real_post(url, *a, **k)
        if "anthropic.com" in str(url):
            counter["llm"] += 1
            try:
                u = resp.json().get("usage", {})
                counter["in"] += u.get("input_tokens", 0)
                counter["out"] += u.get("output_tokens", 0)
            except Exception:
                pass
        return resp

    svc.httpx_client.get, svc.httpx_client.post = get, post
    try:
        res = await svc.get_recommendations(prompt, [])
    finally:
        svc.httpx_client.get, svc.httpx_client.post = real_get, real_post
    books = [b for c in res.get("collections", []) for b in c["recommendations"]] if res.get("collections") and isinstance(res["collections"][0], dict) else \
            [b for c in res.get("collections", []) for b in c.recommendations]
    return {"ol_requests": counter["ol"], "books": len(books), "verified": len(books),
            "in_tokens": counter["in"], "out_tokens": counter["out"]}


async def main():
    svc = RecommendationService()
    rows = []
    async with httpx.AsyncClient(timeout=60) as client:
        for p in PROMPTS:
            try:
                o = await old_arm(client, p)
                n = await new_arm(svc, p)
                rows.append((p, o, n))
                print(f"{p[:42]:42} old OL={o['ol_requests']:2} ({o['verified']}/{o['books']} verified) | "
                      f"new OL={n['ol_requests']:2} ({n['verified']}/{n['books']})", flush=True)
            except Exception as e:
                print(f"SKIP {p!r}: {e}", flush=True)

    if not rows:
        sys.exit("no successful runs")
    om = statistics.mean(r[1]["ol_requests"] for r in rows)
    nm = statistics.mean(r[2]["ol_requests"] for r in rows)
    ob = sum(r[1]["books"] for r in rows); ov = sum(r[1]["verified"] for r in rows)
    nb = sum(r[2]["books"] for r in rows)
    print("\n==== SUMMARY (n=%d prompts) ====" % len(rows))
    print(f"Avg Open Library requests / query:  old={om:.1f}  new={nm:.1f}  change={(nm-om)/om*100:+.0f}%")
    print(f"Old pipeline books failing OL verification: {ob-ov}/{ob} ({(ob-ov)/ob*100:.0f}%)")
    print(f"New pipeline books returned that are OL-verified: {nb}/{nb} (by construction)")
    print(f"Avg LLM input tokens / query:  old={statistics.mean(r[1]['in_tokens'] for r in rows):.0f}  new={statistics.mean(r[2]['in_tokens'] for r in rows):.0f}")
    print(f"Avg LLM output tokens / query: old={statistics.mean(r[1]['out_tokens'] for r in rows):.0f}  new={statistics.mean(r[2]['out_tokens'] for r in rows):.0f}")


asyncio.run(main())
