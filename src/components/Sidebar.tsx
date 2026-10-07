import React from "react";

type SidebarProps = {
  currentView: string;
  setCurrentView: (view: string) => void;
  setHasStartedChat: (hasStarted: boolean) => void;
  setMessages: (messages: any[]) => void;
  setIsSidebarOpen: (isOpen: boolean) => void;
  forceRefreshDiscovery: () => void;
  setIsSettingsOpen: (isOpen: boolean) => void;
  recentSearches: string[];
  onClearSearches: () => void;
  onSelectSearch: (query: string) => void;
  bookmarksCount: number;
  likedCount: number;
  dislikedCount: number;
  cozyCount: number;
  toReadCount: number;
};

export default function Sidebar({
  currentView,
  setCurrentView,
  setHasStartedChat,
  setMessages,
  setIsSidebarOpen,
  forceRefreshDiscovery,
  recentSearches,
  onClearSearches,
  onSelectSearch,
  bookmarksCount,
  likedCount,
  dislikedCount,
  cozyCount,
  toReadCount,
}: SidebarProps) {
  return (
    <div className="hidden md:flex w-[260px] bg-[#fcfcfc] border-r border-gray-100 flex-col py-6 px-4 h-full overflow-y-auto flex-shrink-0 relative z-20">
      {/* Logo Section */}
      <div className="flex items-center justify-between px-2 mb-6">
        <h1
          className="text-[15px] font-semibold text-black flex items-center gap-2 cursor-pointer"
          onClick={() => {
            setCurrentView("chat");
            setHasStartedChat(false);
            setMessages([]);
          }}
        >
          {/* Premium Icon (Asterisk-like) */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-black">
            <path d="M12 2v20"></path><path d="M2 12h20"></path><path d="m4.93 4.93 14.14 14.14"></path><path d="m19.07 4.93-14.14 14.14"></path>
          </svg>
          Musubi AI
        </h1>
        <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-gray-600">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7"></polyline><polyline points="18 17 13 12 18 7"></polyline></svg>
        </button>
      </div>
    
      <div className="mb-6">
        <h3 className="text-[11px] font-medium text-gray-400 mb-2 px-3 uppercase tracking-wider">Library</h3>
        <ul className="space-y-1">
          <li>
            <button 
              onClick={() => {
                setCurrentView("chat");
                forceRefreshDiscovery();
              }}
              className={`w-full px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2.5 ${currentView === "chat" ? "bg-gray-100 text-gray-800" : "hover:bg-gray-50 text-gray-600"}`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#141414]"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
              Discover
            </button>
          </li>
          <li>
            <button onClick={() => setCurrentView("bookmarks")} className={`w-full flex justify-between items-center px-3 py-2 rounded-lg text-sm ${currentView === "bookmarks" ? "bg-gray-100 text-gray-800 font-medium" : "hover:bg-gray-50 text-gray-600"}`}>
              <span className="flex items-center gap-2.5">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#141414]"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path></svg>
                Bookmarks
              </span>
              <span className="text-gray-400 text-xs font-mono">{bookmarksCount}</span>
            </button>
          </li>
          <li>
            <button onClick={() => setCurrentView("liked")} className={`w-full flex justify-between items-center px-3 py-2 rounded-lg text-sm ${currentView === "liked" ? "bg-gray-100 text-gray-800 font-medium" : "hover:bg-gray-50 text-gray-600"}`}>
              <span className="flex items-center gap-2.5">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#141414]"><path d="M7 10v12"></path><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"></path></svg>
                Liked
              </span>
              <span className="text-gray-400 text-xs font-mono">{likedCount}</span>
            </button>
          </li>
          <li>
            <button onClick={() => setCurrentView("disliked")} className={`w-full flex justify-between items-center px-3 py-2 rounded-lg text-sm ${currentView === "disliked" ? "bg-gray-100 text-gray-800 font-medium" : "hover:bg-gray-50 text-gray-600"}`}>
              <span className="flex items-center gap-2.5">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#141414]"><path d="M17 14V2"></path><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"></path></svg>
                Disliked
              </span>
              <span className="text-gray-400 text-xs font-mono">{dislikedCount}</span>
            </button>
          </li>
        </ul>
      </div>
      
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-400 mb-2 px-3">Collections</h3>
        <ul className="space-y-1">
          <li>
            <button onClick={() => setCurrentView("cozy")} className={`w-full flex justify-between items-center px-3 py-2 rounded-lg text-sm ${currentView === "cozy" ? "bg-gray-100 text-gray-800 font-medium" : "hover:bg-gray-50 text-gray-600"}`}>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400"></span> Cozy reads
              </span>
              <span className="text-gray-400 text-xs font-mono">{cozyCount}</span>
            </button>
          </li>
          <li>
            <button onClick={() => setCurrentView("toread")} className={`w-full flex justify-between items-center px-3 py-2 rounded-lg text-sm ${currentView === "toread" ? "bg-gray-100 text-gray-800 font-medium" : "hover:bg-gray-50 text-gray-600"}`}>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span> To read this month
              </span>
              <span className="text-gray-400 text-xs font-mono">{toReadCount}</span>
            </button>
          </li>
          <li>
            <button onClick={() => alert("Collection creation coming soon!")} className="w-full flex justify-between items-center px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-400">
              New collection <span className="text-xs text-gray-400 hover:text-gray-600">Add</span>
            </button>
          </li>
        </ul>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2 px-3">
            <h3 className="text-xs font-semibold text-gray-400">Recent chats</h3>
            {recentSearches.length > 0 && (
              <button onClick={onClearSearches} className="text-[10px] uppercase text-gray-400 hover:text-gray-600">Clear</button>
            )}
        </div>
        <div className="px-3 py-1">
            {recentSearches.length > 0 ? (
              <ul className="space-y-1">
                {recentSearches.map((query, i) => (
                  <li key={i}>
                    <button onClick={() => onSelectSearch(query)} className="w-full text-left truncate text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-50 px-2 py-1.5 rounded-lg transition-colors">
                      {query}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400 px-2 py-1">Nothing yet</p>
            )}
        </div>
      </div>
      
      <div className="mt-auto pt-6">
        <button onClick={() => setIsSettingsOpen(true)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-100 text-sm font-medium text-gray-800">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          Settings
        </button>
      </div>
    </div>
  );
}
