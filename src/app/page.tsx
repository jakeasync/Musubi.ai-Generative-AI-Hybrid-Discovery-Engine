"use client";

import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import SearchBox from "@/components/SearchBox";
import Sidebar from "@/components/Sidebar";
import BookCard from "@/components/BookCard";

type ChatMessage = {
  id: string;
  type: "user" | "ai";
  text?: string;
  collections?: any[];
};

// Distance from the top of the scroller where the newest user bubble lands.
// The same value is used as the gap above every user bubble, so the past is hidden.
const TOP = 100;
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState<string>("chat");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [liked, setLiked] = useState<any[]>([]);
  const [disliked, setDisliked] = useState<any[]>([]);
  const [cozy, setCozy] = useState<any[]>([]);
  const [toRead, setToRead] = useState<any[]>([]);

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
    
    const storedSearches = localStorage.getItem("bookmatch_recent_searches");
    if (storedSearches) {
      try {
        setRecentSearches(JSON.parse(storedSearches));
      } catch (e) {}
    }

    const loadList = (key: string, setter: React.Dispatch<React.SetStateAction<any[]>>) => {
      const data = localStorage.getItem(key);
      if (data) {
        try { setter(JSON.parse(data)); } catch (e) {}
      }
    };
    
    loadList("bookmatch_bookmarks", setBookmarks);
    loadList("bookmatch_liked", setLiked);
    loadList("bookmatch_disliked", setDisliked);
    loadList("bookmatch_cozy", setCozy);
    loadList("bookmatch_toread", setToRead);
  }, []);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setApiKey(val);
    localStorage.setItem("bookmatch_api_key", val);
  };

  const lastUserId = [...messages].reverse().find((m) => m.type === "user")?.id;

  // Keeps empty space under the latest message so it can sit at the top.
  // The 176 minimum keeps the last content clear of the pinned search box.
  const fitSpacer = useCallback(() => {
    const sc = scrollContainerRef.current;
    const a = lastUserRef.current;
    const c = contentRef.current;
    const sp = spacerRef.current;
    if (!sc || !a || !c || !sp) return;

    const MIN_GAP = 176; // keeps the last content clear of the pinned search box
    const contentH = c.offsetHeight;

    // Short conversation: everything fits, so no overflow and no scrollbar
    if (contentH + MIN_GAP <= sc.clientHeight) {
      sp.style.height = sc.clientHeight - contentH + "px";
      return;
    }

    // Long conversation: leave room so the newest message can sit at the top
    const below = c.getBoundingClientRect().bottom - a.getBoundingClientRect().top;
    sp.style.height = Math.max(MIN_GAP, sc.clientHeight - TOP - below) + "px";
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

    setRecentSearches(prev => {
      const updated = [query, ...prev.filter(q => q !== query)].slice(0, 10);
      localStorage.setItem("bookmatch_recent_searches", JSON.stringify(updated));
      return updated;
    });

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
          if (data.description) {
            setBookSummary(typeof data.description === "object" ? data.description.value : data.description);
          } else {
            setBookSummary("");
          }
        } else {
          setBookSummary("");
        }
      } catch (err) {
        setBookSummary("");
      } finally {
        setIsLoadingSummary(false);
      }
    }
  };

  const forceRefreshDiscovery = () => {
    handleSearch("Surprise me with some great book recommendations");
  };

  const handleClearSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem("bookmatch_recent_searches");
  };

  const toggleItem = (book: any, list: any[], setList: React.Dispatch<React.SetStateAction<any[]>>, key: string) => {
    setList((prev: any[]) => {
      const exists = prev.some(b => b.title === book.title);
      const updated = exists ? prev.filter(b => b.title !== book.title) : [...prev, book];
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    });
  };

  const handleBookmark = (book: any) => toggleItem(book, bookmarks, setBookmarks, "bookmatch_bookmarks");
  const handleLike = (book: any) => toggleItem(book, liked, setLiked, "bookmatch_liked");
  const handleDislike = (book: any) => toggleItem(book, disliked, setDisliked, "bookmatch_disliked");
  // Simple add to cozy collection by default for the demo
  const handleAddToCollection = (book: any) => {
    toggleItem(book, cozy, setCozy, "bookmatch_cozy");
    alert(`"${book.title}" added to Cozy reads!`);
  };

  return (
    <main className="h-screen bg-white text-[#1a1a1a] flex flex-row overflow-hidden w-full relative">
      {/* Sidebar (Full Height) */}
      {isSidebarOpen && (
        <Sidebar
          currentView={currentView}
          setCurrentView={setCurrentView}
          setHasStartedChat={setHasStartedChat}
          setMessages={setMessages}
          setIsSidebarOpen={setIsSidebarOpen}
          forceRefreshDiscovery={forceRefreshDiscovery}
          setIsSettingsOpen={setIsSettingsOpen}
          recentSearches={recentSearches}
          onClearSearches={handleClearSearches}
          onSelectSearch={handleSearch}
          bookmarksCount={bookmarks.length}
          likedCount={liked.length}
          dislikedCount={disliked.length}
          cozyCount={cozy.length}
          toReadCount={toRead.length}
        />
      )}

      {/* Main Container Wrapper */}
      <div className={`flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden relative w-full h-full transition-[padding] duration-300 ease-in-out ${selectedBook ? 'md:pr-[500px]' : 'pr-0'}`}>
        {/* Main Content Area */}
        <div className="flex-1 min-w-0 min-h-0 relative flex flex-col w-full h-full">
          {/* Floating Top Controls */}
          <div className="absolute top-6 left-4 right-6 flex justify-between items-center z-20 pointer-events-none">
            <div className="pointer-events-auto">
              {!isSidebarOpen && (
                <button onClick={() => setIsSidebarOpen(true)} className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Expand Sidebar">
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg>
                </button>
              )}
            </div>
            <div className="pointer-events-auto">
              <div
                onClick={() => {
                  setCurrentView("chat");
                  setHasStartedChat(false);
                  setMessages([]);
                }}
                className="pl-2 pr-5 py-2 rounded-full bg-[#141414] text-white font-medium text-[13px] flex items-center gap-2 cursor-pointer hover:bg-black transition-colors shadow-sm"
              >
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </div>
                New Chat
              </div>
            </div>
          </div>

          <div
            ref={scrollContainerRef}
            className={`absolute inset-0 overflow-y-auto flex flex-col transition-all duration-300 px-4`}
          >
        {currentView !== "chat" ? (
          /* Placeholder Page State */
          <div className="flex-1 flex flex-col items-center justify-center pt-20 pb-44 w-full text-center px-4 max-w-[850px] mx-auto opacity-0 animate-drop-in">
            <div className="mb-6 w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200/60 shadow-sm">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"></path><path d="M2 12h20"></path></svg>
            </div>
            <h2 className="text-3xl font-sans font-semibold text-[#1a1a1a] tracking-tight mb-3 capitalize">
              {currentView.replace(/([A-Z])/g, ' $1').trim()}
            </h2>
            <p className="text-sm text-gray-500 max-w-[400px] mx-auto mb-8 leading-relaxed">
              This feature is currently under construction. Check back later for updates to the {currentView} library.
            </p>
            <button 
              onClick={() => setCurrentView("chat")}
              className="px-6 py-2.5 rounded-full bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Return to Discovery
            </button>
          </div>
        ) : !hasStartedChat ? (
          /* Landing Page / Hero State (Gemini Style) */
          <div className="flex flex-col items-center justify-center pt-8 md:pt-16 pb-32 w-full text-center px-4 max-w-[850px] mx-auto flex-1 opacity-0 animate-drop-in">
            
            <h2 
              className="text-3xl md:text-[40px] font-medium text-[#1a1a1a] tracking-tight mb-2"
              style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
            >
              Good morning, Reader
            </h2>
            <p className="text-[14px] md:text-[15px] text-gray-500 mb-8 font-medium">
              I'm your AI library assistant, here to help you <span className="text-black font-semibold cursor-pointer hover:underline underline-offset-2">discover your next great read.</span>
            </p>

            <div className="flex flex-wrap justify-center gap-3 mb-10 w-full max-w-[750px]">
              <button onClick={() => handleSearch("Lizzie Borden Collection")} className="flex items-center gap-2 px-4 py-2 bg-[#f4f4f4] hover:bg-[#e5e5e5] rounded-full text-[13.5px] font-medium text-[#1a1a1a] transition-colors border-none">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black"><path d="m16 6 4 14"></path><path d="M12 6v14"></path><path d="M8 8v12"></path><path d="M4 4v16"></path></svg>
                Lizzie Borden Collection
              </button>
              <button onClick={() => handleSearch("2025 Romance Collection")} className="flex items-center gap-2 px-4 py-2 bg-[#f4f4f4] hover:bg-[#e5e5e5] rounded-full text-[13.5px] font-medium text-[#1a1a1a] transition-colors border-none">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>
                2025 Romance Collection
              </button>
              <button onClick={() => handleSearch("Top 10 Sci-Fi Classics")} className="flex items-center gap-2 px-4 py-2 bg-[#f4f4f4] hover:bg-[#e5e5e5] rounded-full text-[13.5px] font-medium text-[#1a1a1a] transition-colors border-none">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black"><circle cx="12" cy="12" r="10"></circle><path d="m12 16 4-4-4-4"></path><path d="M8 12h8"></path></svg>
                Top 10 Sci-Fi Classics
              </button>
              <button onClick={() => handleSearch("A knight who fell in love with a knight")} className="flex items-center gap-2 px-4 py-2 bg-[#f4f4f4] hover:bg-[#e5e5e5] rounded-full text-[13.5px] font-medium text-[#1a1a1a] transition-colors border-none">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                A knight who fell in love with a knight
              </button>
            </div>

            <div className="w-full max-w-[650px] text-left">
              <h3 className="text-[13px] font-semibold text-[#444746] mb-3 px-2">Recent</h3>
              <div className="flex flex-col gap-1.5 w-full bg-[#f0f4f9]/40 p-2 rounded-[24px]">
                <div className="flex items-center justify-between px-4 py-3 hover:bg-[#f0f4f9] rounded-[16px] cursor-pointer transition-colors group">
                  <div className="flex items-center gap-4">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-gray-600 transition-colors"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                    <span className="text-[14px] text-[#1f1f1f] font-medium">Summarize my reading notes</span>
                  </div>
                  <span className="text-[12px] text-gray-500">1 min</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 hover:bg-[#f0f4f9] rounded-[16px] cursor-pointer transition-colors group">
                  <div className="flex items-center gap-4">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-gray-600 transition-colors"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                    <span className="text-[14px] text-[#1f1f1f] font-medium">Explain quantum computing like I'm 5 years old</span>
                  </div>
                  <span className="text-[12px] text-gray-500">Yesterday</span>
                </div>
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
                    <div className="bg-[#ebebeb] rounded-2xl px-5 py-3 text-[#1a1a1a] font-medium max-w-[80%]">
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

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                {(collection.recommendations || []).map((book: any, bIdx: number) => (
                                  <div key={book.title + bIdx} onClick={() => handleBookClick(book)} className="cursor-pointer">
                                    <BookCard 
                                      book={book} 
                                      index={bIdx} 
                                      onSave={(b) => handleBookmark(b)} 
                                      isSaved={bookmarks.some(b => b.title === book.title)} 
                                      onLike={() => handleLike(book)}
                                      isLiked={liked.some(b => b.title === book.title)}
                                      onDislike={() => handleDislike(book)}
                                      isDisliked={disliked.some(b => b.title === book.title)}
                                      onAddToCollection={() => handleAddToCollection(book)}
                                    />
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
          <div ref={spacerRef} className="flex-none" style={{ height: 120 }} />
        </>
        )}
          </div>

          {/* Floating Pinned SearchBox for Chat follow-up */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent pt-12 flex flex-col items-center justify-center pb-8 z-20 pointer-events-none">
            <div className="w-full max-w-[850px] px-4 pointer-events-auto">
              <SearchBox onSearch={handleSearch} isLoading={isSearching} />
            </div>
            {!hasStartedChat && searchError && <p className="text-red-500 mt-2 font-mono text-sm text-center w-full pointer-events-auto">{searchError}</p>}
          </div>
        </div>
      </div>

      {/* Book Side Panel */}
        <div
          className={`absolute right-0 top-0 bottom-0 bg-[#fcfcfc] border-l border-gray-100 h-full transition-all duration-300 ease-in-out overflow-y-auto overflow-x-hidden flex flex-col z-30 ${
            selectedBook ? "w-[500px] translate-x-0 opacity-100" : "w-0 translate-x-full opacity-0 border-transparent"
          }`}
        >
          {selectedBook && (
            <div className="p-8 relative min-w-[500px]">
              <button
                onClick={() => setSelectedBook(null)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>
              </button>

              <div className="flex flex-col gap-8 mt-4">
                <div className="w-full flex-shrink-0 flex flex-col items-center">
                  {selectedBook.coverUrl ? (
                    <img src={selectedBook.coverUrl.replace("-M.jpg", "-L.jpg")} alt={selectedBook.title} className="w-36 h-auto object-cover rounded-xl shadow-xl shadow-black/20" />
                  ) : (
                    <div className="w-36 aspect-[2/3] bg-[#1a1a1a] rounded-xl shadow-xl shadow-black/20 flex items-center justify-center p-6 text-center border-4 border-[#1a1a1a]">
                      <span className="text-white font-serif text-lg leading-tight">{selectedBook.title}</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col">
                  <h2 className="font-serif text-2xl font-bold text-[#1a1a1a] mb-2">{selectedBook.title}</h2>
                  <p className="font-mono text-gray-500 uppercase tracking-widest text-sm mb-6">By {selectedBook.author}</p>

                  <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-gray-300">
                    <div>
                      <p className="text-xs text-gray-500 font-mono uppercase mb-1">Published</p>
                      <p className="font-medium text-gray-800">{selectedBook.firstPublishYear || "Unknown"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-mono uppercase mb-1">Database Match</p>
                      <p className="font-medium text-[#1a1a1a]">
                        {selectedBook.openLibraryKey ? "Verified (OL)" : "AI Generated"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-6">
                    {/* Synopsis Section */}
                    <div>
                      <h3 className="text-xs text-gray-500 font-mono uppercase mb-3 flex items-center justify-between">
                        <span>Synopsis</span>
                        <span className="bg-gray-100 text-[10px] px-2 py-1 rounded-sm text-gray-400">
                          {isLoadingSummary ? "Loading..." : bookSummary ? "[Open Library]" : "[Summarized by AI]"}
                        </span>
                      </h3>
                      {isLoadingSummary ? (
                        <div className="space-y-3 animate-pulse mt-2">
                          <div className="w-full h-3 bg-gray-200 rounded"></div>
                          <div className="w-full h-3 bg-gray-200 rounded"></div>
                          <div className="w-5/6 h-3 bg-gray-200 rounded"></div>
                        </div>
                      ) : (
                        <div className="prose prose-sm text-gray-800 font-serif leading-relaxed">
                          {(bookSummary || selectedBook.summary || "No summary available.").split("\n").map((para: string, i: number) => para.trim() && <p key={i} className="mb-3">{para}</p>)}
                        </div>
                      )}
                    </div>

                    {/* Core Idea Section */}
                    {selectedBook.coreIdea && (
                      <div>
                        <h3 className="text-xs text-gray-500 font-mono uppercase mb-2">Core Idea</h3>
                        <p className="text-sm text-gray-800 font-sans leading-relaxed">{selectedBook.coreIdea}</p>
                      </div>
                    )}

                    {/* Why it Matches Section */}
                    {selectedBook.whyItMatches && (
                      <div>
                        <h3 className="text-xs text-gray-500 font-mono uppercase mb-2">Why It Matches</h3>
                        <p className="text-sm text-gray-800 font-sans leading-relaxed">{selectedBook.whyItMatches}</p>
                      </div>
                    )}

                    {/* AI Analysis Section */}
                    {selectedBook.aiAnalysis && (
                      <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl mt-2">
                        <h3 className="text-[10px] text-orange-400 font-mono uppercase mb-1">AI Analysis</h3>
                        <p className="text-sm text-orange-900 font-sans font-medium">{selectedBook.aiAnalysis}</p>
                      </div>
                    )}

                    {/* Find It Section */}
                    <div className="mt-4 pt-6 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs text-gray-500 font-mono uppercase font-semibold tracking-wider">Find It</h3>
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        <a href={`https://www.amazon.com/s?k=${encodeURIComponent(selectedBook.title + ' ' + selectedBook.author)}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-lg text-sm text-[#1a1a1a] font-medium transition-colors">Amazon</a>
                        <a href={`https://www.goodreads.com/search?q=${encodeURIComponent(selectedBook.title + ' ' + selectedBook.author)}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-lg text-sm text-[#1a1a1a] font-medium transition-colors">Goodreads</a>
                        <a href={selectedBook.openLibraryKey ? `https://openlibrary.org${selectedBook.openLibraryKey}` : `https://openlibrary.org/search?q=${encodeURIComponent(selectedBook.title + ' ' + selectedBook.author)}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-lg text-sm text-[#1a1a1a] font-medium transition-colors">Borrow from a library</a>
                        <a href={`https://www.barnesandnoble.com/s/${encodeURIComponent(selectedBook.title + ' ' + selectedBook.author)}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-lg text-sm text-[#1a1a1a] font-medium transition-colors">Barnes & Noble</a>
                        <a href={`https://bookshop.org/search?keywords=${encodeURIComponent(selectedBook.title + ' ' + selectedBook.author)}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-lg text-sm text-[#1a1a1a] font-medium transition-colors">Bookshop.org</a>
                        <a href={`https://www.audible.com/search?keywords=${encodeURIComponent(selectedBook.title + ' ' + selectedBook.author)}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-lg text-sm text-[#1a1a1a] font-medium transition-colors">Audible</a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
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