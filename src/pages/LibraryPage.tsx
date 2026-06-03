import { useState, useEffect, useMemo, startTransition } from "react";
import BookCover from "@/components/BookCover";
import SpotlightCard from "@/components/SpotlightCard";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useData } from "@/context/DataContext";
import type { Book } from "@/context/DataContext";
import { useLang, locField } from "@/context/LanguageContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EmptyState from "@/components/EmptyState";
import librarySeal from "@/assets/design/library-seal.png";
import { getBookSlug } from "@/lib/slugify";
import { useCart } from "@/context/CartContext";

// ── Local Categories Configuration ────────────────────────────────────────────
const CATEGORIES = ["all", "jahon", "ilmiy", "new", "amir-temur", "erkin-millat"] as const;

// ── Featured Books for Carousel ───────────────────────────────────────────────
const FEATURED_BOOKS = [
  {
    id: "dorian",
    title: "Dorian Greyning portreti",
    author: "Oskar Uayld",
    description:
      "Go'zallik va abadiy yoshlik vasvasasiga tushgan yigitning hayotiy fojiasi. Dunyo klassikasining durdona asari.",
    coverImage:
      "https://backend.book.uz/user-api/img/img-file-f2a929a2a32d5bb4bb4e05dcd8f8670c.jpg",
  },
  {
    id: "zulayho",
    title: "Zulayho ko'zini ochyapti",
    author: "Go'zal Yaxina",
    description:
      "Surgun qilingan ayolning qahraton Sibirdagi omon qolish va sevgi tarixi. Zamonaviy adabiyotning eng kuchli asarlaridan biri.",
    coverImage:
      "https://backend.book.uz/user-api/img/img-8b1bc484779e7dd00942b1a3a9a3735b.jpg",
  },
  {
    id: "qirolicha",
    title: "Qirolichaning yurishi",
    author: "Uolter Tevis",
    description:
      "Shaxmat dahosi bo'lgan qizning ichki kurashi, yolg'izlik va yuksalish yo'li. Iroda va iste'dodning kuchli hikoyasi.",
    coverImage:
      "https://upload.wikimedia.org/wikipedia/uz/a/a5/Qirolichaning_yurishi_%28roman%29.jpg",
  },
] as const;

// ── Helper: Get Category Label ─────────────────────────────────────────────────
const getCategoryLabel = (key: string, lang: string): string => {
  const labels: Record<string, { uz: string; ru: string; en: string }> = {
    all: { uz: "Barchasi", ru: "Все", en: "All" },
    jahon: { uz: "Jahon adabiyoti durdonalari", ru: "Мировая классика", en: "World Classics" },
    ilmiy: { uz: "Ilmiy-ommabop", ru: "Научно-популярные", en: "Popular Science" },
    new: { uz: "Yangi nashrlar", ru: "Новинки", en: "New Releases" },
    "amir-temur": { uz: "Tarixiy", ru: "Исторические", en: "Historical" },
    "erkin-millat": { uz: "Ijtimoiy-siyosiy", ru: "Общественно-политические", en: "Socio-political" },
  };
  return labels[key]?.[lang as keyof typeof labels.all] ?? key;
};

