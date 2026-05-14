import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ChevronRight, Book } from "lucide-react";
import { Link } from "react-router-dom";
import { useData } from "@/context/DataContext";
import { useLang } from "@/context/LanguageContext";
import EmptyState from "./EmptyState";
import { getBookSlug } from "@/lib/slugify";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchModal = ({ isOpen, onClose }: SearchModalProps) => {
  const { books } = useData();
  const { t } = useLang();
  const [query, setQuery] = useState("");

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  // Keyboard shortcut (Esc to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Filter Logic
  const filteredBooks = query.trim() === "" ? [] : books.filter((book) => {
    const q = query.toLowerCase();
    return (
      (book.title?.toLowerCase() || "").includes(q) ||
      (book.author?.toLowerCase() || "").includes(q)
    );
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed left-1/2 top-[10%] -translate-x-1/2 w-full max-w-2xl z-[10000] px-4"
          >
            <div className="bg-[#fdfbf7] dark:bg-[#1a1a1a] rounded-2xl shadow-2xl overflow-hidden border border-amber-500/20">

              {/* Search Header */}
              <div className="relative flex items-center px-4 py-4 border-b border-neutral-200 dark:border-neutral-800">
                <Search className="w-5 h-5 text-gold mr-3" />
                <input
                  autoFocus
                  type="text"
                  placeholder={t.search.placeholder}
                  className="w-full bg-transparent border-none outline-none text-lg text-foreground placeholder:text-neutral-400 font-sans font-medium"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>

              {/* Results Area */}
              <div className="max-h-[60vh] overflow-y-auto p-2">
                {query === "" ? (
                  <div className="py-12 text-center text-neutral-400">
                    <Book className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-sans">{t.search.startTyping}</p>
                  </div>
                ) : filteredBooks.length > 0 ? (
                  <div className="grid gap-2">
                    {filteredBooks.map((book) => (
                      <Link
                        key={book.id}
                        to={`/book/${getBookSlug(book)}`}
                        onClick={onClose}
                        className="flex items-center gap-4 p-3 rounded-xl hover:bg-primary/5 dark:hover:bg-white/5 transition-colors group"
                      >
                        {/* Tiny Cover Thumbnail */}
                        <div className="w-12 h-16 shrink-0 rounded-md overflow-hidden bg-neutral-200 border border-neutral-200 dark:border-neutral-700">
                          {book.cover_url ? (
                            <img src={book.cover_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-neutral-300">
                              <Book className="w-4 h-4 text-neutral-500" />
                            </div>
                          )}
                        </div>

                        {/* Text Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-heading font-black tracking-tight font-bold text-foreground truncate group-hover:text-primary transition-colors">
                            {book.title}
                          </h4>
                          <p className="text-sm text-neutral-500 truncate">{book.author}</p>
                        </div>

                        <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-accent opacity-0 group-hover:opacity-100 transition-all" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  // Uses your new EmptyState component!
                  <div className="py-8">
                    <EmptyState
                      title={t.search.notFound}
                      description={`"${query}" ${t.search.notFoundDesc}`}
                    />
                  </div>
                )}
              </div>

              {/* Footer Tip */}
              <div className="bg-neutral-50 dark:bg-neutral-900/50 px-4 py-2 border-t border-neutral-200 dark:border-neutral-800 flex justify-between items-center text-[10px] text-neutral-400 font-sans uppercase tracking-wider">
                <span>{t.search.label}</span>
                <span>{t.search.close}</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SearchModal;