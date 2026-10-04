"use client";
import { useEffect, useState } from "react";
import { X, BookOpen } from "lucide-react";

export default function ReadingList() {
  const [list, setList] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchList = () => {
    try {
      const stored = localStorage.getItem("reading_list");
      if (stored) {
        setList(JSON.parse(stored));
      } else {
        setList([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    
    const handleRefresh = () => fetchList();
    window.addEventListener("readingListUpdated", handleRefresh);
    return () => window.removeEventListener("readingListUpdated", handleRefresh);
  }, []);

  const removeBook = (id: number) => {
    const stored = JSON.parse(localStorage.getItem("reading_list") || "[]");
    const updated = stored.filter((b: any) => b.id !== id);
    localStorage.setItem("reading_list", JSON.stringify(updated));
    fetchList();
    window.dispatchEvent(new Event("readingListUpdated"));
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-full shadow-2xl hover:scale-105 transition-transform z-40 flex items-center gap-2"
      >
        <BookOpen size={20} />
        <span className="font-semibold">{list.length}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-y-0 right-0 w-80 bg-zinc-900/95 backdrop-blur-3xl border-l border-white/10 shadow-2xl z-50 flex flex-col p-6 animate-in slide-in-from-right duration-300">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2"><BookOpen size={20}/> Reading List</h2>
            <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white"><X /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto flex flex-col gap-4">
            {isLoading ? (
              <p className="text-white/50">Loading...</p>
            ) : list.length === 0 ? (
              <p className="text-white/50 italic">Your list is empty. Save some books!</p>
            ) : (
              list.map(book => (
                <div key={book.id} className="relative group bg-zinc-800/50 rounded-xl p-3 flex gap-3 items-center border border-white/5">
                  {book.coverUrl ? (
                    <img src={book.coverUrl} className="w-12 h-16 object-cover rounded" />
                  ) : (
                    <div className="w-12 h-16 bg-zinc-700 rounded" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-semibold text-sm truncate">{book.title}</h4>
                    <p className="text-white/50 text-xs truncate">{book.author}</p>
                  </div>
                  <button 
                    onClick={() => removeBook(book.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity absolute right-2 top-2 p-1"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
