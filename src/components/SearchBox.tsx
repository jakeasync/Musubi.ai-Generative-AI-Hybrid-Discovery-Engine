"use client";
import { useState } from "react";

export default function SearchBox({ onSearch, isLoading }: { onSearch: (q: string) => void, isLoading: boolean }) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full mx-auto relative bg-[#f4f4f4] border border-black/5 shadow-sm rounded-full flex items-center p-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ask AI a question or make a request..."
        className="flex-1 bg-transparent text-[#1a1a1a] focus:outline-none font-sans text-[15px] placeholder-gray-400 pl-4 pr-2 h-10"
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={isLoading || !query.trim()}
        className={`w-10 h-10 flex-shrink-0 flex items-center justify-center text-white rounded-full transition-colors mr-1 ${
          query.trim() && !isLoading ? "bg-[#141414] hover:bg-black" : "bg-[#e5e5e5]"
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      </button>
    </form>
  );
}
