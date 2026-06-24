import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { BookOpen, ChevronRight, AlertTriangle } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useLang, locField } from "@/context/LanguageContext";
import type { Book } from "@/types/database";

import margaritaBg from "../assets/backgrounds/margarita-bg.webp";
import edenBg from "../assets/backgrounds/eden-bg.webp";
import ascanioBg from "../assets/backgrounds/ascanio-bg.webp";
import xukBg from "../assets/backgrounds/xuk-bg.webp";
import { getBookSlug } from "@/lib/slugify";

// ── Per-book tension hooks ────────────────────────────────────────────────────
const BOOK_HOOKS = [
  "Shayton Moskvaga kelsa nima bo'ladi? Va u sizning eng yashirin istaklaringizni bilsa?",
  "Sevgi uchun hamma narsadan voz kechgan odam — oxirida nima topadi?",
  "San'at va muhabbat o'rtasida qolgan inson — qaysi birini tanlasa ham, yo'qotadi. U nima qiladi?",
  "Agar yovuzlik inson tabiatining bir qismi bo'lsa — uni 'davolash' mumkinmi, yoki bu erkinlikni o'ldirish demakmi?",
];

const BOOK_BACKGROUNDS = [
  margaritaBg,
  edenBg,
  ascanioBg,
  xukBg,
];

function getHook(book: Book, index: number) {
  return BOOK_HOOKS[index] || book.description || "";
}

const getImageUrl = (url: string | null | undefined): string => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = import.meta.env.VITE_SUPABASE_URL as string;
  return `${base}/storage/v1/object/public/${url}`;
};

// ── NavControls — stable top-level component (not inside GlobalClassics) ─────
interface NavControlsProps {
  onPrev: () => void;
  onNext: () => void;
  onDot: (i: number) => void;
  displayBooks: Book[];
  activeIndex: number;
}

