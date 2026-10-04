export async function verifyBook(title: string, author: string) {
  try {
    const query = encodeURIComponent(title);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const res = await fetch(`https://openlibrary.org/search.json?title=${query}&limit=20`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      console.log(`[OL] Request failed for ${title} with status ${res.status}`);
      return null;
    }
    
    const data = await res.json();
    if (!data.docs || data.docs.length === 0) {
      console.log(`[OL] No docs for ${title}`);
      return null;
    }
    
    const matchingDocs = data.docs.filter((d: any) => {
      if (!d.author_name || !Array.isArray(d.author_name)) return false;
      
      const searchAuthorTokens = author.toLowerCase().trim().split(/\s+/).filter(t => t.length > 2);
      if (searchAuthorTokens.length === 0) searchAuthorTokens.push(author.toLowerCase().trim());

      return d.author_name.some((a: string) => {
        const docAuthor = a.toLowerCase().trim();
        if (docAuthor.includes(author.toLowerCase().trim()) || author.toLowerCase().trim().includes(docAuthor)) return true;
        return searchAuthorTokens.every(token => docAuthor.includes(token));
      });
    });

    if (matchingDocs.length === 0) {
      console.log(`[OL] Author mismatch for ${title} (${author}). Found authors: `, data.docs.slice(0,3).map((d:any)=>d.author_name));
      return null;
    }

    const doc = matchingDocs.find((d: any) => d.cover_i) || matchingDocs[0];
    const coverUrl = doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null;
    
    return {
      openLibraryKey: doc.key,
      firstPublishYear: doc.first_publish_year,
      coverUrl,
    };
  } catch (error) {
    console.log(`[OL] Exception for ${title}:`, error);
    return null;
  }
}
