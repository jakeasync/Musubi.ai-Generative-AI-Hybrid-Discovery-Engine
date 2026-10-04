"use client";

import { useState, useEffect } from "react";
import SearchBox from "@/components/SearchBox";

export default function Home() {
  const [collections, setCollections] = useState<any[]>([]);
  const [isDiscoverLoading, setIsDiscoverLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  
  // Modal state
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [bookSummary, setBookSummary] = useState<string>("");
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  const fetchDiscovery = async (force = false) => {
    setIsDiscoverLoading(true);
    try {
      if (!force) {
        const cached = localStorage.getItem("bookmatch_discover");
        if (cached) {
          setCollections(JSON.parse(cached));
          setIsDiscoverLoading(false);
          return;
        }
      }
      
      const res = await fetch("/api/discover");
      if (res.ok) {
        const data = await res.json();
        setCollections(data.collections || []);
        localStorage.setItem("bookmatch_discover", JSON.stringify(data.collections || []));
      }
    } catch (err) {
      console.error("Discovery error", err);
    } finally {
      setIsDiscoverLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscovery();
  }, []);

  const forceRefreshDiscovery = () => {
    fetchDiscovery(true);
  };

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    setSearchError("");
    setCollections([]);
    
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: query, excludeTitles: [] })
      });
      
      if (!res.ok) {
        throw new Error("Search failed");
      }
      
      const data = await res.json();
      setCollections(data.collections || []);
    } catch (err) {
      setSearchError("Failed to fetch recommendations.");
    } finally {
      setIsSearching(false);
    }
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
    <div className="flex overflow-x-auto gap-6 pb-6 snap-x snap-mandatory hide-scrollbar">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="bg-[#e5e5e5] rounded-3xl p-6 min-w-[280px] h-[280px] animate-pulse flex flex-col justify-between snap-start">
          <div className="flex justify-between w-full">
            <div className="w-1/2 h-4 bg-gray-300 rounded"></div>
            <div className="w-8 h-4 bg-gray-300 rounded"></div>
          </div>
          <div className="w-24 h-24 bg-gray-300 rounded-2xl self-center my-4"></div>
          <div className="w-3/4 h-3 bg-gray-300 rounded"></div>
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
      <div className="max-w-[1850px] mx-auto px-4 py-8 md:px-8 md:py-12">
        <header className="mb-12 flex justify-between items-center">
          <div>
            <h1 className="text-sm font-mono tracking-widest uppercase text-gray-500 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>
              Musubi.ai
            </h1>
            <p className="font-serif text-3xl font-medium mt-1">Discovery Engine</p>
          </div>
          <div className="flex gap-4">
            <div 
              onClick={forceRefreshDiscovery}
              className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center bg-white cursor-pointer hover:bg-gray-50"
              title="Refresh Discovery"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
            </div>
            <div className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center bg-white cursor-pointer hover:bg-gray-50">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            </div>
            <div className="px-6 py-2 rounded-full bg-[#1a1a1a] text-white font-mono text-sm flex items-center cursor-pointer hover:bg-black">
              Settings
            </div>
          </div>
        </header>

        <div className="max-w-2xl mb-16">
          <SearchBox onSearch={handleSearch} isLoading={isSearching} />
          {searchError && <p className="text-red-500 mt-4 font-mono text-sm">{searchError}</p>}
        </div>

        <style dangerouslySetInnerHTML={{__html: `
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}} />

        {isDiscoverLoading || isSearching ? (
          <section className="space-y-12">
            <div>
              <h2 className="font-serif text-3xl text-[#1a1a1a] mb-6">Curating Collections...</h2>
              {renderSkeletonRow()}
            </div>
          </section>
        ) : (
          <div className="space-y-12">
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
                        <span className="max-w-[70%] truncate">{book.author}</span>
                        <span className="flex items-center gap-1">
                          [{(Math.random() * 5 + 1).toFixed(1)}K] 
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                        </span>
                      </div>
                      
                      <div className="flex-1 flex items-center justify-center py-4">
                        {book.coverUrl ? (
                          <img src={book.coverUrl} alt={book.title} className="w-28 h-40 object-cover rounded shadow-xl group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className="w-28 h-40 bg-[#1a1a1a] rounded shadow-xl overflow-hidden flex items-center justify-center p-3 text-center border-4 border-[#1a1a1a] group-hover:scale-105 transition-transform">
                             <span className="text-white font-serif text-sm leading-tight line-clamp-4">{book.title}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-gray-400 overflow-hidden flex-shrink-0">
                          <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${book.author}`} alt="avatar" />
                        </div>
                        <span className="text-sm font-medium text-gray-700 truncate" title={book.title}>{book.title}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Modal Overlay */}
        {selectedBook && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedBook(null)}
          >
            <div 
              className="bg-[#f2f2f2] rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative shadow-2xl"
              onClick={e => e.stopPropagation()}
              style={{
                backgroundImage: "radial-gradient(#d1d1d1 1px, transparent 1px)",
                backgroundSize: "20px 20px",
                backgroundPosition: "-19px -19px"
              }}
            >
              <button 
                onClick={() => setSelectedBook(null)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-200 transition-colors bg-white/50"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>
              </button>
              
              <div className="flex flex-col md:flex-row gap-8 mt-4">
                {/* Modal Cover Image */}
                <div className="w-full md:w-1/3 flex-shrink-0 flex flex-col items-center">
                  {selectedBook.coverUrl ? (
                    <img src={selectedBook.coverUrl.replace('-M.jpg', '-L.jpg')} alt={selectedBook.title} className="w-full h-auto object-cover rounded-xl shadow-2xl" />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-[#1a1a1a] rounded-xl shadow-2xl flex items-center justify-center p-6 text-center border-4 border-[#1a1a1a]">
                       <span className="text-white font-serif text-lg leading-tight">{selectedBook.title}</span>
                    </div>
                  )}
                </div>
                
                {/* Modal Info Details */}
                <div className="flex-1 flex flex-col bg-white/60 p-6 rounded-2xl border border-white">
                  <h2 className="font-serif text-3xl font-bold text-[#1a1a1a] mb-2">{selectedBook.title}</h2>
                  <p className="font-mono text-gray-500 uppercase tracking-widest text-sm mb-6">By {selectedBook.author}</p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-gray-300">
                    <div>
                      <p className="text-xs text-gray-500 font-mono uppercase mb-1">Published</p>
                      <p className="font-medium text-gray-800">{selectedBook.firstPublishYear || "Unknown"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-mono uppercase mb-1">Database Match</p>
                      <p className="font-medium text-[#1a1a1a]">
                        {selectedBook.openLibraryKey ? "Verified (OpenLibrary)" : "AI Generated (Unverified)"}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-xs text-gray-500 font-mono uppercase mb-3">Synopsis</h3>
                    {isLoadingSummary ? (
                      <div className="space-y-3 animate-pulse mt-2">
                        <div className="w-full h-3 bg-gray-300 rounded"></div>
                        <div className="w-full h-3 bg-gray-300 rounded"></div>
                        <div className="w-5/6 h-3 bg-gray-300 rounded"></div>
                        <div className="w-3/4 h-3 bg-gray-300 rounded"></div>
                      </div>
                    ) : (
                      <div className="prose prose-sm text-gray-800 font-serif leading-relaxed">
                        {bookSummary.split('\n').map((para, i) => (
                          para.trim() && <p key={i} className="mb-3">{para}</p>
                        ))}
                      </div>
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
