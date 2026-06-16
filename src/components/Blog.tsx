import { useState, useMemo, useEffect } from "react";
import { Feather, ChevronRight, AlertTriangle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { postPath } from "@/lib/blog";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/context/LanguageContext";
import { useData } from "@/context/DataContext";
import parchmentTexture from "@/assets/design/parchment-texture.webp";

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
};

const UZ_MONTHS = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];

const formatDate = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getDate()} ${UZ_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

const normalizeCategory = (cat: string | null | undefined): string => {
  if (!cat) return "Maqolalar";
  if (cat.toLowerCase() === "adabiy tahlil") return "Tahlil";
  if (cat.toLowerCase() === "yangilik" || cat.toLowerCase() === "news") return "Yangiliklar";
  return cat;
};

const toCardShape = (a: {
  id: string; slug?: string | null; title: string | null; excerpt: string | null;
  image_url: string | null; published_at: string; published: boolean | null;
  category?: string | null; reading_time?: string | null;
  focus_desktop_x?: number | null; focus_desktop_y?: number | null;
  focus_mobile_x?: number | null; focus_mobile_y?: number | null;
}) => ({
  id: a.id,
  slug: a.slug ?? null,
  title: a.title ?? "",
  excerpt: a.excerpt ?? "",
  category: normalizeCategory(a.category),
  date: formatDate(a.published_at),
  readTime: a.reading_time ?? null,
  image: a.image_url ?? "",
  focusDesktopX: a.focus_desktop_x ?? 50,
  focusDesktopY: a.focus_desktop_y ?? 50,
  focusMobileX: a.focus_mobile_x ?? 50,
  focusMobileY: a.focus_mobile_y ?? 50,
});

type Card = ReturnType<typeof toCardShape>;

// ── Hero card — full-width horizontal layout ─────────────────────────────────
const HeroCard = ({ article, navigate }: { article: Card; navigate: (p: string) => void }) => {
  const isMobile = useIsMobile();
  const objPos = isMobile
    ? `${article.focusMobileX}% ${article.focusMobileY}%`
    : `${article.focusDesktopX}% ${article.focusDesktopY}%`;
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.45 } }}
      onClick={() => navigate(postPath(article))}
      className="group grid md:grid-cols-[5fr_7fr] rounded-2xl overflow-hidden border border-border/60 bg-card hover:border-primary/25 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-black/10 transition-all duration-400 cursor-pointer no-underline"
    >
      {/* Image */}
      <div className="relative aspect-[16/10] md:aspect-auto min-h-[220px] overflow-hidden bg-muted">
        {article.image ? (
          <img
            src={article.image}
            alt={article.title}
            loading="eager"
            fetchpriority="high"
            decoding="async"
            className="img-fade w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            style={{ objectPosition: objPos }}
            onLoad={(e) => e.currentTarget.classList.add("loaded")}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/15 via-muted to-accent/15 flex items-center justify-center">
            <span className="text-5xl opacity-15 select-none">📖</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/10 pointer-events-none" />
      </div>

      {/* Content */}
      <div className="p-7 md:p-10 flex flex-col justify-center gap-4">
        <p className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
          {article.category}
        </p>
        <h3 className="font-heading text-2xl md:text-[1.75rem] leading-tight text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-3">
          {article.title}
        </h3>
        <p className="font-sans text-sm text-muted-foreground leading-relaxed line-clamp-3">
          {article.excerpt}
        </p>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground/70 font-medium">
          <span>{article.date}</span>
          {article.readTime && (
            <>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
              <Clock className="w-3 h-3" />
              <span>{article.readTime}</span>
            </>
          )}
        </div>
        <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-primary group-hover:gap-3 transition-all duration-300 mt-1">
          Batafsil o'qish <span>&rarr;</span>
        </span>
      </div>
    </motion.article>
  );
};

