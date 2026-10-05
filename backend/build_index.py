import json
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

def build_faiss_index():
    print("Loading model...")
    model = SentenceTransformer('all-MiniLM-L6-v2')
    
    print("Loading metadata...")
    with open('data/books.json', 'r', encoding='utf-8') as f:
        books = json.load(f)
        
    # Combine fields to create rich semantic chunks as per standard RAG architecture
    documents = [f"{b['title']} by {b['author']}. Genre: {b['genre']}. Description: {b['description']}" for b in books]
    
    print("Encoding embeddings...")
    embeddings = model.encode(documents)
    
    print("Building FAISS index...")
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(np.array(embeddings).astype('float32'))
    
    print("Saving index...")
    faiss.write_index(index, 'data/books.index')
    print("FAISS Index successfully built and saved to data/books.index")

if __name__ == "__main__":
    build_faiss_index()
