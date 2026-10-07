"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Bookmark, BookmarkCheck, ThumbsUp, ThumbsDown, ChevronDown } from "lucide-react";

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

  useEffect(() => {
    gsap.fromTo(cardRef.current,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, delay: index * 0.1, ease: "power2.out" }
    );
  }, [index]);

  return (
    <div ref={cardRef} className="book-card bg-[#f4f4f4] border-none rounded-[16px] p-5 hover:bg-[#ebebeb] transition-colors flex flex-col sm:flex-row gap-4 relative">
      
      {/* Cover / Placeholder */}
      <div className="w-[75px] h-[110px] rounded-md shadow-sm border border-black/5 flex-shrink-0 flex flex-col items-center justify-center relative overflow-hidden bg-[#e5e5e5]">
        {book.coverUrl ? (
           <img src={book.coverUrl} alt={book.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="p-2 text-center w-full">
            <span className="text-[9px] font-medium text-gray-500 line-clamp-4 leading-tight">
              {book.title}
            </span>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Title & Author */}
        <h3 className="text-[15px] font-bold text-[#141414] mb-0.5 leading-tight font-serif truncate">
          {book.title}
        </h3>
        <p className="text-[#141414] text-[11px] mb-2 truncate">
          by {book.author || "Unknown"} {book.firstPublishYear && `(${book.firstPublishYear})`}
        </p>
        
        {/* Description / Reason */}
        <div className="mb-3">
          <p className="text-[#141414] text-[12px] line-clamp-2 leading-relaxed">
            {book.summary || book.reason}
          </p>
          <span className="text-[11px] font-medium text-[#141414] hover:text-black cursor-pointer mt-0.5 inline-block transition-colors underline underline-offset-2">
            See more..
          </span>
        </div>
        
        {/* Action Bar */}
        <div className="mt-auto pt-2 flex items-center justify-between border-t border-gray-200/50">
          <div className="flex items-center gap-1.5">
            <button 
              onClick={onLike}
              className={`transition-colors p-1 rounded-full hover:bg-black/5 ${isLiked ? "text-indigo-600" : "text-[#141414] hover:text-black"}`}
            >
              <ThumbsUp className={`w-[14px] h-[14px] ${isLiked ? "fill-current" : ""}`} />
            </button>
            <button 
              onClick={onDislike}
              className={`transition-colors p-1 rounded-full hover:bg-black/5 ${isDisliked ? "text-indigo-600" : "text-[#141414] hover:text-black"}`}
            >
              <ThumbsDown className={`w-[14px] h-[14px] ${isDisliked ? "fill-current" : ""}`} />
            </button>
            <button 
              onClick={() => onSave(book)}
              className={`transition-colors p-1 rounded-full hover:bg-black/5 ${isSaved ? "text-indigo-600" : "text-[#141414] hover:text-black"}`}
            >
              {isSaved ? <BookmarkCheck className="w-[14px] h-[14px]" /> : <Bookmark className="w-[14px] h-[14px]" />}
            </button>
          </div>
          
          <button 
            onClick={onAddToCollection}
            className="flex items-center gap-1 text-[11px] font-medium text-[#141414] hover:text-black transition-colors bg-transparent border-none p-0"
          >
            Add to collection
            <ChevronDown className="w-[12px] h-[12px] text-[#141414]" />
          </button>
        </div>

      </div>
    </div>
  );
}