// ── Standard card — vertical ──────────────────────────────────────────────────
const StandardCard = ({ article, index, navigate }: { article: Card; index: number; navigate: (p: string) => void }) => {
  const isMobile = useIsMobile();
  const objPos = isMobile
    ? `${article.focusMobileX}% ${article.focusMobileY}%`
    : `${article.focusDesktopX}% ${article.focusDesktopY}%`;
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.4, delay: index * 0.07 } }}
      onClick={() => navigate(postPath(article))}
      className="group flex flex-col bg-card border border-border/60 rounded-xl overflow-hidden hover:border-primary/25 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/8 transition-all duration-300 cursor-pointer [&_h3]:no-underline"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-muted shrink-0">
        {article.image ? (
          <img
            src={article.image}
            alt={article.title}
            loading="lazy"
            decoding="async"
            className="img-fade w-full h-full object-cover group-hover:scale-105 transition-transform duration-600"
            style={{ objectPosition: objPos }}
            onLoad={(e) => e.currentTarget.classList.add("loaded")}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/15 via-muted to-accent/15 flex items-center justify-center">
            <span className="text-3xl opacity-15 select-none">📖</span>
          </div>
        )}
      </div>
      <div className="p-5 flex flex-col gap-2 flex-1">
        <p className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          {article.category}
        </p>
        <h3 className="font-heading text-[1.05rem] leading-snug text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-2 flex-1">
          {article.title}
        </h3>
        <p className="font-serif text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {article.excerpt}
        </p>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 font-medium pt-1 border-t border-border/40 mt-auto">
          <span>{article.date}</span>
          {article.readTime && (
            <>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <span>{article.readTime}</span>
            </>
          )}
        </div>
      </div>
    </motion.article>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const Blog = () => {
  const { t } = useLang();
  const navigate = useNavigate();
  const { articles, loading, articlesError } = useData();
  const [activeTab, setActiveTab] = useState("Barchasi");

  const publishedArticles = useMemo(
    () => articles.filter((a) => a.published).map(toCardShape),
    [articles]
  );

  const categories = useMemo(() => {
    const cats = Array.from(new Set(publishedArticles.map((a) => a.category).filter(Boolean)))
      .filter((c) => c !== "O'qish madaniyati");
    return ["Barchasi", ...cats];
  }, [publishedArticles]);

  const displayed = useMemo(
    () => (activeTab === "Barchasi"
      ? publishedArticles
      : publishedArticles.filter((a) => a.category === activeTab)
    ).slice(0, 4),
    [publishedArticles, activeTab]
  );

  return (
    <section id="blog" className="py-24 md:py-32 relative isolate overflow-hidden bg-background border-y border-border">

      <div
        className="absolute inset-0 pointer-events-none -z-20 opacity-20 dark:opacity-40 mix-blend-multiply dark:mix-blend-screen"
        style={{ backgroundImage: `url(${parchmentTexture})`, backgroundSize: "cover", backgroundPosition: "center" }}
      />
      <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[500px] md:w-[800px] h-[500px] md:h-[800px] bg-primary/20 dark:bg-primary/15 rounded-full blur-[100px] md:blur-[150px] pointer-events-none -z-10" />
      <div className="absolute inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--background)_90%)]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Header */}
        <div className="mb-10 flex flex-col items-start">
          <div className="inline-flex items-center gap-4 mb-5">
            <span className="w-8 h-[1px] bg-gold/50" />
            <p className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
              Booktopia Kundaligi
            </p>
          </div>
          <h2 className="font-heading text-5xl sm:text-6xl text-foreground mb-4">
            {t.blog?.title || "So'nggi maqolalar"}
          </h2>
          <p className="font-serif text-foreground/80 text-lg md:text-xl leading-relaxed max-w-2xl">
            Adabiyot yangiliklari, eksklyuziv suhbatlar va nashriyot hayotidagi so'nggi voqealar.
          </p>
        </div>

        {/* Category tabs */}
        <div className="mb-10 border-b border-border/50 pb-5 sm:pb-7">
          <div className="flex overflow-x-auto gap-2 sm:gap-3 sm:flex-wrap scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`
                  shrink-0 font-sans text-[10px] sm:text-[11px] font-bold tracking-[0.18em] uppercase
                  px-3.5 py-1.5 sm:px-6 sm:py-2.5 rounded-[var(--radius)] transition-colors duration-200
                  ${activeTab === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-transparent text-muted-foreground border-[0.5px] border-border hover:bg-muted"
                  }
                `}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-6">
            <div className="grid md:grid-cols-[5fr_7fr] rounded-2xl overflow-hidden border border-border/40 bg-card h-56" aria-hidden="true">
              <div className="skeleton-shimmer" />
              <div className="p-8 flex flex-col gap-4">
                <div className="skeleton-shimmer h-3 w-24 rounded-full" />
                <div className="skeleton-shimmer h-7 w-4/5 rounded-md" />
                <div className="skeleton-shimmer h-14 w-full rounded-md" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <div key={i} className="bg-card border border-border/40 rounded-xl overflow-hidden" aria-hidden="true">
                  <div className="skeleton-shimmer aspect-[16/9]" />
                  <div className="p-5 flex flex-col gap-3">
                    <div className="skeleton-shimmer h-3 w-20 rounded-full" />
                    <div className="skeleton-shimmer h-5 w-5/6 rounded-md" />
                    <div className="skeleton-shimmer h-10 w-full rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : articlesError ? (
          <div className="flex flex-col items-center justify-center py-20 text-center" role="alert">
            <AlertTriangle className="w-8 h-8 text-muted-foreground mb-3" />
            <p className="font-sans text-sm text-muted-foreground">Maqolalar yuklanmadi. Qayta urinib ko'ring.</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
            >
              {displayed.length === 0 ? (
                <div className="border border-dashed border-border/60 bg-muted/10 py-20 flex flex-col items-center justify-center rounded-2xl">
                  <Feather className="w-10 h-10 text-muted-foreground mb-4" />
                  <p className="font-serif text-lg text-muted-foreground">Bu bo'limda hozircha maqolalar yo'q</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Hero — first article */}
                  <HeroCard article={displayed[0]} navigate={navigate} />

                  {/* Supporting cards */}
                  {displayed.length > 1 && (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {displayed.slice(1).map((article, i) => (
                        <StandardCard key={article.id} article={article} index={i + 1} navigate={navigate} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* CTA */}
        <div className="flex justify-center mt-12">
          <motion.button
            onClick={() => navigate("/blog")}
            whileTap={{ scale: 0.985 }}
            className="btn-glass"
          >
            <Feather className="h-4 w-4" />
            <span className="font-sans text-[11px] tracking-[0.2em] font-bold uppercase">
              Barcha maqolalar
            </span>
            <ChevronRight className="h-4 w-4" />
          </motion.button>
        </div>

      </div>
    </section>
  );
};

export default Blog;
