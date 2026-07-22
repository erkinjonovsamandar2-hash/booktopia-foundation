// @refresh reset
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import BookCover from "@/components/BookCover";
import { ChevronRight, Award, Clock, Brain, Quote, Info, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/context/DataContext";
import { useLang, locField } from "@/context/LanguageContext";
import { LIBRARY_FILTER_MAP } from "@/lib/constants";
import { getBookSlug } from "@/lib/slugify";
import { imgUrl } from "@/lib/imageUrl";

// ── Background image import ───────────────────────────────────────────────────
let bgUrl: string | undefined;
try { bgUrl = new URL("@/assets/design/botm-bg.webp", import.meta.url).href; } catch { bgUrl = undefined; }

// ── Floating book visual ──────────────────────────────────────────────────────
const FloatingBookVisual = ({ coverUrl, title }: { coverUrl: string | null; title: string }) => (
  <>
    <div className="relative z-10">
      <BookCover src={coverUrl} alt={title} className="w-48 sm:w-64 lg:w-80" hover={false} loading="eager" />
    </div>
    <div
      className="w-44 sm:w-56 h-6 mt-6 opacity-30"
      style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0.8) 0%, transparent 70%)" }}
    />
  </>
);



// ── Hook: observe one container, reveal all `.reveal` children ────────────────
// `ready` must reflect when the observed container is actually in the DOM.
// This component renders a skeleton (no containerRef) while data loads, so the
// effect has to re-run once the real content mounts — otherwise the observer
// attaches to nothing and the `.reveal` children stay at opacity:0 forever.
function useSectionReveal(ready: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const revealAll = () => {
      container.querySelectorAll(".reveal,.reveal-scale,.reveal-fade").forEach(el => el.classList.add("revealed"));
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      revealAll();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          revealAll();
          observer.unobserve(container);
        }
      },
      { threshold: 0.01, rootMargin: "0px" }
    );
    observer.observe(container);

    const fallbackTimer = setTimeout(() => {
      revealAll();
      observer.disconnect();
    }, 600);

    return () => {
      observer.disconnect();
      clearTimeout(fallbackTimer);
    };
  }, [ready]);
  return ref;
}

const BookOfTheMonth = () => {
  const { books, loading, booksError, siteSettings } = useData() as ReturnType<typeof useData> & { booksError?: boolean };
  const { lang } = useLang();
  const navigate = useNavigate();

  // The real content (with containerRef) only renders when this is true.
  // Passing it as the effect dependency re-arms the reveal observer at that
  // point — see useSectionReveal above.
  const contentReady = !(loading || books.length === 0 || booksError);
  const containerRef = useSectionReveal(contentReady);

  // ── Loading / Error State ────────────────────────────────────────────────
  if (!contentReady) {
    return (
      <section className="relative flex flex-col justify-center min-h-[auto] lg:min-h-[85vh] overflow-hidden bg-card py-24 lg:py-32 border-y border-border z-10">
        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 sm:px-12">
          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-7 flex flex-col items-center lg:items-start w-full gap-6" aria-hidden="true">
              <div className="skeleton-shimmer h-8 w-32 rounded-full" />
              <div className="skeleton-shimmer h-24 w-full max-w-2xl rounded-md" />
              <div className="skeleton-shimmer h-12 w-3/4 max-w-xl rounded-md" />
              <div className="skeleton-shimmer h-4 w-48 rounded-[4px]" />
            </div>
            <div className="lg:col-span-5 flex justify-center lg:justify-end w-full" aria-hidden="true">
              <div className="skeleton-shimmer w-52 sm:w-64 lg:w-72 aspect-[2/3] rounded-md sm:rounded-lg" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  const spotlightBook = books.find((b) => b.featured) || books[0];
  if (!spotlightBook) return null;

  // BOTM cover displays at max 320px — serve at 640px (2× retina)
  const coverUrl = imgUrl(spotlightBook.cover_url, 640);
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
    <section className="section-gpu relative flex flex-col justify-center min-h-[auto] lg:min-h-[85vh] overflow-hidden bg-card py-24 lg:py-32 border-y border-border z-10">

      {/* ── Background ──────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div aria-hidden className="absolute inset-0"
          style={{
            backgroundImage: bgUrl ? `url(${bgUrl})` : undefined,
            backgroundSize: "cover", backgroundPosition: "center right", backgroundRepeat: "no-repeat",
            opacity: 0.85,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-15 dark:opacity-20"
          style={{ background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)` }} />
      </div>

      {/* Single IntersectionObserver on this container triggers all children */}
      <div ref={containerRef} className="relative z-10 mx-auto w-full max-w-6xl px-6 sm:px-12">
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">

          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left w-full">

            <h2 className="reveal font-heading text-5xl sm:text-6xl text-foreground tracking-tight leading-none mb-6">
              Oy Kitobi
            </h2>

            <div className="reveal reveal-d1 relative mb-6">
              <Quote className="absolute -top-3 -left-5 w-8 h-8 lg:w-10 lg:h-10 text-accent/20 dark:text-accent/10 rotate-180" />
              <blockquote className="text-xl sm:text-2xl lg:text-[1.75rem] leading-loose font-serif italic text-foreground drop-shadow-sm max-w-2xl">
                {quote ? `"${quote}"` : null}
              </blockquote>
              {quoteAuthor && (
                <p className="mt-3 font-sans text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
                  — {quoteAuthor}
                </p>
              )}
            </div>

            <div className="reveal reveal-d2 w-full flex flex-col items-center lg:items-start mb-6">
              <h2 className="font-heading tracking-tight text-3xl sm:text-4xl font-bold text-foreground">
                {locField(spotlightBook, "title", lang)}
              </h2>
              <p className="font-sans text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-bold mt-2">
                {locField(spotlightBook, "author", lang)}
              </p>
            </div>

            {/* Mobile book cover */}
            <div className="reveal-scale reveal-d3 flex lg:hidden flex-col items-center justify-center relative w-full mt-6 mb-0">
              <FloatingBookVisual coverUrl={coverUrl} title={bookTitle} />
            </div>

            <div className="reveal reveal-d3 flex flex-wrap items-center justify-center lg:justify-start gap-4 mt-0 mb-8">
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
            </div>

            <div className="reveal reveal-d4 relative w-full max-w-xl mb-10 text-left">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-primary" />
                <h4 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-foreground">
                  Nega o'qish kerak?
                </h4>
              </div>
              <p className="font-serif text-base sm:text-[1.05rem] text-muted-foreground leading-relaxed">
                {description}
              </p>
            </div>

            <motion.button
              className="reveal reveal-d5 btn-glass"
              whileTap={{ scale: 0.985 }}
              onClick={() => navigate(`/book/${getBookSlug(spotlightBook)}`)}
            >
              <BookOpen className="h-4 w-4" />
              <span className="font-sans font-bold text-[11px] tracking-[0.2em] uppercase">Batafsil o'qish</span>
              <ChevronRight className="h-4 w-4" />
            </motion.button>

          </div>

          {/* Desktop book cover */}
          <div className="hidden lg:flex lg:col-span-5 flex-col items-center justify-center relative">
            <FloatingBookVisual coverUrl={coverUrl} title={bookTitle} />
          </div>

        </div>
      </div>
    </section>
  );
};

export default BookOfTheMonth;