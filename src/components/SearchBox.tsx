"use client";
import { useState } from "react";

export default function SearchBox({ onSearch, isLoading }: { onSearch: (q: string) => void, isLoading: boolean }) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="What are you in the mood for?"
        className="w-full px-6 py-4 rounded-full bg-white border border-gray-300 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black font-mono shadow-sm"
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={isLoading || !query.trim()}
        className="absolute right-2 top-2 bottom-2 px-6 bg-[#1a1a1a] text-white rounded-full hover:bg-black disabled:opacity-50 font-mono transition-colors"
      >
        {isLoading ? "Searching..." : "Search"}
      </button>
    </form>
  );
}
