"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Bookmark, BookmarkCheck } from "lucide-react";

export default function BookCard({
  book,
  index,
  onSave,
  isSaved
}: {
  book: any,
  index: number,
  onSave: (book: any) => void,
  isSaved: boolean
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.fromTo(cardRef.current,
      { y: 50, opacity: 0, scale: 0.9 },
      { y: 0, opacity: 1, scale: 1, duration: 0.6, delay: index * 0.1, ease: "back.out(1.7)" }
    );
  }, [index]);

  return (
    <div ref={cardRef} className="group relative bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-zinc-800/60 transition-colors overflow-hidden flex gap-6">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      {book.coverUrl ? (
        <img src={book.coverUrl} alt={book.title} className="w-24 h-36 object-cover rounded-lg shadow-lg flex-shrink-0" />
      ) : (
        <div 
          className="w-24 h-36 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0 border border-white/10 p-2 text-center overflow-hidden relative"
          style={{
            background: `linear-gradient(135deg, hsl(${book.title.length * 15 % 360}, 60%, 30%), hsl(${book.title.length * 25 % 360}, 70%, 15%))`
          }}
        >
          <div className="absolute inset-0 bg-black/20"></div>
          <span className="text-[10px] font-bold text-white/90 z-10 line-clamp-4 leading-tight shadow-sm drop-shadow-md">{book.title}</span>
        </div>
      )}
      
      <div className="flex-1 flex flex-col relative z-10">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-white mb-1 leading-tight">{book.title}</h3>
            <p className="text-white/60 text-sm mb-4">{book.author} {book.firstPublishYear && `(${book.firstPublishYear})`}</p>
          </div>
          <button
            onClick={() => onSave(book)}
            className="text-white/50 hover:text-purple-400 transition-colors"
          >
            {isSaved ? <BookmarkCheck className="text-purple-400" /> : <Bookmark />}
          </button>
        </div>
        <p className="text-white/80 italic text-sm line-clamp-3 mt-auto">"{book.reason}"</p>
      </div>
    </div>
  );
}
