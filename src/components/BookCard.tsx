"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Bookmark, BookmarkCheck, ThumbsUp, ThumbsDown, Plus } from "lucide-react";

export default function BookCard({
  book,
  index,
  onSave,
  isSaved,
  onLike,
  isLiked,
  onDislike,
  isDisliked,
  onAddToCollection
}: {
  book: any,
  index: number,
  onSave: (book: any) => void,
  isSaved: boolean,
  onLike?: () => void,
  isLiked?: boolean,
  onDislike?: () => void,
  isDisliked?: boolean,
  onAddToCollection?: () => void
}) {
  const cardRef = useRef<HTMLDivElement>(null);


  const palette = ["#1e2533", "#b45309", "#0f5c35", "#9b1b4b", "#3b2fa0", "#1e40af", "#334155", "#4d7c0f", "#9a3f17"];
  const hash = Array.from(String(book.title || "")).reduce((a, c) => a + c.charCodeAt(0), 0);
  const coverColor = palette[hash % palette.length];
  const pill = "h-8 bg-white rounded-xl flex items-center justify-center text-[#000] hover:bg-gray-50 transition-colors";

  return (
    <div ref={cardRef} className="book-card bg-[#f4f4f4] rounded-[20px] px-5 pt-8 pb-5 hover:bg-[#efefef] transition-colors flex flex-col items-center text-center h-full">
      {/* Cover */}
      <div
        className="w-[110px] h-[150px] rounded-md rounded-l-sm shadow-[0_18px_30px_-8px_rgba(0,0,0,0.35)] flex-shrink-0 relative overflow-hidden flex flex-col justify-end p-3 text-left"
        style={{ backgroundColor: coverColor }}
      >
        {book.coverUrl ? (
          <img src={book.coverUrl} alt={book.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <>
            <span className="text-white text-[13px] font-bold leading-tight line-clamp-3">{book.title}</span>
            <span className="text-white/80 text-[9px] font-medium mt-1 truncate">{book.author}</span>
          </>
        )}
        <div className="absolute left-0 top-0 bottom-0 w-[5px] bg-black/20" />
      </div>

      {/* Title & Author */}
      <h3 className="text-[15px] font-bold text-black mt-5 leading-tight line-clamp-1 max-w-full">{book.title}</h3>
      <p className="text-gray-500 text-[13px] mt-0.5 truncate max-w-full">{book.author || "Unknown"}</p>

      {/* Summary */}
      <p className="text-[#444] text-[11px] leading-relaxed line-clamp-2 mt-3">{book.summary || book.reason}</p>
      <span className="text-[13px] font-medium text-black underline underline-offset-2 mt-1 mb-4 cursor-pointer">See more...</span>

      {/* Actions */}
      <div className="mt-auto flex items-center gap-1.5 w-full" onClick={(e) => e.stopPropagation()}>
        <button onClick={onLike} className={`${pill} w-8 flex-shrink-0`} aria-label="Like">
          <ThumbsUp className={`w-[15px] h-[15px] ${isLiked ? "fill-current" : ""}`} />
        </button>
        <button onClick={onDislike} className={`${pill} w-8 flex-shrink-0`} aria-label="Dislike">
          <ThumbsDown className={`w-[15px] h-[15px] ${isDisliked ? "fill-current" : ""}`} />
        </button>
        <button onClick={() => onSave(book)} className={`${pill} w-8 flex-shrink-0`} aria-label="Bookmark">
          {isSaved ? <BookmarkCheck className="w-[15px] h-[15px]" /> : <Bookmark className="w-[15px] h-[15px]" />}
        </button>
        <button onClick={onAddToCollection} className={`${pill} flex-1 gap-1 text-[11px] font-medium whitespace-nowrap`}>
          <Plus className="w-[14px] h-[14px]" /> Add to collection
        </button>
      </div>
    </div>
  );
}
