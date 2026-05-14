// @refresh reset
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronRight, ChevronLeft, Library, BookOpen, ChevronDown, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/context/DataContext";
import { useLang, locField, type Lang } from "@/context/LanguageContext";
import type { Book } from "@/types/database";
import { getBookSlug } from "@/lib/slugify";

// ── Constants ─────────────────────────────────────────────────────────────────
const INTERVAL_MS = 5000;
const CARD_W_DESK = 76;
const CARD_W_MOB = 60;

// ── Resolve cover URL ─────────────────────────────────────────────────────────
const getImageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = import.meta.env.VITE_SUPABASE_URL as string;
  return `${base}/storage/v1/object/public/${url}`;
};

// ── Animated Mesh Background ──────────────────────────────────────────────────
const Background = () => (
  <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
    {/* Mesh Container — 4 animated orbs */}
    <div className="absolute inset-0">
      {/* Orb 1 */}
      <div
        className="hero-orb absolute rounded-full pointer-events-none will-change-transform"
        style={{
          width: "clamp(50vw, 60vw, 70vw)",
          height: "clamp(50vw, 60vw, 70vw)",
          opacity: 0.72,
          background: "radial-gradient(circle, hsl(213,60%,20%), transparent 70%)",
          top: "-10%",
          left: "-5%",
          animation: "heroOrb1 50s ease-in-out infinite alternate",
        }}
      />

      {/* Orb 2 */}
      <div
        className="hero-orb absolute rounded-full pointer-events-none will-change-transform"
        style={{
          width: "clamp(55vw, 65vw, 75vw)",
          height: "clamp(55vw, 65vw, 75vw)",
          opacity: 0.75,
          background: "radial-gradient(circle, hsl(192,100%,25%), transparent 70%)",
          top: "15%",
          right: "-8%",
          animation: "heroOrb2 60s ease-in-out infinite alternate",
        }}
      />

      {/* Orb 3 */}
      <div
        className="hero-orb absolute rounded-full pointer-events-none will-change-transform"
        style={{
          width: "clamp(48vw, 58vw, 68vw)",
          height: "clamp(48vw, 58vw, 68vw)",
          opacity: 0.68,
          background: "radial-gradient(circle, hsl(213,80%,12%), transparent 70%)",
          bottom: "5%",
          left: "10%",
          animation: "heroOrb3 45s ease-in-out infinite alternate",
        }}
      />

      {/* Orb 4 */}
      <div
        className="hero-orb absolute rounded-full pointer-events-none will-change-transform"
        style={{
          width: "clamp(52vw, 62vw, 72vw)",
          height: "clamp(52vw, 62vw, 72vw)",
          opacity: 0.8,
          background: "radial-gradient(circle, hsl(207,48%,18%), transparent 70%)",
          bottom: "-5%",
          right: "5%",
          animation: "heroOrb4 70s ease-in-out infinite alternate",
        }}
      />
    </div>

    {/* Base overlay to tint mesh */}
    <div className="absolute inset-0 bg-background/40 z-0 transition-colors duration-500" />

    {/* Grain overlay provided by section wrapper .grain-overlay */}

    {/* Subtle vignette */}
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.08)_100%)]" />
  </div>
);

// ── Word-Wipe Headline ───────────────────────────────────────────────────────
const TypewriterHeadline = ({ text }: { text: string }) => {
  const reduced = useReducedMotion();
  const words = text.trim().split(" ");

  return (
    <div className="relative w-full flex justify-center lg:justify-start overflow-hidden">
      <motion.h1
        className="text-5xl sm:text-6xl lg:text-7xl font-heading leading-[1.01] text-foreground tracking-wide text-center lg:text-left drop-shadow-sm text-balance max-w-2xl mx-auto lg:mx-0 will-change-transform"
      >
        {words.map((word, wIndex) => {
          const isHighlighted = wIndex >= words.length - 2;

          return (
            <span key={`w-${wIndex}`} className="inline-block mr-2 lg:mr-3 overflow-hidden py-1">
              <motion.span
                initial={reduced ? { opacity: 0 } : { y: "100%" }}
                animate={reduced ? { opacity: 1 } : { y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: wIndex * 0.08,
                  ease: [0.16, 1, 0.3, 1], // easeOutQuint
                }}
                className={`inline-block ${isHighlighted ? "text-primary" : ""}`}
              >
                {word}
              </motion.span>
            </span>
          );
        })}
      </motion.h1>
    </div>
  );
};

