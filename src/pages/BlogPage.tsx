import { useState, useMemo, useEffect } from "react";
import { Clock, Feather } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/context/LanguageContext";
import { useData } from "@/context/DataContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import parchmentTexture from "@/assets/design/parchment-texture.webp";
import blogHeaderArt from "@/assets/design/blog-header-art.webp";
import { postPath } from "@/lib/blog";

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

const formatDate = (raw: string): string => {
  try {
    const d = new Date(raw.slice(0, 10));
    if (isNaN(d.getTime())) return raw.slice(0, 10);
    const months = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch { return raw.slice(0, 10); }
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



// ── Full-width hero card ──────────────────────────────────────────────────────
const HeroCard = ({ article }: { article: Card }) => {
  const isMobile = useIsMobile();
  const objPos = isMobile
    ? `${article.focusMobileX}% ${article.focusMobileY}%`
    : `${article.focusDesktopX}% ${article.focusDesktopY}%`;
  return (
    <Link to={postPath(article)} className="block no-underline">
      <motion.article
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.5 } }}
        className="group grid md:grid-cols-[5fr_7fr] md:min-h-[320px] rounded-2xl overflow-hidden border border-border/60 bg-card hover:border-primary/25 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-black/12 transition-all duration-400"
      >
        {/* Image */}
        <div className="relative aspect-[16/10] md:aspect-auto min-h-[260px] overflow-hidden bg-muted">
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
              <span className="text-6xl opacity-10 select-none">📖</span>
            </div>
          )}
        </div>
        {/* Content */}
        <div className="p-8 md:p-12 flex flex-col justify-center gap-5">
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.24em] text-primary">
            {article.category}
          </p>
          <h2 className="font-heading text-2xl md:text-[1.9rem] leading-tight text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-3">
            {article.title}
          </h2>
          <p className="font-serif text-base text-muted-foreground leading-relaxed line-clamp-4">
            {article.excerpt}
          </p>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground/60 font-medium">
            <span>{article.date}</span>
            {article.readTime && (
              <>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                <Clock className="w-3 h-3" />
                <span>{article.readTime}</span>
              </>
            )}
          </div>
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-primary group-hover:gap-3 transition-all duration-300">
            To'liq o'qish <span>&rarr;</span>
          </span>
        </div>
      </motion.article>
    </Link>
  );
};

// ── Mid-size card (2-col row) ─────────────────────────────────────────────────
const MidCard = ({ article, index }: { article: Card; index: number }) => {
  const isMobile = useIsMobile();
  const objPos = isMobile
    ? `${article.focusMobileX}% ${article.focusMobileY}%`
    : `${article.focusDesktopX}% ${article.focusDesktopY}%`;
  return (
    <Link to={postPath(article)} className="no-underline">
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.4, delay: index * 0.07 } }}
        className="group flex flex-col bg-card border border-border/60 rounded-xl overflow-hidden hover:border-primary/25 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/8 transition-all duration-300 h-full"
      >
        <div className="relative aspect-[16/9] overflow-hidden bg-muted shrink-0">
          {article.image ? (
            <img src={article.image} alt={article.title} loading="lazy"
              decoding="async"
              className="img-fade w-full h-full object-cover group-hover:scale-105 transition-transform duration-600"
              style={{ objectPosition: objPos }}
              onLoad={(e) => e.currentTarget.classList.add("loaded")} />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/15 via-muted to-accent/15 flex items-center justify-center">
              <span className="text-4xl opacity-10 select-none">📖</span>
            </div>
          )}
        </div>
        <div className="p-6 flex flex-col gap-3 flex-1">
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{article.category}</p>
          <h3 className="font-heading text-lg leading-snug text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-2 flex-1">
            {article.title}
          </h3>
          <p className="font-serif text-sm text-muted-foreground line-clamp-2 leading-relaxed">{article.excerpt}</p>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/55 font-medium pt-3 border-t border-border/40 mt-auto">
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
    </Link>
  );
};

// ── Small card (3-col grid) ───────────────────────────────────────────────────
const SmallCard = ({ article, index }: { article: Card; index: number }) => {
  const isMobile = useIsMobile();
  const objPos = isMobile
    ? `${article.focusMobileX}% ${article.focusMobileY}%`
    : `${article.focusDesktopX}% ${article.focusDesktopY}%`;
  return (
    <Link to={postPath(article)} className="no-underline">
      <motion.article
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.35, delay: index * 0.05 } }}
        className="group flex gap-4 p-4 bg-card border border-border/60 rounded-xl hover:border-primary/25 hover:bg-card/80 transition-all duration-300"
      >
        {/* Thumbnail */}
        <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-muted">
          {article.image ? (
            <img src={article.image} alt={article.title} loading="lazy"
              decoding="async"
              className="img-fade w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              style={{ objectPosition: objPos }}
              onLoad={(e) => e.currentTarget.classList.add("loaded")} />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
              <span className="text-xl opacity-20 select-none">📖</span>
            </div>
          )}
        </div>
        {/* Text */}
        <div className="flex flex-col justify-center gap-1.5 min-w-0">
          <p className="font-sans text-[9px] font-bold uppercase tracking-[0.2em] text-primary">{article.category}</p>
          <h3 className="font-heading text-sm leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">{article.title}</h3>
          <span className="text-[10px] text-muted-foreground/55">{article.date}</span>
        </div>
      </motion.article>
    </Link>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────
