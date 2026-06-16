// @refresh reset
import { motion } from "framer-motion";
import BookCover from "@/components/BookCover";
import { ChevronRight, Award, Clock, Brain, Quote, Info, BookOpen, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/context/DataContext";
import { useLang, locField } from "@/context/LanguageContext";
import { LIBRARY_FILTER_MAP } from "@/lib/constants";
import { getBookSlug } from "@/lib/slugify";

// ── Background image import ───────────────────────────────────────────────────
let bgUrl: string | undefined;
try { bgUrl = new URL("@/assets/design/botm-bg.webp", import.meta.url).href; } catch { bgUrl = undefined; }

// ── Floating book visual — defined at module level so React never sees a new
//    component type between renders (avoids unnecessary unmount/remount).
const FloatingBookVisual = ({ coverUrl, title }: { coverUrl: string | null; title: string }) => (
  <>
    <div className="relative z-10">
      <BookCover
        src={coverUrl}
        alt={title}
        className="w-48 sm:w-64 lg:w-80"
        hover={false}
        loading="eager"
      />
    </div>
    {/* Floor shadow */}
    <div
      className="w-44 sm:w-56 h-6 mt-6 opacity-30"
      style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0.8) 0%, transparent 70%)" }}
    />
  </>
);

const BookOfTheMonth = () => {
  const { books, loading, booksError, siteSettings } = useData() as ReturnType<typeof useData> & { booksError?: boolean };
  const { lang } = useLang();
  const navigate = useNavigate();

  // ── Loading / Error State ────────────────────────────────────────────────
  if (loading || books.length === 0 || booksError) {
    return (
      <section className="relative flex flex-col justify-center min-h-[auto] lg:min-h-[85vh] overflow-hidden bg-card py-24 lg:py-32 border-y border-border z-10">
        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 sm:px-12">
          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Editorial Content Skeleton */}
            <div className="lg:col-span-7 flex flex-col items-center lg:items-start w-full gap-6" aria-hidden="true">
              <div className="skeleton-shimmer h-8 w-32 rounded-full" />
              <div className="skeleton-shimmer h-24 w-full max-w-2xl rounded-md" />
              <div className="skeleton-shimmer h-12 w-3/4 max-w-xl rounded-md" />
              <div className="skeleton-shimmer h-4 w-48 rounded-[4px]" />
            </div>
            {/* Right Book Cover Skeleton */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end w-full" aria-hidden="true">
              <div className="skeleton-shimmer w-52 sm:w-64 lg:w-72 aspect-[2/3] rounded-md sm:rounded-lg" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  const spotlightBook = books.find((b) => b.featured) || books[0];
  if (!spotlightBook) return null; // Ultimate safety net

  const getImageUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const base = import.meta.env.VITE_SUPABASE_URL as string;
    return `${base}/storage/v1/object/public/${url}`;
  };

  const coverUrl = getImageUrl(spotlightBook.cover_url);
  const glowColor = `hsl(${spotlightBook.bg_color ?? "40 65% 30%"})`;
  const bookTitle = locField(spotlightBook, "title", lang);

  const rawGenre = (spotlightBook as any).genre ?? (spotlightBook as any).category ?? "Psixologik roman";
  const genre = LIBRARY_FILTER_MAP[rawGenre as keyof typeof LIBRARY_FILTER_MAP] ?? rawGenre;
  const pages = (spotlightBook as any).pages ?? (spotlightBook as any).page_count ?? "340";
  const description = (spotlightBook as any).description ?? "";

  const botm = siteSettings.bookOfMonth;
  const quote = botm?.quote || "";
  const quoteAuthor = botm?.quote_author || "";
  const badge = botm?.badge || "Jahon durdonasi";

  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative flex flex-col justify-center min-h-[auto] lg:min-h-[85vh] overflow-hidden bg-card py-24 lg:py-32 border-y border-border z-10"
    >

      {/* ── Background: Van Gogh Feather & Texture ──────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div aria-hidden className="absolute inset-0 transition-opacity duration-700"
          style={{
            backgroundImage: bgUrl ? `url(${bgUrl})` : undefined,
            backgroundSize: "cover", backgroundPosition: "center right", backgroundRepeat: "no-repeat",
            opacity: 0.85,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-15 dark:opacity-20"
          style={{ background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)` }} />
        {/* FIX: Removed SVG <feTurbulence> to prevent full-section paint thrashing on scroll */}
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 sm:px-12">
        {/* Changed to flex-col on mobile, grid on desktop for exact flow control */}
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">

          {/* ── Left Column (Editorial Content) ── */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left w-full">

            {/* 1. Section heading */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="font-heading text-5xl sm:text-6xl text-foreground tracking-tight leading-none mb-6"
            >
              Oy Kitobi
            </motion.h2>

            {/* 2. Giant Pull Quote */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
              className="relative mb-6"
            >
              <Quote className="absolute -top-3 -left-5 w-8 h-8 lg:w-10 lg:h-10 text-accent/20 dark:text-accent/10 rotate-180" />
              <blockquote className="text-xl sm:text-2xl lg:text-[1.75rem] leading-loose font-serif italic text-foreground drop-shadow-sm max-w-2xl">
                {quote ? `"${quote}"` : null}
              </blockquote>
              {quoteAuthor && (
                <p className="mt-3 font-sans text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
                  — {quoteAuthor}
                </p>
              )}
            </motion.div>

            {/* 3. Title & Author */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
              className="w-full flex flex-col items-center lg:items-start mb-6"
            >
              <h2 className="font-heading tracking-tight text-3xl sm:text-4xl font-bold text-foreground">
                {locField(spotlightBook, "title", lang)}
              </h2>
              <p className="font-sans text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-bold mt-2">
                {locField(spotlightBook, "author", lang)}
              </p>
            </motion.div>

            {/* ── MOBILE ONLY: Book Cover inserted here in the exact order requested ── */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
              className="flex lg:hidden flex-col items-center justify-center relative w-full mt-6 mb-0"
            >
              <FloatingBookVisual coverUrl={coverUrl} title={bookTitle} />
            </motion.div>

            {/* 4. Badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mt-0 mb-8"
            >
              {badge && (
                <div className="flex items-center gap-1.5 text-[11px] font-sans font-bold tracking-[0.2em] uppercase text-muted-foreground">
                  <Award className="w-3.5 h-3.5 text-primary" /> {badge}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-[11px] font-sans font-bold tracking-[0.2em] uppercase text-muted-foreground">
                <Brain className="w-3.5 h-3.5 text-primary" /> {genre}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-sans font-bold tracking-[0.2em] uppercase text-muted-foreground">
                <Clock className="w-3.5 h-3.5 text-primary" /> ~{pages} sahifa
              </div>
            </motion.div>

            {/* 5. "Why Read It" Box */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }}
              className="relative w-full max-w-xl mb-10 text-left"
            >
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-primary" />
                <h4 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-foreground">
                  Nega o'qish kerak?
                </h4>
              </div>
              <p className="font-serif text-base sm:text-[1.05rem] text-muted-foreground leading-relaxed">
                {description}
              </p>
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.5 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => navigate(`/book/${getBookSlug(spotlightBook)}`)}
              className="btn-glass"
            >
              <BookOpen className="h-4 w-4" />
              <span className="font-sans font-bold text-[11px] tracking-[0.2em] uppercase">Batafsil o'qish</span>
              <ChevronRight className="h-4 w-4" />
            </motion.button>

          </div>

          {/* ── Right Column (Floating Book) - DESKTOP ONLY ── */}
          <div className="hidden lg:flex lg:col-span-5 flex-col items-center justify-center relative">
            <FloatingBookVisual coverUrl={coverUrl} title={bookTitle} />
          </div>

        </div>
      </div>
    </motion.section>
  );
};

export default BookOfTheMonth;