const NavControls = ({
  onPrev, onNext, onDot, displayBooks, activeIndex,
}: NavControlsProps) => (
  <>
    <div className="hidden md:flex items-center gap-4">
      <motion.button
        onClick={onPrev}
        aria-label="Previous book"
        whileHover={{ borderColor: "var(--accent)", background: "rgba(229,193,88,0.15)" }}
        whileTap={{ scale: 0.92 }}
        className="w-10 h-10 rounded-full border border-accent/40 bg-transparent flex items-center justify-center text-accent cursor-pointer"
      >
        <motion.div className="flex items-center justify-center w-4 h-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
        </motion.div>
      </motion.button>

      <motion.button
        onClick={onNext}
        aria-label="Next book"
        whileHover={{ borderColor: "var(--accent)", background: "rgba(229,193,88,0.15)" }}
        whileTap={{ scale: 0.92 }}
        className="w-10 h-10 rounded-full border border-accent/40 bg-transparent flex items-center justify-center text-accent cursor-pointer"
      >
        <motion.div className="flex items-center justify-center w-4 h-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </motion.div>
      </motion.button>
    </div>

    <div className="flex items-center gap-1.5 ml-2">
      {displayBooks.map((b, i) => (
        <motion.div
          key={b.id}
          onClick={() => onDot(i)}
          animate={{
            width: i === activeIndex ? 20 : 4,
            backgroundColor: i === activeIndex
              ? "var(--accent)"
              : "rgba(255,255,255,0.25)",
          }}
          whileHover={{ opacity: 1, scaleY: 1.4 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="h-1 rounded-full shrink-0 cursor-pointer"
        />
      ))}
    </div>
  </>
);

// ── Main Component ────────────────────────────────────────────────────────────
export default function GlobalClassics() {
  const { books, loading, booksError } = useData() as ReturnType<typeof useData> & { booksError?: boolean };
  const { lang } = useLang();
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileIndex, setMobileIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);

  const displayBooks = useMemo(() => {
    const goldBooks = books.filter(b => b.category === "gold");
    return goldBooks.length > 0 ? goldBooks.slice(0, 4) : books.slice(0, 4);
  }, [books]);
  const total = displayBooks.length;
  const activeBook = displayBooks[activeIndex];
  const displayIndex = isMobile ? mobileIndex : activeIndex;

  const thumbBooks = useMemo(() => {
    if (total <= 1) return [];
    return Array.from({ length: Math.min(3, total - 1) }, (_, i) =>
      displayBooks[(activeIndex + i + 1) % total]
    );
  }, [displayBooks, activeIndex, total]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Mobile Infinite Auto-Scroll ───────────────────────────────────────────
  useEffect(() => {
    if (!isMobile || !mobileScrollRef.current || total === 0) return;
    const scroller = mobileScrollRef.current;
    const delay = mobileIndex === 0 ? 3000 : 6000;
    const timer = setTimeout(() => {
      const isEnd = mobileIndex >= total - 1;
      if (isEnd) {
        scroller.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        scroller.scrollBy({ left: 344, behavior: "smooth" });
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [mobileIndex, isMobile, total]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const goTo = useCallback(
    (idx: number, dir: number) => {
      if (isAnimating || total === 0) return;
      setDirection(dir);
      setActiveIndex(idx);
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 800);
    },
    [isAnimating, total]
  );

  const handleNext = useCallback(() => {
    if (total === 0) return;
    goTo((activeIndex + 1) % total, 1);
  }, [activeIndex, total, goTo]);

  const handlePrev = useCallback(() => {
    if (total === 0) return;
    goTo((activeIndex - 1 + total) % total, -1);
  }, [activeIndex, total, goTo]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (total > 1) timerRef.current = setInterval(handleNext, 6000);
  }, [handleNext, total]);

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resetTimer]);

  const onNext = useCallback(() => { handleNext(); resetTimer(); }, [handleNext, resetTimer]);
  const onPrev = useCallback(() => { handlePrev(); resetTimer(); }, [handlePrev, resetTimer]);
  const onDot = useCallback((i: number) => {
    if (i !== activeIndex) { goTo(i, i > activeIndex ? 1 : -1); resetTimer(); }
  }, [activeIndex, goTo, resetTimer]);
  const onThumb = useCallback((i: number) => {
    onDot((activeIndex + i + 1) % total);
  }, [activeIndex, total, onDot]);

  // ── Error State ──────────────────────────────────────────────────────────
  if (booksError) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center justify-center py-12 text-center" role="alert">
          <AlertTriangle className="w-8 h-8 text-muted-foreground mb-3" />
          <p className="font-sans text-sm text-muted-foreground">Kitoblarni yuklashda xatolik yuz berdi</p>
          <p className="font-sans text-xs text-muted-foreground/70 mt-1">Iltimos, sahifani yangilang</p>
        </div>
      </div>
    );
  }

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (loading || total === 0) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center gap-6 px-6 pt-24 pb-20 bg-background overflow-hidden relative" aria-hidden="true">
        <div className="flex items-center gap-8 w-full max-w-7xl mx-auto justify-between">
          <div className="flex-1 flex flex-col gap-6">
            <div className="skeleton-shimmer w-48 h-10 rounded-md" />
            <div className="skeleton-shimmer w-full h-80 rounded-2xl" />
          </div>
          <div className="shrink-0 flex justify-center w-[260px] sm:w-[300px] lg:w-[340px]">
            <div className="skeleton-shimmer w-full aspect-[2/3] rounded-[14px] shadow-2xl" />
          </div>
          <div className="flex-1 hidden lg:flex flex-col items-end gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-shimmer w-[105px] aspect-[2/3] rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section
      id="global-classics"
      className="section-gpu relative w-full min-h-screen bg-cover bg-center transition-all duration-1000 ease-in-out overflow-hidden transform-gpu"
      style={{ backgroundImage: `url(${BOOK_BACKGROUNDS[displayIndex] || BOOK_BACKGROUNDS[0]})` }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-background/30 z-0 transition-colors duration-700" />

      {/* Section Title */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-8 pt-20 lg:pt-32">
        <h2 className="font-heading text-5xl sm:text-6xl lg:text-7xl text-foreground tracking-tight text-left w-full relative z-10 mb-2 md:mb-4">
          JAHON KLASSIKLARI
        </h2>
      </div>

      {/* Gold Pulse Keyframes */}
      <style>{`
        .hero-cover {
          box-shadow: 8px 28px 70px rgba(0,0,0,0.80), -2px 0 18px rgba(0,0,0,0.40), 0 0 40px rgba(229,193,88,0.25);
          cursor: pointer;
          transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.4s cubic-bezier(0.25, 1, 0.5, 1), filter 0.4s ease;
        }
        .hero-cover:hover {
          transform: perspective(900px) rotateY(-4deg) rotateX(1deg) !important;
          box-shadow: 8px 28px 70px rgba(0,0,0,0.85), -2px 0 18px rgba(0,0,0,0.40), 0 0 80px rgba(229,193,88,0.5);
          filter: brightness(1.08);
        }
      `}</style>

      {/* ── DESKTOP LAYOUT ── */}
      {!isMobile && (
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-8 pb-24 lg:pb-32 flex flex-col pt-8">
          <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-8">

            {/* LEFT — Glass card */}
            <AnimatePresence mode="wait">
              {activeBook && (
                <motion.div
                  key={`text-${activeBook.id}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="flex-1 w-full lg:max-w-lg bg-card border-[0.5px] border-border rounded-[var(--radius)] p-6 md:p-8 shadow-sm flex flex-col items-start text-left z-10"
                >
                  {/* Genre + meta */}
                  <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                    <span className="font-sans text-[11px] font-bold tracking-[0.2em] uppercase bg-gold text-white rounded-[4px] px-[9px] py-[3px]">
                      {activeBook.category}
                    </span>
                    {activeBook.price && (
                      <span className="font-sans font-bold uppercase text-[11px] text-foreground/45 tracking-[0.2em]">
                        {activeBook.price.toLocaleString()} so'm
                      </span>
                    )}
                  </div>

                  {/* Counter + Author */}
                  <div className="font-sans font-bold text-[11px] sm:text-[13px] uppercase tracking-[0.2em] text-foreground/80 mb-3 flex items-center gap-2">
                    <span>
                      {String(activeIndex + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
                    </span>
                    <span className="text-foreground/40 text-[0.6rem]">◆</span>
                    <span>{activeBook.author}</span>
                  </div>

                  {/* Title */}
                  <h3 className="font-heading text-4xl md:text-5xl text-foreground font-bold mb-4 drop-shadow-md leading-[1.05] tracking-wide">
                    {activeBook.title}
                  </h3>

                  {/* Hook */}
                  {getHook(activeBook, activeIndex) && (
                    <p className="font-serif text-xl md:text-2xl text-foreground/90 italic leading-loose mb-8 drop-shadow-sm">
                      {getHook(activeBook, activeIndex)}
                    </p>
                  )}

                  {/* CTA */}
                  <motion.button
                    whileTap={{ scale: 0.985 }}
                    onClick={() => navigate(`/book/${getBookSlug(activeBook)}`)}
                    className="btn-glass"
                  >
                    <BookOpen className="h-4 w-4" />
                    <span className="font-sans font-bold text-[11px] tracking-[0.2em] uppercase">Batafsil o'qish</span>
                    <ChevronRight className="h-4 w-4" />
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CENTER — Hero cover */}
            <div className="shrink-0 relative z-30 flex justify-center w-[260px] sm:w-[300px] lg:w-[340px] translate-y-8 lg:translate-y-12">
              <AnimatePresence mode="popLayout" custom={direction}>
                {activeBook && (
                  <motion.div
                    key={`hero-${activeBook.id}`}
                    custom={direction}
                    variants={{
                      initial: (dir: number) => ({ opacity: 0, x: dir > 0 ? 90 : -90, scale: 0.93 }),
                      animate: { opacity: 1, x: 0, scale: 1 },
                      exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -90 : 90, scale: 0.93 }),
                    }}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
                    className="hero-cover relative w-full aspect-[2/3] rounded-[14px] overflow-hidden"
                  >
                    {/* FIX: bg-muted as placeholder prevents layout shift while image loads */}
                    <div
                      className="absolute inset-0 bg-cover bg-center bg-muted"
                      style={{ backgroundImage: `url(${getImageUrl(activeBook.cover_url)})` }}
                    />
                    <div aria-hidden="true" className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-br from-white/10 via-transparent to-black/30" />
                    <div aria-hidden="true" className="absolute top-0 bottom-0 left-0 w-[10px] z-[2] pointer-events-none" style={{ background: "linear-gradient(to right, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.08) 1px, rgba(0,0,0,0.28) 3px, rgba(0,0,0,0.65) 6px, transparent 10px)" }} />
                    <div aria-hidden="true" className="absolute top-0 left-0 right-0 h-px z-[3] bg-gradient-to-r from-transparent via-accent/70 to-transparent" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* RIGHT — Thumbnail strip */}
            {/* FIX: Removed [content-visibility:auto] from motion.div — caused
                scroll stoppage and flashing because Framer Motion's whileHover
                and animate conflict with the browser's content-visibility
                paint skipping. Thumbnails are always visible in the viewport
                anyway so content-visibility provides zero benefit here.     */}
            <div className="flex-1 flex-col items-center lg:items-end w-full hidden lg:flex gap-[14px]">
              {thumbBooks.map((book, i) => (
                <motion.div
                  key={`thumb-${book.id}-${i}`}
                  onClick={() => onThumb(i)}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 0.5, x: 0 }}
                  whileHover={{
                    opacity: 1,
                    boxShadow: "0 14px 34px rgba(0,0,0,0.65), 0 0 0 1px rgba(229,193,88,0.50)",
                  }}
                  transition={{ duration: 0.5, delay: i * 0.07, ease: "easeOut" }}
                  className="relative w-[clamp(76px,7.5vw,105px)] aspect-[2/3] rounded-lg overflow-hidden cursor-pointer border border-accent/20 shadow-lg shrink-0 bg-muted"
                  style={{
                    backgroundImage: `url(${getImageUrl(book.cover_url)})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <div className="absolute bottom-0 left-0 right-0 p-[18px_7px_7px] bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
                    <p className="m-0 font-sans text-[8px] font-semibold tracking-[0.06em] text-white/90 uppercase leading-[1.3] line-clamp-2 overflow-hidden">
                      {book.title}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

          </div>

          {/* Nav Controls */}
          <div className="flex items-center gap-4 mt-8">
            <NavControls
              onPrev={onPrev}
              onNext={onNext}
              onDot={onDot}
              displayBooks={displayBooks}
              activeIndex={activeIndex}
            />
          </div>
        </div>
      )}

      {/* ── MOBILE CAROUSEL ── */}
      {/* FIX: Removed [content-visibility:auto] from mobile card div — the
          whileInView on the inner motion.div was conflicting with the browser's
          paint-skip, causing images to flash and scroll to stutter.          */}
      {isMobile && (
        <div className="relative z-10 w-full pt-16 pb-16 flex flex-col justify-start min-h-screen">
          <div
            ref={mobileScrollRef}
            onScroll={(e) => {
              const scroller = e.currentTarget;
              const index = Math.round(
                scroller.scrollLeft / (scroller.scrollWidth / total)
              );
              setMobileIndex(index);
            }}
            className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-12 w-full hide-scrollbar relative z-40 px-[calc(50vw-160px)]"
            style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
          >
            {displayBooks.map((book, idx) => (
              <div
                key={`mob-${book.id}`}
                className="w-[85vw] max-w-[320px] shrink-0 snap-center flex flex-col items-center justify-start relative px-1 pb-6"
              >
                {/* Cover — FIX: bg-muted on wrapper prevents layout shift */}
                <div className="w-[140px] sm:w-[160px] md:w-[260px] shrink-0 mx-auto mb-6 relative z-10">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] -z-10 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(229,193,88,0.3) 0%, transparent 70%)" }} />
                  {/* FIX: aspect-[2/3] + bg-muted on wrapper = stable placeholder
                      before image loads, preventing cumulative layout shift    */}
                  <div className="w-full aspect-[2/3] rounded-md bg-muted overflow-hidden shadow-2xl relative z-10">
                    <img
                      src={getImageUrl(book.cover_url)}
                      alt={book.title}
                      className="img-fade w-full h-full object-cover"
                      loading="lazy"
                      onLoad={(e) => (e.currentTarget as HTMLImageElement).classList.add('loaded')}
                    />
                  </div>
                </div>

                {/* Info card */}
                <div className="w-full bg-card border-[0.5px] border-border rounded-[var(--radius)] p-5 text-center flex flex-col items-center gap-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <span className="text-[11px] font-sans font-bold tracking-[0.2em] uppercase bg-gold text-white rounded px-2 py-1">
                      {book.category}
                    </span>
                    {book.price && (
                      <span className="text-[11px] text-foreground/45 tracking-[0.2em] font-sans font-bold uppercase">
                        {book.price.toLocaleString()} so'm
                      </span>
                    )}
                  </div>

                  <h3 className="font-heading text-2xl text-foreground font-bold drop-shadow-md leading-tight m-0">
                    {book.title}
                  </h3>

                  <div className="font-sans font-bold text-xs uppercase tracking-widest text-foreground/80 drop-shadow-sm">
                    {book.author}
                  </div>

                  {getHook(book, idx) && (
                    <p className="font-serif text-xl sm:text-2xl italic text-foreground/90 leading-relaxed drop-shadow-sm text-center max-w-3xl mx-auto">
                      {getHook(book, idx)}
                    </p>
                  )}

                  <button
                    onClick={() => navigate(`/book/${getBookSlug(book)}`)}
                    className="mt-2 btn-glass"
                  >
                    Batafsil
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                      className="w-3 h-3 ml-1">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </section>
  );
}