// ── Animated Number ───────────────────────────────────────────────────────────
const AnimatedNumber = ({ target }: { target: number }) => {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (reduced) { setCount(target); return; }
    let startTime: number | null = null;
    let raf: number;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / 1500, 1);
      setCount(Math.floor((1 - Math.pow(1 - progress, 3)) * target));
      if (progress < 1) raf = requestAnimationFrame(step);
      else setCount(target);
    };
    const timeout = setTimeout(() => { raf = requestAnimationFrame(step); }, 600);
    return () => { clearTimeout(timeout); cancelAnimationFrame(raf); };
  }, [target, reduced]);

  return <>{count}</>;
};

// ── Unified Horizontal Stats & CTA Band ──────────────────────────────────────
const CtaStatsBand = ({ onNavigate, ctaText }: { onNavigate: () => void; ctaText?: string }) => {
  return (
    <motion.div
      className="flex flex-col sm:flex-row items-center sm:items-stretch gap-5 mt-8 w-full xl:w-auto"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.6 }}
    >
      {/* $8k UI Glassmorphism */}
      <div className="flex items-center justify-between sm:justify-center rounded-2xl border border-white/60 dark:border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-md py-3.5 px-6 sm:px-10 shadow-[0_8px_30px_rgba(38,89,153,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.12)] w-full max-w-[480px] sm:w-auto transition-colors duration-500 ease-out gap-4 sm:gap-6">

        <div className="flex flex-col items-center text-center">
          <p className="font-heading text-3xl sm:text-4xl text-foreground">
            2<span className="text-xl italic">Yillik</span>
          </p>
          <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-gold mt-1 font-bold">Faoliyat</p>
        </div>

        <div className="w-px h-12 bg-border mx-2 sm:mx-0" />

        <div className="flex flex-col items-center text-center">
          <p className="font-heading text-3xl sm:text-4xl text-foreground">
            20<span className="text-xl italic">+</span>
          </p>
          <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-gold mt-1 font-bold">Sara asarlar</p>
        </div>

        <div className="w-px h-12 bg-border mx-2 sm:mx-0" />

        <div className="flex flex-col items-center text-center">
          <p className="font-heading text-3xl sm:text-4xl text-foreground">
            5000<span className="text-xl italic">+</span>
          </p>
          <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-gold mt-1 font-bold">Kitobxonlar</p>
        </div>

      </div>

      <motion.button
        onClick={onNavigate}
        whileTap={{ scale: 0.985 }}
        className="btn-glass flex flex-row items-center justify-center gap-2 group w-full max-w-[360px] sm:w-auto px-10 py-4 transition-all duration-500 ease-out z-10 rounded-2xl relative overflow-hidden"
      >
        <Library className="h-4 w-4 relative z-10" />
        <span className="font-sans font-bold text-[11px] sm:text-[13px] tracking-[0.2em] uppercase relative z-10">{ctaText || "KUTUBXONANI KO'RISH"}</span>
        <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-500 ease-out relative z-10" />
      </motion.button>
    </motion.div>
  );
};

