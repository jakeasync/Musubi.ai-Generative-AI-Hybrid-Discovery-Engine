import asyncio
import httpx

async def test_ol():
    book = {"title": "The Fake Book of Lizzie", "author": "Mary Ellen Barnett"}
    title_query = book.get("title", "").replace(" ", "+")
    author_query = book.get("author", "").replace(" ", "+")
    url = f"https://openlibrary.org/search.json?title={title_query}&author={author_query}&limit=1"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        data = response.json()
        print("Found:", data.get("numFound"))
        if data.get("numFound", 0) > 0:
            doc = data["docs"][0]
            print("Matched Title:", doc.get("title"))
            print("Matched Author:", doc.get("author_name"))

asyncio.run(test_ol())
