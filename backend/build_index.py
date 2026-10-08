import json
import faiss
import numpy as np
import os
from dotenv import load_dotenv
from google import genai

def build_faiss_index():
    # Load env variables (ensures GEMINI_API_KEY is available)
    load_dotenv(dotenv_path="../.env.local")
    
    print("Loading Google GenAI client...")
    client = genai.Client()
    
    print("Loading metadata...")
    with open('data/books.json', 'r', encoding='utf-8') as f:
        books = json.load(f)
        
    # Combine fields to create rich semantic chunks
    documents = [f"{b['title']} by {b['author']}. Genre: {b['genre']}. Description: {b['description']}" for b in books]
    
    print("Encoding embeddings using gemini-embedding-2...")
    response = client.models.embed_content(
        model="gemini-embedding-2",
        contents=documents
    )
    
    embeddings = np.array([e.values for e in response.embeddings], dtype='float32')
    
    print("Building FAISS index...")
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings)
    
    print("Saving index...")
    faiss.write_index(index, 'data/books.index')
    print("FAISS Index successfully built and saved to data/books.index")

if __name__ == "__main__":
    build_faiss_index()
