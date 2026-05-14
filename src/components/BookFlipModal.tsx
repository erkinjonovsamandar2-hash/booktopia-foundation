import { useState } from "react";
import { X, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { BOOK_PREVIEW_PAGES } from "@/lib/mockData";
import { getBookSlug } from "@/lib/slugify";

interface BookFlipModalProps {
  book: { id: string; title: string; author: string } | null;
  onClose: () => void;
}

const pages = BOOK_PREVIEW_PAGES;

const BookFlipModal = ({ book, onClose }: BookFlipModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const navigate = useNavigate();

  if (!book) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center w-screen h-screen bg-background/95 backdrop-blur-xl overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Back to Library Button - Anchored to Modal */}
        <button 
          onClick={onClose}
          className="absolute top-6 left-6 md:top-10 md:left-10 z-50 flex items-center gap-2 px-5 py-2.5 bg-background/50 backdrop-blur-md border border-border/50 rounded-full text-foreground font-medium hover:bg-primary hover:text-white hover:border-amber-500 transition-all duration-300 shadow-sm cursor-pointer group"
        >
          <span className="transform transition-transform duration-300 group-hover:-translate-x-1">&larr;</span> 
          Kutubxonaga qaytish
        </button>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-50 glass-card p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Centered Content Container */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-4xl px-4 mt-8 gap-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <h2 className="text-3xl md:text-4xl font-heading font-black tracking-tight font-bold text-foreground text-center mb-2">
              {book.title}
            </h2>
            <p className="text-muted-foreground text-center mt-1">{book.author}</p>
          </motion.div>

          {/* Book 3D Container */}
          <div className="relative" style={{ perspective: "1500px" }}>
            <div
              className="relative w-64 md:w-80 transition-transform duration-700"
              style={{
                transformStyle: "preserve-3d",
                transform: isOpen ? "rotateY(-15deg)" : "rotateY(0deg)",
              }}
            >
              {/* Book cover (front) */}
              <motion.div
                className="relative rounded-lg overflow-hidden cursor-pointer"
                style={{
                  transformStyle: "preserve-3d",
                  transformOrigin: "left center",
                  transition: "transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                  transform: isOpen ? "rotateY(-160deg)" : "rotateY(0deg)",
                  backfaceVisibility: "hidden",
                  zIndex: isOpen ? 1 : 5,
                }}
                onClick={() => setIsOpen(!isOpen)}
              >
                <div
                  className="flex flex-col items-center justify-center gap-4 p-8"
                  style={{
                    height: "380px",
                    background: "linear-gradient(145deg, hsl(var(--secondary)), hsl(var(--charcoal)))",
                    boxShadow: "4px 4px 20px rgba(0,0,0,0.6), inset -2px 0 8px rgba(247,181,0,0.1)",
                  }}
                >
                  <BookOpen className="h-12 w-12 text-primary/60" />
                  <span className="font-serif text-xl font-bold text-foreground text-center">
                    {book.title}
                  </span>
                  <span className="text-sm text-muted-foreground">{book.author}</span>
                  <span className="mt-4 text-xs text-primary font-sans uppercase tracking-wider">
                    {isOpen ? "Yopish uchun bosing" : "Ochish uchun bosing"}
                  </span>
                </div>
              </motion.div>

              {/* Pages inside (Physical Paper Styling) */}
              {isOpen && (
                <motion.div
                  className="absolute top-0 left-0 w-full rounded-r-3xl rounded-l-md overflow-hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  style={{
                    height: "380px",
                    zIndex: 3,
                  }}
                >
                  <div className="relative h-full p-6 md:p-8 flex flex-col bg-[#FDFBF7] dark:bg-[#1A1814] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-l-[12px] border-[#3b2f2f] dark:border-[#0a0806]">
                    
                    {/* Page crease shadow */}
                    <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-black/10 to-transparent pointer-events-none" />
                    
                    {/* Header with page number */}
                    <div className="flex items-center justify-between mb-4 relative z-10">
                      <span className="text-xs font-sans text-primary/90 dark:text-accent uppercase tracking-wider font-semibold">
                        Sahifa {currentPage + 1} / {pages.length}
                      </span>
                      <span className="font-serif text-xs text-primary dark:text-accent italic">{book.title}</span>
                    </div>

                    {/* Reading content with elegant typography */}
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={currentPage}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="font-serif text-slate-800 dark:text-slate-200 text-lg leading-relaxed text-justify first-letter:text-5xl first-letter:font-bold first-letter:text-primary first-letter:mr-2 first-letter:float-left flex-1 relative z-10"
                      >
                        {pages[currentPage]}
                      </motion.p>
                    </AnimatePresence>

                    {/* Navigation buttons */}
                    <div className="flex items-center justify-between mt-4 relative z-10">
                      <button
                        onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                        disabled={currentPage === 0}
                        className="p-2 text-primary/90 dark:text-accent disabled:opacity-30 hover:text-amber-900 dark:hover:text-amber-300 transition-colors rounded-full hover:bg-primary/10"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setCurrentPage(Math.min(pages.length - 1, currentPage + 1))}
                        disabled={currentPage === pages.length - 1}
                        className="p-2 text-primary/90 dark:text-accent disabled:opacity-30 hover:text-amber-900 dark:hover:text-amber-300 transition-colors rounded-full hover:bg-primary/10"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Book spine shadow */}
              <div
                className="absolute top-0 left-0 w-3 h-full"
                style={{
                  background: "linear-gradient(90deg, rgba(0,0,0,0.4), transparent)",
                  zIndex: 6,
                  pointerEvents: "none",
                }}
              />
            </div>
          </div>

          {!isOpen && (
            <>
              <motion.p
                className="text-sm text-muted-foreground font-sans"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                Kitobni ochish uchun muqovaga bosing →
              </motion.p>
              
              {/* Full Details Button */}
              <motion.button
                onClick={() => {
                  onClose();
                  navigate(`/book/${getBookSlug(book)}`);
                }}
                className="mt-6 px-8 py-3 bg-primary text-foreground font-bold rounded-full hover:scale-105 hover:shadow-[0_0_25px_rgba(251,191,36,0.4)] transition-all"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                To'liq ma'lumotni ko'rish
              </motion.button>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BookFlipModal;