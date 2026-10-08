"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SearchBox from "@/components/SearchBox";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";

  const [collections, setCollections] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [bookSummary, setBookSummary] = useState("");
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  useEffect(() => {
    if (query) {
      performSearch(query);
    }
  }, [query]);

  const performSearch = async (q: string) => {
    setIsSearching(true);
    setSearchError("");
    setCollections([]);
    
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: q, excludeTitles: [] })
      });
      
      if (!res.ok) throw new Error("Search failed");
      
      const data = await res.json();
      setCollections(data.collections || []);
    } catch (err) {
      setSearchError("Failed to fetch recommendations.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (newQuery: string) => {
    if (!newQuery.trim()) return;
    router.push(`/search?q=${encodeURIComponent(newQuery)}`);
  };

  const handleBookClick = async (book: any) => {
    setSelectedBook(book);
    setBookSummary("");
    
    if (book.openLibraryKey) {
      setIsLoadingSummary(true);
      try {
        const res = await fetch(`https://openlibrary.org${book.openLibraryKey}.json`);
        if (res.ok) {
          const data = await res.json();
          let summaryText = "No summary available for this book in OpenLibrary.";
          if (data.description) {
            summaryText = typeof data.description === 'object' ? data.description.value : data.description;
          }
          setBookSummary(summaryText);
        } else {
          setBookSummary("No summary available for this book.");
        }
      } catch (err) {
        setBookSummary("Failed to load summary from database.");
      } finally {
        setIsLoadingSummary(false);
      }
    } else {
      setBookSummary("No summary available for this book.");
    }
  };

  const renderSkeletonRow = () => (
    <div className="flex overflow-x-hidden gap-6 pb-6 w-full">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-gray-200 animate-pulse rounded-3xl p-6 min-w-[280px] w-[280px] h-[320px] flex-shrink-0 border border-gray-300">
          <div className="h-4 bg-gray-300 rounded w-1/3 mb-4"></div>
          <div className="h-32 bg-gray-300 rounded-lg w-full mb-8"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
        </div>
      ))}
    </div>
  );

  return (
    <main className="min-h-screen bg-[#f2f2f2] text-[#1a1a1a]" style={{
      backgroundImage: "radial-gradient(#d1d1d1 1px, transparent 1px)",
      backgroundSize: "20px 20px",
      backgroundPosition: "-19px -19px"
    }}>
      <div className="max-w-[1850px] mx-auto px-4 py-8 md:px-8">
        <header className="mb-8 flex justify-between items-center py-4">
          <div>
            <h1 
              onClick={() => router.push("/")}
              className="text-xl font-serif font-bold text-[#1a1a1a] flex items-center gap-2 cursor-pointer tracking-tight hover:opacity-80 transition-opacity"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-black"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>
              Musubi.ai
            </h1>
          </div>
          <div className="flex items-center gap-2 cursor-pointer group hover:opacity-70 transition-opacity">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#1a1a1a]">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <span className="font-sans font-medium text-[15px] text-[#1a1a1a]">Search</span>
          </div>
        </header>

        {searchError && <p className="text-red-500 mb-8 font-sans text-sm text-center">{searchError}</p>}

        <style dangerouslySetInnerHTML={{__html: `
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}} />

        {isSearching ? (
          <section className="space-y-12 mt-12">
            <div>
              <h2 className="font-serif text-3xl text-[#1a1a1a] mb-6">Curating Collections for "{query}"...</h2>
              {renderSkeletonRow()}
            </div>
          </section>
        ) : (
          <div className="space-y-12 mt-12">
            {collections.map((collection, cIdx) => (
              <section key={collection.categoryName + cIdx}>
                <div className="flex justify-between items-end mb-6">
                  <h2 className="font-serif text-3xl text-[#1a1a1a]">{collection.categoryName}</h2>
                </div>
                
                <div className="flex overflow-x-auto gap-6 pb-6 snap-x snap-mandatory hide-scrollbar">
                  {(collection.recommendations || []).map((book: any, idx: number) => (
                    <div 
                      key={book.title + idx} 
                      onClick={() => handleBookClick(book)}
                      className="bg-[#e2e2e2] hover:bg-[#d8d8d8] transition-colors rounded-3xl p-6 min-w-[280px] w-[280px] h-[320px] flex flex-col justify-between relative group cursor-pointer snap-start flex-shrink-0"
                    >
                      <div className="flex justify-between items-start text-xs font-mono text-gray-600 uppercase tracking-wide">
                        <span className="truncate pr-2">{book.author}</span>
                        <span className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          [{(Math.random() * 5 + 1).toFixed(1)}K] ♡
                        </span>
                      </div>
                      
                      <div className="flex-grow flex items-center justify-center my-4 overflow-hidden relative">
                        {book.coverUrl ? (
                          <img src={book.coverUrl} alt={book.title} className="max-h-[160px] object-contain drop-shadow-xl group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-24 h-36 bg-gray-300 rounded shadow-inner flex flex-col justify-center items-center text-center p-2">
                            <span className="text-[10px] font-mono text-gray-500 uppercase">{book.title.substring(0,20)}...</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden flex-shrink-0">
                           <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(book.author)}`} alt="author" className="w-full h-full object-cover" />
                        </div>
                        <h3 className="font-serif text-lg leading-tight line-clamp-2">{book.title}</h3>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Modal */}
        {selectedBook && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#f2f2f2] rounded-3xl max-w-2xl w-full p-8 relative shadow-2xl">
              <button 
                onClick={() => setSelectedBook(null)}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white flex items-center justify-center border border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                ✕
              </button>
              
              <div className="flex gap-8">
                <div className="w-1/3 flex-shrink-0">
                  {selectedBook.coverUrl ? (
                    <img src={selectedBook.coverUrl} alt={selectedBook.title} className="w-full rounded-xl drop-shadow-2xl" />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-gray-300 rounded-xl shadow-inner flex items-center justify-center">
                      <span className="text-xs font-mono text-gray-500 uppercase px-4 text-center">No Cover</span>
                    </div>
                  )}
                  <div className="mt-6 space-y-2">
                    <button className="w-full py-3 bg-[#1a1a1a] text-white rounded-full font-mono text-sm hover:bg-black transition-colors">
                      Add to List
                    </button>
                  </div>
                </div>
                <div className="w-2/3">
                  <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full overflow-hidden">
                       <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(selectedBook.author)}`} alt="author" className="w-full h-full object-cover" />
                    </div>
                    {selectedBook.author} • {selectedBook.firstPublishYear || 'Unknown Year'}
                  </div>
                  <h2 className="text-4xl font-serif text-[#1a1a1a] leading-tight mb-6">{selectedBook.title}</h2>
                  
                  <div className="prose prose-sm font-sans text-gray-600 max-h-[300px] overflow-y-auto pr-4 hide-scrollbar">
                    {isLoadingSummary ? (
                      <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-gray-300 rounded w-full"></div>
                        <div className="h-4 bg-gray-300 rounded w-5/6"></div>
                        <div className="h-4 bg-gray-300 rounded w-4/6"></div>
                        <div className="h-4 bg-gray-300 rounded w-full"></div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-line">{bookSummary}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