// ── Active Book Showcase ──────────────────────────────────────────────────────
const ActiveBookShowcase = ({
  book, lang, onClick,
}: {
  book: Book; lang: Lang; onClick: () => void;
}) => {
  const imgSrc = getImageUrl(book.cover_url);
  const glow = `hsl(${book.bg_color ?? "207 48% 51%"})`;

  return (
    <motion.div
      key={book.id}
      className="absolute inset-0 cursor-pointer select-none flex flex-col items-center justify-start pt-2 will-change-transform"
      initial={{ opacity: 0, scale: 0.7, rotateY: -30, y: 50 }}
      animate={{ opacity: 1, scale: 1, rotateY: 0, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, rotateY: 20, y: -40 }}
      transition={{ type: "spring", stiffness: 90, damping: 18, mass: 1.1 }}
      onClick={onClick}
    >
      <div className="relative w-full flex items-center justify-center mb-3 sm:mb-4">
        {/* Relative wrapper matches the book's dimensions exactly */}
        <div className="relative w-[150px] sm:w-[200px] lg:w-[240px] aspect-[2/3] z-20">

          {/* Glow locked to cover boundary */}
          <div
            className="absolute inset-[-15%] z-0 pointer-events-none rounded-full"
            style={{ background: `radial-gradient(circle, ${glow}60 0%, transparent 60%)` }}
          />

          {/* 3D Cover */}
          <motion.div
            className="relative z-10 w-full h-full rounded-[6px] sm:rounded-[10px] overflow-hidden will-change-transform"
            style={{
              boxShadow: `0 20px 40px -12px ${glow}99, 0 10px 20px -8px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.2)`,
            }}
            whileHover={{ rotateY: -5, rotateX: 2 }}
          >
            {imgSrc
              ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1.2 }}
                  className="w-full h-full bg-muted aspect-[2/3]"
                >
                  <img src={imgSrc} alt={locField(book, "title", lang)} width={240} height={360} loading="eager" decoding="async" className="w-full h-full object-cover" draggable={false} />
                </motion.div>
              )
              : <div className="w-full h-full bg-muted aspect-[2/3]" />
            }
            <motion.div
              className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent mix-blend-overlay pointer-events-none"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 1.5, delay: 0.2, ease: "easeOut" }}
            />
            <div aria-hidden className="absolute inset-y-0 left-0 w-[10px] pointer-events-none" style={{ background: "linear-gradient(to right, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.08) 1px, rgba(0,0,0,0.28) 3px, rgba(0,0,0,0.65) 6px, transparent 10px)" }} />
            <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.08] via-transparent to-black/25 pointer-events-none" />
          </motion.div>

          {/* Star badge — locked to top-right corner of cover wrapper */}
          <div className="absolute -top-3 -right-3 z-30 w-8 h-8 sm:w-10 sm:h-10 bg-accent text-accent-foreground rounded-full flex items-center justify-center shadow-lg border-2 border-background">
            <Star className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-center px-4 py-2 sm:px-6 sm:py-3 w-max max-w-[95%] mx-auto rounded-xl backdrop-blur-xl bg-background/95 border border-border/50 shadow-lg z-30"
      >
        <h2 className="font-serif font-bold text-lg sm:text-2xl text-foreground leading-tight tracking-wide line-clamp-2">
          {locField(book, "title", lang)}
        </h2>
        <p className="mt-1 font-sans font-bold text-[10px] sm:text-xs tracking-[0.2em] uppercase text-gold line-clamp-1">
          {locField(book, "author", lang)}
        </p>
      </motion.div>
    </motion.div>
  );
};