const BlogPage = () => {
  const { t } = useLang();
  const { articles, loading } = useData();
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
    () => activeTab === "Barchasi"
      ? publishedArticles
      : publishedArticles.filter((a) => a.category === activeTab),
    [publishedArticles, activeTab]
  );

  return (
    <div className="min-h-screen bg-background relative isolate flex flex-col">
      <Navbar />

      <div className="absolute inset-0 pointer-events-none -z-20 opacity-20 dark:opacity-40"
        style={{ backgroundImage: `url(${parchmentTexture})`, backgroundSize: "cover", backgroundPosition: "center" }} />
      <div className="absolute top-0 right-0 w-[500px] md:w-[1000px] h-[500px] md:h-[1000px] bg-primary/15 dark:bg-primary/10 rounded-full blur-[120px] md:blur-[180px] pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 w-[400px] md:w-[800px] h-[400px] md:h-[800px] bg-amber-700/15 dark:bg-amber-900/20 rounded-full blur-[120px] md:blur-[150px] pointer-events-none -z-10" />
      <div className="absolute inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--background)_90%)]" />

      <main className="flex-grow pt-32 pb-24 px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl w-full">

        {/* ── Hero header ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-20 relative z-10">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
            className="flex flex-col items-start">
            <div className="inline-flex items-center gap-4 mb-6">
              <span className="w-12 h-[1px] bg-gold/50" />
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] text-gold">Booktopia Kundaligi</p>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-heading font-black tracking-tight text-foreground mb-8 leading-tight">
              {t.blog?.title || "So'nggi maqolalar"}
            </h1>
            <p className="font-serif text-foreground/80 text-lg md:text-xl leading-relaxed max-w-xl mb-10 border-l border-gold/40 pl-5">
              Adabiyot yangiliklari, eksklyuziv suhbatlar, asarlar tahlili va nashriyot hayotidagi so'nggi voqealar.
            </p>
            <button onClick={() => window.scrollTo({ top: 600, behavior: "smooth" })} className="btn-glass px-10 py-4">
              Maqolalarga o'tish &darr;
            </button>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden lg:block">
            <div className="absolute -top-4 -left-4 w-16 h-16 border-t-2 border-l-2 border-gold/50 rounded-tl-2xl z-10 pointer-events-none" />
            <div className="absolute -bottom-4 -right-4 w-16 h-16 border-b-2 border-r-2 border-gold/50 rounded-br-2xl z-10 pointer-events-none" />
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl shadow-amber-900/30 dark:shadow-amber-500/10 border border-border/50 group">
              <img src={blogHeaderArt} alt="Booktopia Kundaligi Art"
                className="w-full h-full object-cover transform scale-105 group-hover:scale-110 transition-transform duration-1000" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-6 left-8 z-20">
                <p className="text-accent font-serif italic text-2xl drop-shadow-lg">"Qalam va qog'oz sehri"</p>
                <p className="text-white/70 text-xs tracking-widest uppercase font-bold mt-2">Nashriyot kundaligi</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Category tabs ── */}
        <motion.div
          className="mb-10 border-b border-border/50 pb-6"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
        >
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
        </motion.div>

        {/* ── Article grid ── */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22, ease: "easeInOut" }}>

            {loading ? (
              <div className="space-y-8">
                <div className="grid md:grid-cols-[5fr_7fr] rounded-2xl overflow-hidden border border-border/40 bg-card h-64" aria-hidden="true">
                  <div className="skeleton-shimmer" />
                  <div className="p-10 flex flex-col gap-4">
                    <div className="skeleton-shimmer h-3 w-24 rounded-full" />
                    <div className="skeleton-shimmer h-8 w-4/5 rounded-md" />
                    <div className="skeleton-shimmer h-16 w-full rounded-md" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-8">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-card border border-border/40 rounded-xl overflow-hidden" aria-hidden="true">
                      <div className="skeleton-shimmer aspect-[16/9]" />
                      <div className="p-6 flex flex-col gap-3">
                        <div className="skeleton-shimmer h-3 w-20 rounded-full" />
                        <div className="skeleton-shimmer h-5 w-5/6 rounded-md" />
                        <div className="skeleton-shimmer h-12 w-full rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : displayed.length === 0 ? (
              <div className="border border-dashed border-border/60 bg-muted/10 py-32 flex flex-col items-center justify-center rounded-3xl">
                <Feather className="w-12 h-12 text-accent/30 mb-6" />
                <p className="font-serif text-xl text-muted-foreground">Bu bo'limda hali maqolalar yo'q</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Hero — first article */}
                <HeroCard article={displayed[0]} />

                {/* Mid row — articles 2 & 3 */}
                {displayed.length > 1 && (
                  <div className="grid sm:grid-cols-2 gap-8">
                    {displayed.slice(1, 3).map((article, i) => (
                      <MidCard key={article.id} article={article} index={i} />
                    ))}
                  </div>
                )}

                {/* Remaining articles 4+ — MidCard for ≤2, SmallCard for 3+ */}
                {displayed.length > 3 && (
                  displayed.slice(3).length <= 2 ? (
                    <div className="grid sm:grid-cols-2 gap-8">
                      {displayed.slice(3).map((article, i) => (
                        <MidCard key={article.id} article={article} index={i} />
                      ))}
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {displayed.slice(3).map((article, i) => (
                        <SmallCard key={article.id} article={article} index={i} />
                      ))}
                    </div>
                  )
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

      </main>
      <Footer />
    </div>
  );
};

export default BlogPage;
