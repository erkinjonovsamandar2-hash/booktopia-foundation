import { useState, useEffect, useCallback } from "react";
import { useLang, locField } from "@/context/LanguageContext";
import { useData } from "@/context/DataContext";
import type { NewBook } from "@/types/database";
import "./YangiNashrlar.css";

const resolveBgUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) return url;
  return `${import.meta.env.VITE_SUPABASE_URL as string}/storage/v1/object/public/${url}`;
};

// ── Per-book tag metadata ──────────────────────────────────────────────────────
// Tags are not stored in the DB — add a book's id here to assign display tags.
// DB books without an entry will render without tags (still shows fine).
const BOOK_TAGS: Record<string, string[]> = {
  "upcoming-1": ["Distopiya", "Falsafa", "18+"],
  "upcoming-3": ["Gotika", "Drama", "XIX asr"],
  "upcoming-4": ["Modernizm", "Psixologik", "Klassika"],
  "upcoming-2": ["Tarixiy", "Sarguzasht", "Renessans"],
};

// ── Mock books — displayed when DB has fewer than 4 entries ───────────────────
const UPCOMING_BOOKS_MOCK: NewBook[] = [
  {
    id: "upcoming-1",
    slug: "murvatli-apelsin",
    title: "Murvatli Apelsin", title_ru: "Заводной апельсин", title_en: "A Clockwork Orange",
    author: "Entoni Byorjess", author_ru: "Энтони Бёрджесс", author_en: "Anthony Burgess",
    description: "37 davlatda taqiqlangan. 100 davlatda nashr etilgan.",
    description_ru: "Запрещена в 37 странах. Издана в 100.",
    description_en: "Banned in 37 countries. Published in 100.",
    cover_url: "/upcoming/apelsin.png",
    bg_color: "25 90% 50%", category: "soon", price: null,
    enable_3d_flip: false, featured: false, sort_order: 1,
    img_focus_x: null, img_focus_y: null,
    focus_desktop_x: null, focus_desktop_y: null,
    focus_mobile_x: null, focus_mobile_y: null,
    created_at: "", updated_at: "",
  },
  {
    id: "upcoming-3",
    slug: "ijarachi",
    title: "Ijarachi", title_ru: "Квартирантка", title_en: "The Tenant of Wildfell Hall",
    author: "Enn Bronte", author_ru: "Энн Бронте", author_en: "Anne Brontë",
    description: "Opalar qo'lyozmani yoqib yuborishmoqchi bo'ldi. Baribir nashr ettirildi.",
    description_ru: "Сёстры пытались сжечь рукопись. Но она всё равно была издана.",
    description_en: "Her sisters tried to burn the manuscript. It was published anyway.",
    cover_url: "/upcoming/ijarachi.png",
    bg_color: "210 30% 20%", category: "soon", price: null,
    enable_3d_flip: false, featured: false, sort_order: 2,
    img_focus_x: null, img_focus_y: null,
    focus_desktop_x: null, focus_desktop_y: null,
    focus_mobile_x: null, focus_mobile_y: null,
    created_at: "", updated_at: "",
  },
  {
    id: "upcoming-4",
    slug: "mayoq-sari",
    title: "Mayoq sari", title_ru: "На маяк", title_en: "To the Lighthouse",
    author: "Virdjiniya Vulf", author_ru: "Вирджиния Вулф", author_en: "Virginia Woolf",
    description: "Bir yoz faslida yozildi. Bir asrdan beri o'qitilmoqda.",
    description_ru: "Написана за одно лето. Изучается уже столетие.",
    description_en: "Written in one summer. Studied for a century.",
    cover_url: "/upcoming/mayoq.png",
    bg_color: "180 40% 25%", category: "soon", price: null,
    enable_3d_flip: false, featured: false, sort_order: 3,
    img_focus_x: null, img_focus_y: null,
    focus_desktop_x: null, focus_desktop_y: null,
    focus_mobile_x: null, focus_mobile_y: null,
    created_at: "", updated_at: "",
  },
  {
    id: "upcoming-2",
    slug: "askanio",
    title: "Askanio", title_ru: "Асканио", title_en: "Ascanio",
    author: "Aleksandr Dyuma", author_ru: "Александр Дюма", author_en: "Alexandre Dumas",
    description: "Uyg'onish davri Italiyasi: bir usta, bir muhabbat, bir sir.",
    description_ru: "Челлини был реальным. Остальное придумал Дюма.",
    description_en: "Cellini was real. The rest is Dumas.",
    cover_url: "/upcoming/askanio.png",
    bg_color: "120 20% 30%", category: "soon", price: null,
    enable_3d_flip: false, featured: false, sort_order: 4,
    img_focus_x: null, img_focus_y: null,
    focus_desktop_x: null, focus_desktop_y: null,
    focus_mobile_x: null, focus_mobile_y: null,
    created_at: "", updated_at: "",
  },
];

const resolveImageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) return url;
  return `${import.meta.env.VITE_SUPABASE_URL as string}/storage/v1/object/public/${url}`;
};

const YangiNashrlar = () => {
  const { lang } = useLang();
  const { newBooks, siteSettings } = useData();
  const paintingUrl = resolveBgUrl(siteSettings?.yangiNashrlar?.bg_image_url);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [textKey, setTextKey] = useState(0);

  // Sort by sort_order regardless of DataContext fetch ordering
  const sortedDbBooks = [...newBooks].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const missingMocks = UPCOMING_BOOKS_MOCK.filter(
    (m) => !sortedDbBooks.some((b) => b.id === m.id || b.title === m.title)
  );
  const displayBooks =
    sortedDbBooks.length >= 4
      ? sortedDbBooks.slice(0, 4)
      : [...sortedDbBooks, ...missingMocks].slice(0, 4);

  const goTo = useCallback(
    (index: number) => {
      if (index === activeIndex) return;
      setActiveIndex(index);
      setTextKey((k) => k + 1);
    },
    [activeIndex]
  );

  const next = useCallback(() => {
    goTo((activeIndex + 1) % displayBooks.length);
  }, [activeIndex, displayBooks.length, goTo]);

  useEffect(() => {
    if (!isPlaying || displayBooks.length <= 1) return;
    const timer = setTimeout(next, 5000);
    return () => clearTimeout(timer);
  }, [isPlaying, next, displayBooks.length]);

  if (displayBooks.length === 0) return null;

  const activeBook = displayBooks[activeIndex];
  const activeTags = BOOK_TAGS[activeBook.id] ?? [];

  // Extract hue only from bg_color — force vibrant S/L so dark book colors
  // still produce a visible glow (e.g. "210 30% 20%" → hue 210 at full vibrancy)
  const glowHue = activeBook.bg_color
    ? parseFloat(activeBook.bg_color.split(" ")[0])
    : null;
  const ambientGlow =
    glowHue != null && !isNaN(glowHue)
      ? `radial-gradient(ellipse 60% 70% at 68% 50%, hsl(${glowHue} 78% 50% / 0.32) 0%, transparent 72%)`
      : `radial-gradient(ellipse 60% 70% at 68% 50%, hsl(38 75% 50% / 0.22) 0%, transparent 72%)`;

  // Visual position for each book: 0 = front (active), 1–3 = peeking behind
  const visualPos = (bookIndex: number) =>
    (bookIndex - activeIndex + displayBooks.length) % displayBooks.length;

  return (
    <section className="yn-section" id="yangi-nashrlar">
      {paintingUrl && (
        <>
          <div className="yn-bg-painting" style={{ backgroundImage: `url(${paintingUrl})` }} />
          <div className="yn-bg-painting-overlay" />
        </>
      )}
      <div className="yn-noise-overlay" />
      <div className="yn-ambient-glow" style={{ background: ambientGlow }} />

      <div className="yn-content-wrapper">

        {/* ── LEFT: Info Panel ──────────────────────────────────────────────── */}
        <div className="yn-info-panel">
          <div className="yn-eyebrow">
            <div className="yn-eyebrow-line" />
            <span className="yn-eyebrow-text">Tez Kunda</span>
          </div>

          {/* Re-keyed on every active change → restarts the CSS entrance animation */}
          <div key={textKey} className="yn-text-block">
            <p className="yn-author">{locField(activeBook, "author", lang)}</p>
            <h2 className="yn-title">{locField(activeBook, "title", lang)}</h2>
            <div className="yn-divider" />

            {activeTags.length > 0 && (
              <div className="yn-tags">
                {activeTags.map((tag, i) => (
                  <span key={tag} className={`yn-tag${i === 0 ? " yn-tag--primary" : ""}`}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {locField(activeBook, "description", lang) && (
              <p className="yn-description">
                {locField(activeBook, "description", lang)}
              </p>
            )}

            <p className="yn-soon-badge">Tez orada chiqadi</p>
          </div>

          <div className="yn-dots">
            {displayBooks.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`yn-dot${i === activeIndex ? " yn-dot--active" : ""}`}
                aria-label={`${i + 1}-kitobga o'tish`}
              />
            ))}
          </div>
        </div>

        {/* ── RIGHT: Book Stack ─────────────────────────────────────────────── */}
        <div className="yn-deck-wrapper">
          <button
            className="yn-play-btn"
            onClick={() => setIsPlaying((p) => !p)}
            aria-label={isPlaying ? "To'xtatish" : "Davom ettirish"}
          >
            {isPlaying ? (
              <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor" aria-hidden="true">
                <rect x="1.5" y="0.5" width="3" height="10" rx="1" />
                <rect x="6.5" y="0.5" width="3" height="10" rx="1" />
              </svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor" aria-hidden="true">
                <path d="M1.5 1.2l8.5 4.3-8.5 4.3V1.2z" />
              </svg>
            )}
          </button>

          <div className="yn-deck">
            {displayBooks.map((book, i) => {
              const pos = visualPos(i);
              const coverSrc = resolveImageUrl(book.cover_url);
              const fallbackBg = book.bg_color ? `hsl(${book.bg_color})` : "#1a1a2e";

              return (
                <div
                  key={book.id}
                  className="yn-card-wrapper"
                  data-pos={pos}
                  onClick={() => pos !== 0 && goTo(i)}
                >
                  <div className="yn-card" style={{ backgroundColor: fallbackBg }}>
                    {coverSrc && (
                      <img
                        src={coverSrc}
                        alt={pos === 0 ? locField(book, "title", lang) : ""}
                        className="yn-card-img img-fade"
                        loading={pos === 0 ? "eager" : "lazy"}
                        decoding="async"
                        style={{
                          objectPosition:
                            book.focus_desktop_x != null && book.focus_desktop_y != null
                              ? `${book.focus_desktop_x}% ${book.focus_desktop_y}%`
                              : "center 20%",
                        }}
                        onLoad={(e) => e.currentTarget.classList.add("loaded")}
                      />
                    )}
                    <div className="yn-card-spine" />
                    {pos === 0 && <div className="yn-card-badge">TEZDA</div>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="yn-progress-track">
            {isPlaying ? (
              <div
                key={`${activeIndex}-auto`}
                className="yn-progress-fill yn-progress-fill--auto"
              />
            ) : (
              <div
                className="yn-progress-fill"
                style={{ width: `${((activeIndex + 1) / displayBooks.length) * 100}%` }}
              />
            )}
          </div>
        </div>

      </div>

      <a
        href="https://t.me/booktopia_press"
        target="_blank"
        rel="noopener noreferrer"
        className="yn-cta"
      >
        Yangi nashrlardan birinchi bo'lib xabardor bo'lish uchun obuna bo'ling →
      </a>
    </section>
  );
};

export default YangiNashrlar;