// ── Book Info Panel ───────────────────────────────────────────────────────────
const BookInfoPanel = ({
  motto, subtitle, ctaText, onNavigate,
}: {
  motto: string; subtitle: string; ctaText?: string; onNavigate: () => void;
}) => {
  const formatSubtitle = (text?: string) => {
    if (!text) return null;
    const separator = text.includes(" — ") ? " — " : text.includes(" - ") ? " - " : null;
    if (separator) {
      const parts = text.split(separator);
      const brand = parts.shift();
      const rest = parts.join(separator);
      return (
        <>
          <strong className="font-bold text-foreground">{brand}</strong>
          <span className="text-gold font-bold mx-1.5">—</span>
          <span className="text-foreground/90 font-medium">{rest}</span>
        </>
      );
    }
    return <span className="text-foreground/90 font-medium">{text}</span>;
  };

  return (
    <div className="flex flex-col items-center lg:items-start justify-center flex-1 min-w-0 w-full pt-0 lg:pt-2 z-20">
      <TypewriterHeadline text={motto} />

      {/* EDITORIAL SUBTITLE */}
      <motion.div
        className="relative mt-4 sm:mt-6 mb-2 max-w-xl"
        initial={{ opacity: 0, x: -15 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
      >
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gold rounded-l-xl shadow-[0_0_10px_rgba(213,173,54,0.4)]" />
        <div className="pl-4">
          <p className="text-sm sm:text-base lg:text-lg leading-relaxed bg-white/50 dark:bg-black/20 backdrop-blur-md rounded-r-xl rounded-l-sm py-3 sm:py-4 px-5 shadow-[0_8px_30px_rgba(38,89,153,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-white/60 dark:border-white/10 transition-colors duration-500 ease-out">
            {formatSubtitle(subtitle)}
          </p>
        </div>
      </motion.div>

      <CtaStatsBand onNavigate={onNavigate} ctaText={ctaText} />
    </div>
  );
};

// ── Mini Shelf Carousel ───────────────────────────────────────────────────────
const MiniShelf = ({
  books, activeIndex, total, duration, isPaused, onSelect, onPrev, onNext, lang,
}: {
  books: Book[]; activeIndex: number; total: number; duration: number;
  isPaused: boolean; onSelect: (i: number) => void;
  onPrev: () => void; onNext: () => void; lang: Lang;
}) => {
  const stripRef = useRef<HTMLDivElement>(null);

  // Scroll strip so active thumb stays centered
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const thumb = strip.children[activeIndex] as HTMLElement | undefined;
    if (!thumb) return;
    strip.scrollTo({
      left: thumb.offsetLeft - strip.offsetWidth / 2 + thumb.offsetWidth / 2,
      behavior: "smooth",
    });
  }, [activeIndex]);

  return (
    <div className="flex items-center gap-1 sm:gap-3 mt-6 sm:mt-8 w-full max-w-2xl px-1 sm:px-0">
      <motion.button
        whileHover={{ scale: 1.1, backgroundColor: "rgba(0,0,0,0.05)" }}
        whileTap={{ scale: 0.9 }}
        onClick={onPrev}
        className="p-1.5 rounded-full text-foreground/70 transition-colors focus:outline-none shrink-0 hidden sm:flex backdrop-blur-sm"
      >
        <ChevronLeft className="h-6 w-6" />
      </motion.button>

      <div ref={stripRef} className="flex items-end gap-2.5 sm:gap-3 overflow-x-auto flex-1 justify-start py-4 px-2 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {books.map((book, i) => {
          const isActive = i === activeIndex;
          const imgSrc = getImageUrl(book.cover_url);
          const diff = Math.abs(i - activeIndex);

          return (
            <motion.button
              key={book.id}
              onClick={() => onSelect(i)}
              aria-label={locField(book, "title", lang)}
              className={`relative overflow-hidden rounded-[5px] focus:outline-none shrink-0 cursor-pointer snap-center group will-change-transform w-[60px] sm:w-[76px] aspect-[2/3] transition-[filter] duration-300 ${!isActive ? "grayscale-[40%]" : "grayscale-0"}`}
              whileHover={!isActive ? { y: -4 } : {}}
              animate={{
                scale: isActive ? 1.15 : Math.max(0.75, 1 - diff * 0.08),
                opacity: isActive ? 1 : Math.max(0.5, 1 - diff * 0.15),
                y: isActive ? -6 : 0,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              style={{
                boxShadow: isActive
                  ? "0 10px 20px rgba(0,0,0,0.3)"
                  : "0 4px 8px rgba(0,0,0,0.2)",
              }}
            >
              {imgSrc
                ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true, amount: 0.1, margin: "50px" }}
                    transition={{ duration: 1.2 }}
                    className="w-full h-full bg-muted aspect-[2/3] transform-gpu"
                  >
                    <img src={imgSrc} alt="" width={76} height={114} loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform group-hover:scale-105" draggable={false} />
                  </motion.div>
                )
                : <div className="w-full h-full bg-muted aspect-[2/3]" />
              }
              {!isActive && (
                <div className="absolute inset-0 ring-2 ring-primary/0 group-hover:ring-primary/40 transition-all rounded-[5px]" />
              )}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/40 overflow-hidden">
                  <motion.div
                    className="h-full bg-primary"
                    key={`prog-${activeIndex}`}
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={
                      isPaused
                        ? { duration: 0 }
                        : { duration: duration / 1000, ease: "linear" }
                    }
                  />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      <motion.button
        whileHover={{ scale: 1.1, backgroundColor: "rgba(0,0,0,0.05)" }}
        whileTap={{ scale: 0.9 }}
        onClick={onNext}
        className="p-1.5 rounded-full text-foreground/70 transition-colors focus:outline-none shrink-0 hidden sm:flex backdrop-blur-sm"
      >
        <ChevronRight className="h-6 w-6" />
      </motion.button>
    </div>
  );
};

// ── Scroll CTA ────────────────────────────────────────────────────────────────
const ScrollCta = () => {
  const handleClick = () => {
    const hero = document.getElementById("hero");
    const target = hero ? hero.offsetTop + hero.offsetHeight : window.innerHeight;
    window.scrollTo({ top: target, behavior: "smooth" });
  };

  return (
    <motion.div
      className="w-full flex flex-col items-center gap-3 mt-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 2.4, duration: 0.7 }}
    >
      <div className="w-px h-8 sm:h-12 bg-gradient-to-b from-transparent to-primary/60" />
      <button
        onClick={handleClick}
        className="group flex flex-col items-center justify-center gap-1.5 px-6 py-2.5 rounded-full focus:outline-none backdrop-blur-md bg-white/40 dark:bg-black/20 border border-white/60 dark:border-white/10 shadow-[0_8px_30px_rgba(38,89,153,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-colors duration-500 ease-out"
        aria-label="Safarni boshlash"
      >
        <span className="font-serif italic text-[14px] sm:text-[15px] text-foreground/85 group-hover:text-gold transition-colors">
          Sahifalarga sho'ng'ish
        </span>
        <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-foreground/70 group-hover:text-gold transition-colors mt-1" />
      </button>
    </motion.div>
  );
};

