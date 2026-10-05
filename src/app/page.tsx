"use client";

import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import SearchBox from "@/components/SearchBox";

type ChatMessage = {
  id: string;
  type: "user" | "ai";
  text?: string;
  collections?: any[];
};

// Distance from the top of the scroller where the newest user bubble lands.
// The same value is used as the gap above every user bubble, so the past is hidden.
const TOP = 5;
const MASK =
  "linear-gradient(to bottom, transparent 0, transparent 0px, #000 24px, #000 calc(100% - 48px), transparent 100%)";

const EXAMPLES = [
  {
    text: "Find books to help prepare for a job interview",
    query: "Books to help prepare for a job interview",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-gray-700 transition-colors"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
    ),
  },
  {
    text: "Suggest books to boost my self confidence",
    query: "Books to boost my self confidence",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="black" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black opacity-80 group-hover:opacity-100 transition-opacity"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
    ),
  },
  {
    text: "Find authors similar to George Orwell",
    query: "Find authors similar to George Orwell",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-gray-700 transition-colors"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
    ),
  },
  {
    text: "I need a gripping true crime mystery",
    query: "I need a gripping true crime mystery",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-gray-700 transition-colors"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
    ),
  },
];

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Settings State
  const [contentWeight, setContentWeight] = useState(0.5);
  const [collabWeight, setCollabWeight] = useState(0.4);
  const [excludeSeries, setExcludeSeries] = useState(false);
  const [hideOver500, setHideOver500] = useState(false);
  const [apiKey, setApiKey] = useState("");

  // Modal state
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [bookSummary, setBookSummary] = useState<string>("");
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const lastUserRef = useRef<HTMLDivElement | null>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedKey = localStorage.getItem("bookmatch_api_key");
    if (storedKey) setApiKey(storedKey);
  }, []);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setApiKey(val);
    localStorage.setItem("bookmatch_api_key", val);
  };

  const lastUserId = [...messages].reverse().find((m) => m.type === "user")?.id;
  const userCount = messages.filter((m) => m.type === "user").length;
  const isSolo = userCount <= 1; // hides the scrollbar during the first chat

  // Keeps empty space under the latest message so it can sit at the top.
  // The 176 minimum keeps the last content clear of the pinned search box.
  const fitSpacer = useCallback(() => {
    const sc = scrollContainerRef.current;
    const a = lastUserRef.current;
    const c = contentRef.current;
    const sp = spacerRef.current;
    if (!sc || !a || !c || !sp) return;
    const below = c.getBoundingClientRect().bottom - a.getBoundingClientRect().top;
    sp.style.height = Math.max(176, sc.clientHeight - TOP - below) + "px";
  }, []);

  // Re-fit whenever the content grows (loading bubble, AI reply, cards, resize)
  useEffect(() => {
    const c = contentRef.current;
    const sc = scrollContainerRef.current;
    if (!c || !sc) return;
    const ro = new ResizeObserver(fitSpacer);
    ro.observe(c);
    ro.observe(sc);
    return () => ro.disconnect();
  }, [hasStartedChat, fitSpacer]);

  // ONE smooth scroll per user message. AI replies never trigger it.
  useLayoutEffect(() => {
    if (!lastUserId) return;
    fitSpacer();
    const sc = scrollContainerRef.current;
    const a = lastUserRef.current;
    if (!sc || !a) return;
    const top =
      a.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - TOP;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    sc.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
  }, [lastUserId, fitSpacer]);

  // Entrance animation for the newest AI reply (replaces GSAP, no dependency needed)
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.type !== "ai") return;
    const root = listContainerRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const text = root.querySelector(".ai-message-text");
    text?.animate(
      [
        { opacity: 0, transform: "translateY(10px)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 400, easing: "ease-out", fill: "backwards" }
    );

    root.querySelectorAll(".book-card").forEach((el, i) => {
      el.animate(
        [
          { opacity: 0, transform: "translateY(24px) scale(0.98)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 500, delay: 200 + i * 120, easing: "ease-out", fill: "backwards" }
      );
    });
  }, [messages]);

  const handleSearch = async (query: string) => {
    if (!query.trim() || isSearching) return;

    const userMsgId = Date.now().toString();
    setMessages((prev) => [...prev, { id: userMsgId, type: "user", text: query }]);
    setIsSearching(true);
    setSearchError("");
    setHasStartedChat(true);

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: query,
          excludeTitles: [],
          settings: {
            contentWeight,
            collabWeight,
            excludeSeries,
            hideOver500,
            apiKey,
          },
        }),
      });

      if (!res.ok) {
        throw new Error("Search failed");
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          type: "ai",
          text:
            data.message ||
            (data.collections?.length
              ? undefined
              : "I couldn't find any verified books matching your strict criteria. Try loosening your search terms."),
          collections: data.collections || [],
        },
      ]);
    } catch (err) {
      setSearchError("Failed to fetch recommendations.");
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          type: "ai",
          text: "Sorry, I encountered a server error fetching recommendations.",
        },
      ]);
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
            summaryText =
              typeof data.description === "object" ? data.description.value : data.description;
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

  const forceRefreshDiscovery = () => {
    handleSearch("Surprise me with some great book recommendations");
  };

  return (
    <main
      className="h-screen bg-[#f2f2f2] text-[#1a1a1a] flex flex-col relative overflow-hidden"
      style={{
        backgroundImage: "radial-gradient(#d1d1d1 1px, transparent 1px)",
        backgroundSize: "20px 20px",
        backgroundPosition: "-19px -19px",
      }}
    >
      {/* Header */}
      <header className="px-4 py-8 md:px-8 flex justify-between items-center w-full z-10 flex-shrink-0">
        <div>
          <h1
            className="text-[17px] font-sans text-black flex items-center gap-2 cursor-pointer"
            onClick={() => {
              setHasStartedChat(false);
              setMessages([]);
            }}
          >
            <img src="/musubilogo.png" alt="Musubi AI Logo" className="h-8 w-auto object-contain" />
          </h1>
        </div>
        <div className="flex gap-4 items-center">
          <div
            onClick={forceRefreshDiscovery}
            className="flex items-center justify-center cursor-pointer text-gray-400 hover:text-black transition-colors"
            title="Refresh Discovery"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
          </div>
          <div onClick={() => setIsSettingsOpen(true)} className="px-6 py-2 rounded-full bg-[#1a1a1a] text-white font-mono text-sm flex items-center cursor-pointer hover:bg-black transition-colors">
            Settings
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div
        ref={scrollContainerRef}
        className={`flex-1 min-h-0 overflow-y-auto w-full flex flex-col ${
          hasStartedChat && isSolo ? "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : ""
        }`}
        style={hasStartedChat ? { maskImage: MASK, WebkitMaskImage: MASK } : undefined}
      >
        {!hasStartedChat ? (
          /* Landing Page / Hero State */
          <div className="flex flex-col items-center justify-start pt-12 md:pt-20 pb-44 w-full text-center px-4 max-w-[850px] mx-auto flex-1">
            <div className="mb-6 w-20 h-20 relative overflow-hidden rounded-full border border-gray-200 shadow-sm bg-white flex items-center justify-center">
              <img src="/notion-avatar.jpg" alt="Avatar" className="object-cover w-full h-full scale-[1.1]" />
            </div>

            <h2 className="text-4xl md:text-5xl font-sans font-semibold text-[#1a1a1a] tracking-tight mb-4">
              What's your reading vibe <span className="text-orange-500">today?</span>
            </h2>
            <p className="text-xs md:text-sm text-gray-500 max-w-[550px] mx-auto mb-10 leading-relaxed font-medium">
              I'm your AI library assistant. I can recommend books, discover new authors, and curate personalized reading lists based on your mood.
            </p>

            <div className="w-full mb-8">
              <SearchBox onSearch={handleSearch} isLoading={isSearching} />
              {searchError && <p className="text-red-500 mt-4 font-mono text-sm text-left">{searchError}</p>}
            </div>

            <div className="w-full text-left">
              <p className="text-[11px] font-bold text-gray-500/80 uppercase tracking-[0.2em] mb-4 pl-1">Get started with an example below</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                {EXAMPLES.map((ex) => (
                  <div
                    key={ex.query}
                    onClick={() => handleSearch(ex.query)}
                    className="bg-black/[0.03] hover:bg-black/[0.06] border border-transparent rounded-2xl p-5 cursor-pointer transition-colors flex flex-col justify-between h-32 group"
                  >
                    <p className="text-sm text-gray-700 leading-snug font-medium">{ex.text}</p>
                    {ex.icon}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Chat History State */
          <>
            <div ref={contentRef} className="w-full max-w-[850px] mx-auto flex flex-col gap-8 px-4 pt-4">
              {messages.map((msg, idx) => (
                <div key={msg.id} className="w-full flex flex-col gap-8">
                  {msg.type === "user" && (
                    <div
                      ref={msg.id === lastUserId ? lastUserRef : null}
                      className="w-full flex justify-end py-1"
                      style={{ marginTop: TOP }}
                    >
                      <div className="bg-black/[0.05] border border-gray-200/50 rounded-2xl px-5 py-3 text-[#1a1a1a] font-medium max-w-[80%] shadow-sm">
                        {msg.text}
                      </div>
                    </div>
                  )}

                  {msg.type === "ai" && (
                    <div
                      ref={idx === messages.length - 1 ? listContainerRef : null}
                      className="flex flex-col gap-8 w-full"
                    >
                      {(msg.text || (msg.collections && msg.collections.length === 0)) && (
                        <div className="flex gap-4 w-full">
                          <div className="w-8 h-8 rounded-full bg-white border border-gray-200 overflow-hidden flex-shrink-0 mt-1 shadow-sm">
                            <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Assistant" alt="AI" className="w-full h-full object-cover" />
                          </div>
                          <p className="ai-message-text text-[#1a1a1a] text-[15px] leading-relaxed mt-1.5 pr-4">
                            {msg.text || "I couldn't find any verified books matching your strict criteria."}
                          </p>
                        </div>
                      )}

                      {msg.collections && msg.collections.length > 0 && (
                        <div className="flex flex-col gap-8 w-full">
                          {msg.collections.map((collection, cIdx) => (
                            <div key={cIdx} className="flex gap-4 w-full">
                              <div className="w-8 h-8 rounded-full flex-shrink-0 bg-transparent hidden sm:block"></div>
                              <div className="flex flex-col gap-3 w-full">
                                <h3 className="text-[#1a1a1a] text-sm font-semibold uppercase tracking-wider">{collection.categoryName}</h3>

                                <div className="flex flex-col gap-3 mt-2">
                                  {(collection.recommendations || []).map((book: any, bIdx: number) => (
                                    <div
                                      key={book.title + bIdx}
                                      onClick={() => handleBookClick(book)}
                                      className="book-card bg-white hover:bg-black/[0.02] transition-colors rounded-2xl p-4 flex items-start justify-between cursor-pointer w-full group border border-neutral-100 hover:border-gray-200 shadow-sm"
                                    >
                                      <div className="flex items-start gap-4 flex-1">
                                        <div className="w-10 h-14 bg-gray-200 rounded-md overflow-hidden flex-shrink-0 shadow-sm border border-neutral-200/60 mt-1">
                                          {book.coverUrl ? (
                                            <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                                          ) : (
                                            <div className="w-full h-full bg-[#1a1a1a] flex items-center justify-center p-1">
                                              <span className="text-white font-serif text-[8px] leading-tight line-clamp-3 text-center">{book.title}</span>
                                            </div>
                                          )}
                                        </div>

                                        <div className="flex flex-col pt-0.5 flex-1 pr-4">
                                          <h4 className="text-sm font-semibold text-neutral-800 tracking-tight leading-snug">{book.title}</h4>
                                          <p className="text-[12px] font-medium text-neutral-400 mt-0.5">by {book.author}</p>
                                          {book.summary && (
                                            <p className="text-[12px] text-neutral-500 leading-relaxed mt-2 border-l-2 border-neutral-100 pl-2">
                                              {book.summary}
                                            </p>
                                          )}
                                        </div>
                                      </div>

                                      <div className="w-[18px] h-[18px] rounded border border-gray-400 flex-shrink-0 group-hover:border-black transition-colors bg-transparent mt-1.5"></div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* AI Loading Bubble */}
              {isSearching && (
                <div className="flex gap-4 w-full animate-drop-in">
                  <div className="w-8 h-8 rounded-full bg-white border border-gray-200 overflow-hidden flex-shrink-0 mt-1 shadow-sm">
                    <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Assistant" alt="AI" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex items-center">
                    <div className="bg-white border border-[#e5e7eb] shadow-[0_4px_20px_rgba(100,100,255,0.08)] rounded-2xl rounded-tl-sm px-4 py-3.5 flex gap-1.5 items-center">
                      <div className="w-[5px] h-[5px] bg-[#1a1a1a] rounded-full typing-dot" style={{ animationDelay: "0s" }}></div>
                      <div className="w-[5px] h-[5px] bg-[#1a1a1a] rounded-full typing-dot" style={{ animationDelay: "0.2s" }}></div>
                      <div className="w-[5px] h-[5px] bg-[#1a1a1a] rounded-full typing-dot" style={{ animationDelay: "0.4s" }}></div>
                    </div>
                  </div>
                </div>
              )}

              {searchError && <p className="text-red-500 font-mono text-sm ml-12">{searchError}</p>}
            </div>

            {/* Empty space under the latest message so it can scroll up to the top */}
            <div ref={spacerRef} className="flex-none" style={{ height: 176 }} />
          </>
        )}
      </div>

      {/* Floating Pinned SearchBox for Chat follow-up */}
      {hasStartedChat && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#f2f2f2] via-[#f2f2f2] to-transparent pt-12 flex justify-center pb-8 z-20 pointer-events-none">
          <div className="w-full max-w-[850px] rounded-full pointer-events-auto">
            <SearchBox onSearch={handleSearch} isLoading={isSearching} />
          </div>
        </div>
      )}

      {/* Book Modal Overlay */}
      {selectedBook && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedBook(null)}
        >
          <div
            className="bg-[#f2f2f2] rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundImage: "radial-gradient(#d1d1d1 1px, transparent 1px)",
              backgroundSize: "20px 20px",
              backgroundPosition: "-19px -19px",
            }}
          >
            <button
              onClick={() => setSelectedBook(null)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-200 transition-colors bg-white/50"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>
            </button>

            <div className="flex flex-col md:flex-row gap-8 mt-4">
              <div className="w-full md:w-1/3 flex-shrink-0 flex flex-col items-center">
                {selectedBook.coverUrl ? (
                  <img src={selectedBook.coverUrl.replace("-M.jpg", "-L.jpg")} alt={selectedBook.title} className="w-full h-auto object-cover rounded-xl shadow-2xl" />
                ) : (
                  <div className="w-full aspect-[2/3] bg-[#1a1a1a] rounded-xl shadow-2xl flex items-center justify-center p-6 text-center border-4 border-[#1a1a1a]">
                    <span className="text-white font-serif text-lg leading-tight">{selectedBook.title}</span>
                  </div>
                )}
              </div>

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
                      {bookSummary.split("\n").map((para, i) => para.trim() && <p key={i} className="mb-3">{para}</p>)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal Overlay */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsSettingsOpen(false)}>
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 flex items-center justify-between border-b border-gray-100">
              <h2 className="text-xl font-sans font-semibold text-neutral-900 tracking-tight">Configuration</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:text-black hover:bg-neutral-200 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh] flex flex-col gap-8">
              <div>
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4">Hybrid Ranker Tuning</h3>
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="flex justify-between text-[11px] font-mono text-neutral-600 mb-1">
                      <span>Content (α)</span>
                      <span>{contentWeight.toFixed(2)}</span>
                    </div>
                    <input type="range" min="0" max="1" step="0.05" value={contentWeight} onChange={(e) => setContentWeight(parseFloat(e.target.value))} className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-black" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-mono text-neutral-600 mb-1">
                      <span>Collaborative (β)</span>
                      <span>{collabWeight.toFixed(2)}</span>
                    </div>
                    <input type="range" min="0" max="1" step="0.05" value={collabWeight} onChange={(e) => setCollabWeight(parseFloat(e.target.value))} className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-black" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4">Advanced Filters</h3>
                <div className="flex flex-col gap-3">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm font-medium text-neutral-700 group-hover:text-black">Exclude multi-book series (Standalone only)</span>
                    <div className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${excludeSeries ? "bg-black" : "bg-neutral-200"}`} onClick={(e) => { e.preventDefault(); setExcludeSeries(!excludeSeries); }}>
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${excludeSeries ? "translate-x-4" : "translate-x-0"}`}></span>
                    </div>
                  </label>
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm font-medium text-neutral-700 group-hover:text-black">Hide books over 500 pages</span>
                    <div className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${hideOver500 ? "bg-black" : "bg-neutral-200"}`} onClick={(e) => { e.preventDefault(); setHideOver500(!hideOver500); }}>
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${hideOver500 ? "translate-x-4" : "translate-x-0"}`}></span>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4">API Integration (BYOK)</h3>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-neutral-600">OpenAI / Anthropic API Key</label>
                  <input type="password" value={apiKey} onChange={handleApiKeyChange} placeholder="sk-..." className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black font-mono text-neutral-600" />
                  <p className="text-[10px] text-neutral-400 mt-1">Keys are stored locally in your browser and never sent to our servers.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}