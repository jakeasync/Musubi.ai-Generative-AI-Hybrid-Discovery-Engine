import React from 'react';

type BookSidePanelProps = {
  selectedBook: any;
  setSelectedBook: (book: any) => void;
  bookSummary: string;
  isLoadingSummary: boolean;
};

export default function BookSidePanel({
  selectedBook,
  setSelectedBook,
  bookSummary,
  isLoadingSummary,
}: BookSidePanelProps) {
  return (
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
  );
}