const LibraryPage = () => {
  const { books } = useData();
  const { lang } = useLang();
  const { addItem, items, openMiniCart } = useCart();

  const [active, setActive] = useState<string>("all");
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Derive featured books from the database.
  // Fallback to the hardcoded constant only if the DB has zero featured books.
  const carouselBooks = useMemo(() => {
    const dbFeatured = books.filter((b) => b.enable_3d_flip);
    if (dbFeatured.length > 0) {
      return dbFeatured.map((b) => ({
        id: b.id,
        title: locField(b, "title", lang) || "Kitob nomi mavjud emas",
        author: locField(b, "author", lang) || "Noma'lum muallif",
        description: locField(b, "description", lang) || "Ushbu kitob haqida ma'lumot mavjud emas.",
        coverImage: b.cover_url || "https://backend.book.uz/user-api/img/img-file-f2a929a2a32d5bb4bb4e05dcd8f8670c.jpg",
      }));
    }
    return FEATURED_BOOKS;
  }, [books, lang]);

  // Auto-rotate featured books every 5 seconds
  useEffect(() => {
    if (carouselBooks.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % carouselBooks.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [carouselBooks.length]);

  const featuredBook = carouselBooks[currentIndex];

  // FIX: Memoized filter — only recomputes when books or active changes.
  // Previously ran inline on every render, blocking the main thread.
  const filtered = useMemo(() => {
    return books.filter((b) => {
      if (active === "all") return true;

      return b.category === active;
    });
  }, [books, active]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="section-padding pt-24 bg-charcoal relative">
        <div className="mx-auto max-w-7xl">

          {/* ── FEATURED BOOKS HERO CAROUSEL ─────────────────────────────── */}
          <div className="relative w-full max-w-6xl mx-auto min-h-[450px] flex flex-col md:flex-row items-center bg-gradient-to-br from-background/80 to-background/60 border border-border/20 rounded-3xl overflow-hidden p-8 md:p-12 shadow-2xl mb-16">

            {/* Corner Accents */}
            <div className="absolute top-0 left-0 w-32 h-32 border-t border-l border-accent/20 rounded-tl-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-32 h-32 border-b border-r border-accent/20 rounded-br-3xl pointer-events-none" />

            {/* Library Seal */}
            <div className="absolute -bottom-12 -right-12 w-64 h-64 md:w-96 md:h-96 opacity-[0.08] pointer-events-none mix-blend-luminosity z-0 transform -rotate-12">
              <img
                src={librarySeal}
                alt="Library Seal"
                width={384}
                height={384}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Static Glow Aura (Moved outside animation to prevent GPU layout trashing) */}
            <div className="absolute inset-y-0 left-0 w-1/2 flex items-center justify-center pointer-events-none z-0">
              <div className="w-64 h-64 bg-primary/20 blur-[60px] rounded-full" />
            </div>

            <AnimatePresence mode="wait">
              {/* Left — Book Cover */}
              <motion.div
                key={`book-${currentIndex}`}
                initial={{ opacity: 0, y: -30, rotate: -3 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                exit={{ opacity: 0, y: 30, rotate: 3 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="flex-[1] flex justify-center items-center relative z-10"
              >
                <motion.div layoutId={`book-cover-${featuredBook.id}`}>
                  <BookCover
                    src={featuredBook.coverImage}
                    alt={featuredBook.title}
                    className="w-48 md:w-64"
                    hover={false}
                    loading="eager"
                  />
                </motion.div>
              </motion.div>

              {/* Right — Text */}
              <motion.div
                key={`text-${currentIndex}`}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0, transition: { delay: 0.1, duration: 0.35, ease: "easeOut" } }}
                exit={{ opacity: 0, x: -30, transition: { duration: 0.25, ease: "easeIn" } }}
                className="flex-1 flex flex-col justify-center items-center md:items-start text-center md:text-left mt-8 md:mt-0 pb-6 md:pb-0 relative z-10 w-full"
              >
                <span className="text-gold font-bold tracking-[0.2em] text-[10px] sm:text-xs uppercase mb-4">
                  Hafta Tanlovi
                </span>
                <h2 className="text-4xl md:text-5xl font-heading font-black tracking-tight text-foreground mb-4 leading-tight line-clamp-2">
                  {featuredBook.title}
                </h2>
                <p className="font-serif text-foreground/80 text-lg md:text-xl mb-8 line-clamp-3 max-w-xl">
                  {featuredBook.description}
                </p>
                <Link to={`/book/${getBookSlug(featuredBook)}`} className="btn-glass px-8 py-3.5 mt-2 mb-6 md:mb-0">
                  Kitob haqida
                </Link>
              </motion.div>
            </AnimatePresence>

            {/* Pagination Dots */}
            {carouselBooks.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {carouselBooks.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`h-2 rounded-full transition-all duration-300 ${index === currentIndex
                      ? "bg-primary w-8"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50 w-2"
                      }`}
                    aria-label={`Go to book ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── HEADER + FILTERS + PDF BUTTON ────────────────────────────── */}
          <div className="mb-10 mt-16">
            <div className="text-center mb-8">
              <p className="text-[10px] sm:text-xs font-bold tracking-[0.3em] text-gold uppercase mb-3 text-center">
                KUTUBXONA
              </p>
              <h1 className="text-4xl md:text-5xl font-heading font-black tracking-tight text-foreground text-center">
                Tanlangan kitoblar
              </h1>
            </div>

            <div className="flex flex-col items-center gap-4">
              {/* Category Pills — full-width scrollable, never wraps */}
              <div className="relative w-full">
                <div
                  className="absolute right-0 top-0 bottom-1 w-16 pointer-events-none z-10"
                  style={{ background: "linear-gradient(to right, transparent, hsl(var(--charcoal)))" }}
                />
                <div className="flex overflow-x-auto flex-nowrap items-center justify-center gap-2 [&::-webkit-scrollbar]:hidden [scrollbar-width:none] pb-1 px-4">
                  {CATEGORIES.map((categoryKey) => {
                    const isActive = active === categoryKey;

                    return (
                      <button
                        key={categoryKey}
                        onClick={() => {
                          startTransition(() => {
                            setActive(categoryKey);
                          });
                        }}
                        className={`flex-shrink-0 font-sans text-[9px] sm:text-[10px] font-bold tracking-[0.1em] sm:tracking-[0.13em] uppercase px-3.5 sm:px-4 py-1.5 rounded-full whitespace-nowrap transition-colors duration-200 ${isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-transparent text-muted-foreground border border-border hover:bg-muted hover:text-foreground"
                          }`}
                      >
                        {getCategoryLabel(categoryKey, lang)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PDF Catalog */}
              <a
                href="/booktopia-katalog.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-glass-ghost px-8 py-3 group"
              >
                <div className="flex items-center justify-center w-4 h-4 mr-2 group-hover:text-primary transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16" height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" x2="12" y1="15" y2="3" />
                  </svg>
                </div>
                Katalogni yuklab olish
              </a>
            </div>
          </div>

          {/* ── BOOK GRID / EMPTY STATE ───────────────────────────────────── */}
          {filtered.length === 0 ? (
            <div className="py-10 max-w-2xl mx-auto">
              <EmptyState
                title="Sahifalar hozircha bo'sh..."
                description="Ushbu ruknda hozircha kitoblar yo'q. Biz uni tez orada yangi va sara asarlar bilan boyitamiz."
                actionLabel="Barcha kitoblarni ko'rish"
                onAction={() => {
                  startTransition(() => setActive("all"));
                }}
              />
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
              <AnimatePresence mode="popLayout">
                {filtered.map((book, i) => (
                  // FIX: Removed [content-visibility:auto] — Framer Motion's
                  // `layout` prop recalculates all element positions during
                  // grid shuffle animations. content-visibility interferes
                  // with this by making the browser skip layout for "hidden"
                  // elements, causing cards to snap instead of animate smoothly.
                  <motion.div
                    key={book.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className="relative"
                  >
                    <Link to={`/book/${getBookSlug(book)}`} className="h-full block">
                      <SpotlightCard className="h-full p-3 md:p-4 pb-10 group cursor-pointer">
                        <div className="flex flex-col gap-3 h-full">

                          <BookCover
                            src={book.cover_url}
                            alt={locField(book, "title", lang)}
                            className="w-3/4 mx-auto"
                            hover={true}
                            loading="lazy"
                          />

                          {/* Book Info */}
                          <div className="flex flex-col items-center text-center mt-auto">
                            <h3 className="font-heading font-black tracking-tight text-base md:text-[17px] text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                              {locField(book, "title", lang)}
                            </h3>
                            <span className="w-8 h-[1.5px] bg-primary/30 my-2 transition-all duration-500 group-hover:w-16 group-hover:bg-primary" />
                            <p className="text-[10px] font-bold text-muted-foreground tracking-[0.15em] uppercase">
                              {locField(book, "author", lang)}
                            </p>
                            {book.price && (
                              <p className="text-[10px] font-bold mt-1" style={{color:'hsl(var(--gold))'}}>
                                {book.price.toLocaleString()} so'm
                              </p>
                            )}
                          </div>

                        </div>
                      </SpotlightCard>
                    </Link>

                    {/* Always-visible cart button — touch-friendly */}
                    {(() => {
                      const inCart = items.find((ci) => ci.id === book.id);
                      return (
                        <button
                          id={`add-cart-${book.id}`}
                          className={`book-cart-btn${inCart ? ' in-cart' : ''}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (inCart) openMiniCart();
                            else addItem(book);
                          }}
                          aria-label={inCart ? `Savatchada ${inCart.qty} ta — ochish` : "Savatchaga qo'shish"}
                        >
                          {inCart ? (
                            <>✔️ {inCart.qty}</>
                          ) : (
                            <>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                              Savat
                            </>
                          )}
                        </button>
                      );
                    })()}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LibraryPage;