// ── Main Hero ─────────────────────────────────────────────────────────────────
const Hero = () => {
  const { books, siteSettings, loading } = useData();
  const { lang } = useLang();
  const navigate = useNavigate();

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [timerKey, setTimerKey] = useState(0); // incremented on manual nav to restart interval
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const displayBooks: Book[] = (
    books.filter((b) => b.featured === true).length > 0
      ? books.filter((b) => b.featured === true)
      : books
  );

  const total = displayBooks.length;
  const advance = useCallback(
    (dir: 1 | -1) => setActiveIndex((p) => (p + dir + total) % total),
    [total]
  );

  // timerKey is incremented on manual nav — causes this effect to re-run,
  // which clears the old interval (via cleanup) and starts a fresh 5s cycle.
  useEffect(() => {
    if (isPaused || total < 2) return;
    timerRef.current = setInterval(() => advance(1), INTERVAL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPaused, advance, total, timerKey]);

  const manualNav = useCallback((dir: 1 | -1) => {
    advance(dir);
    setTimerKey((k) => k + 1);
  }, [advance]);

  const selectBook = useCallback((i: number) => {
    setActiveIndex(i);
    setTimerKey((k) => k + 1);
  }, []);

  const handleBookClick = useCallback(
    (book: Book) => navigate(`/book/${getBookSlug(book)}`),
    [navigate]
  );

  const activeBook = displayBooks[activeIndex] ?? null;

  if (loading) {
    return (
      <section className="relative min-h-[100svh] flex flex-col items-center justify-center bg-background overflow-hidden p-6 space-y-12 pt-24 text-center">
        <div className="w-full max-w-2xl mx-auto space-y-4">
          <motion.div animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-3/4 mx-auto h-16 bg-muted/60 rounded-xl" />
          <motion.div animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-1/2 mx-auto h-8 bg-muted/60 rounded-lg" />
        </div>
        <div className="flex items-center justify-center gap-6 sm:gap-10">
          {[1, 2, 3].map((i) => (
            <motion.div key={i} animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }} className="w-32 sm:w-48 lg:w-56 aspect-[2/3] bg-muted/80 rounded-2xl shadow-xl" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      id="hero"
      className="relative min-h-[100svh] flex flex-col justify-between section-padding pt-24 lg:pt-28 pb-6 overflow-hidden bg-background text-foreground transition-colors duration-500"
    >
      <Background />

      <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-center lg:items-start gap-2 sm:gap-8 lg:gap-12 mt-2 flex-1">

        {/* LEFT — Active book showcase */}
        <div
          className="relative flex flex-col items-center justify-start shrink-0 w-full lg:w-[320px]"
          style={{ height: "clamp(300px, 35vh, 440px)" }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <AnimatePresence>
            {activeBook && (
              <ActiveBookShowcase
                key={activeBook.id}
                book={activeBook}
                lang={lang}
                onClick={() => handleBookClick(activeBook)}
              />
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT — Info + controls column */}
        <div className="flex flex-col justify-start flex-1 min-w-0 w-full z-20">
          <BookInfoPanel
            motto={siteSettings.hero.motto || "Kitobsevarlar uchun yangicha olam"}
            subtitle={siteSettings.hero.subtitle}
            ctaText={siteSettings.hero.cta_text}
            onNavigate={() => navigate("/library")}
          />

          {total > 1 && (
            <div
              className="w-full"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              <MiniShelf
                books={displayBooks}
                activeIndex={activeIndex}
                total={total}
                duration={INTERVAL_MS}
                isPaused={isPaused}
                onSelect={selectBook}
                onPrev={() => manualNav(-1)}
                onNext={() => manualNav(1)}
                lang={lang}
              />
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto flex justify-center">
        <ScrollCta />
      </div>
    </section>
  );
};

export default Hero;