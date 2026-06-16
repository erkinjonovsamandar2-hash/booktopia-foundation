import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useData } from "@/context/DataContext";
import { useLang, locField } from "@/context/LanguageContext";
import { ChevronRight } from "lucide-react";
import gotBg from "@/assets/design/bgot.webp";
import gotBooks from "@/assets/design/got-books.webp";
import gotScroll from "@/assets/design/got-scroll.webp";
import gotShields from "@/assets/design/got-shields.webp";
import gotStack from "@/assets/design/got-stack.webp";

// ── Translations ──────────────────────────────────────────────────────────────
const TRANSLATIONS = {
  uz: {
    eyebrow: "Kitob seriyasi",
    latestNews: "So'nggi yangiliklar",
    discoverBtn: "Olamni kashf et",
    quizLabel: "Qaysi uy vakilisiz?",
    quizSub: "Taxtlar O'yini — Qahramonlar testi",
    booksLabel: (n: number) => `${n > 0 ? n : "—"} ta kitob mavjud`,
    booksSub: "Seriyaning barcha kitoblari",
    articleFallbackLabel: "So'nggi maqola",
    articleFallbackSub: "Tez orada...",
    newLabel: "Yangi",
    description: "Yetti qirollik. Ming yillik urushlar. Bitta taxt. Jorj R.R. Martin yaratgan buyuk olamning o'zbek tilidagi to'liq seriyasi.",
    tagline1: '"Winter is coming –',
    tagline2: 'Qish kelmoqda."',
    footnote: '"Fire and Blood. Hear Me Roar. We Do Not Sow."',
  },
  ru: {
    eyebrow: "Книжная серия",
    latestNews: "Последние новости",
    discoverBtn: "Открыть мир",
    quizLabel: "Из какого вы Дома?",
    quizSub: "Игра Престолов — тест по персонажам",
    booksLabel: (n: number) => `${n > 0 ? n : "—"} книг доступно`,
    booksSub: "Все книги серии",
    articleFallbackLabel: "Последняя статья",
    articleFallbackSub: "Скоро...",
    newLabel: "Новое",
    description: "Семь королевств. Тысячелетние войны. Один трон. Полная серия Джорджа Р.Р. Мартина на узбекском языке.",
    tagline1: '"Winter is coming –',
    tagline2: 'Зима близко."',
    footnote: '"Огонь и кровь. Слышишь мой рёв. Мы не сеем."',
  },
  en: {
    eyebrow: "Book Series",
    latestNews: "Latest Updates",
    discoverBtn: "Discover the World",
    quizLabel: "Which House are you?",
    quizSub: "Game of Thrones — Character Quiz",
    booksLabel: (n: number) => `${n > 0 ? n : "—"} books available`,
    booksSub: "Full series collection",
    articleFallbackLabel: "Latest article",
    articleFallbackSub: "Coming soon...",
    newLabel: "New",
    description: "Seven Kingdoms. A thousand years of war. One throne. The complete George R.R. Martin series in Uzbek.",
    tagline1: '"Winter is coming –',
    tagline2: 'The cold draws near."',
    footnote: '"Fire and Blood. Hear Me Roar. We Do Not Sow."',
  },
} as const;

type TxLang = keyof typeof TRANSLATIONS;

// ── Sigil strip ───────────────────────────────────────────────────────────────
const SIGILS = ["🐺", "🦁", "🐉", "🌹", "🐙"] as const;

// ── Framer Motion variants ────────────────────────────────────────────────────
const leftContent = {
  hidden: { opacity: 0, x: -32 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: "easeOut" as const } },
};
const cardItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 20 } },
};

// ── Compact Info Card (Strengthened) ──────────────────────────────────────────
const InfoCard = ({
  icon, label, sub, onClick,
}: {
  icon: string;
  label: string;
  sub: string;
  onClick: () => void;
}) => (
  <motion.button
    variants={cardItem}
    onClick={onClick}
    whileHover={{ y: -2, transition: { duration: 0.2 } }}
    whileTap={{ scale: 0.98 }}
    className="btn-glass w-full"
  >
    {/* Icon with enhanced glow */}
    <div className="
      flex h-14 w-14 shrink-0 items-center justify-center rounded-md
      bg-primary/10
    ">
      <img
        src={icon}
        alt=""
        className="w-12 h-12 object-contain drop-shadow-[0_0_15px_rgba(251,191,36,0.4)] group-hover:scale-110 transition-all duration-500"
      />
    </div>

    {/* Text */}
    <div className="flex flex-col items-center text-center">
      <span className="
        font-bold text-accent tracking-wide
        text-sm md:text-base
        drop-shadow-sm
      ">
        {label}
      </span>
      <span className="
        font-medium text-white/80
        text-xs md:text-sm
        mt-1
      ">
        {sub}
      </span>
    </div>
  </motion.button>
);

// ── Main Component ────────────────────────────────────────────────────────────
const TaxtlarTeaser = () => {
  const { books, articles } = useData();
  const { lang } = useLang();
  const navigate = useNavigate();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const tx = TRANSLATIONS[(lang as TxLang)] ?? TRANSLATIONS.uz;

  const seriesArticle =
    articles.find(
      (a) =>
        a.published &&
        (a.title?.toLowerCase().includes("taxtlar") ||
          a.title?.toLowerCase().includes("game") ||
          a.title?.toLowerCase().includes("thrones"))
    ) ?? articles.find((a) => a.published) ?? null;

  // Filter books specifically for Game of Thrones series
  const gotBooksCount = books.filter(
    (b) => {
      const titleLower = b.title?.toLowerCase() || "";
      const titleEnLower = b.title_en?.toLowerCase() || "";
      const titleRuLower = b.title_ru?.toLowerCase() || "";
      return (
        titleLower.includes("taxtlar") ||
        titleLower.includes("qirollar") ||
        titleEnLower.includes("game") ||
        titleEnLower.includes("thrones") ||
        titleRuLower.includes("престол") ||
        titleRuLower.includes("игра")
      );
    }
  ).length;

  return (
    <section
      ref={ref}
      id="taxtlar-oyini"
      className="
        relative w-full
        bg-[#0a0806]
        overflow-hidden
        z-10
      "
    >
      {/* ── High-Fidelity Background Texture ───────────────────────────── */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <img
          src={gotBg}
          alt="Astrolabe Texture"
          className="w-full h-full object-cover opacity-35 mix-blend-overlay contrast-125"
        />
        <div className="absolute inset-0 bg-[#0a0806]/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0806] via-transparent to-[#0a0806]" />
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          CONTENT (TIGHTENED SPACING)
          ════════════════════════════════════════════════════════════════════ */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-12 md:py-16">

        {/* ── Sigil strip ───────────────────────────────────────────────── */}
        <motion.div
          className="flex items-center gap-3 mb-10"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
        >
          <div className="h-px flex-1 max-w-[60px] bg-gradient-to-r from-transparent to-amber-400/50" />
          {SIGILS.map((s, i) => (
            <span
              key={i}
              className="text-base"
              style={{ opacity: 0.4 + i * 0.06, filter: "grayscale(0.2)" }}
            >
              {s}
            </span>
          ))}
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-400/50" />
        </motion.div>

        {/* ── Two-column grid (REDUCED BOTTOM MARGIN) ────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-start mb-6">

          {/* LEFT ─────────────────────────────────────────────────────── */}
          <motion.div
            variants={leftContent}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
          >
            {/* Eyebrow */}
            <p className="
              mb-3 text-[11px] font-sans font-semibold uppercase tracking-[0.4em]
              text-primary/80
            ">
              {tx.eyebrow}
            </p>

            {/* Series name — CINEMATIC MAX-WIDTH */}
            <h2
              className="
                font-got
                tracking-[0.1em]
                text-5xl md:text-6xl lg:text-7xl
                mb-6
                max-w-xl
                bg-gradient-to-b from-[#fff7ad] via-[#ffc107] to-[#b91c1c]
                bg-clip-text text-transparent
                drop-shadow-[0_2px_15px_rgba(255,160,0,0.4)]
                leading-[1.4]
                py-2
              "
            >
              Taxtlar
              <br />
              O'yini
            </h2>

            {/* Sword divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-10 bg-amber-400/40" />
              <ChevronRight className="h-3.5 w-3.5 text-primary/60 -rotate-90" />
              <div className="h-px w-20 bg-amber-400/25" />
            </div>

            {/* Tagline */}
            <blockquote className="
              text-xl md:text-2xl
              font-serif italic
              text-amber-50/90
              mb-6
              border-l-2 border-amber-600
              pl-4
            ">
              {tx.tagline1}
              <br />
              {tx.tagline2}
            </blockquote>

            {/* Description */}
            <p className="
              font-sans text-sm leading-relaxed max-w-sm
              text-neutral-400
            ">
              {tx.description}
            </p>
          </motion.div>

          {/* RIGHT ────────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Featured Books Banner (LEGENDARY HEIGHT) */}
            <div
              className="relative w-full h-80 rounded-xl border border-amber-500/30 overflow-hidden group cursor-pointer"
              onClick={() => navigate("/library?series=got")}
            >
              <img
                src={gotBooks}
                alt="Yangi nashrlar"
                className="w-full h-full object-cover object-[center_35%] opacity-90 transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0806] via-[#0a0806]/60 to-transparent" />

              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                <div>
                  <h3 className="font-got text-xl text-accent mb-1 tracking-wider drop-shadow-md">Yangi Nashrlar</h3>
                  <p className="text-sm text-neutral-300 drop-shadow-md">Taxtlar O'yini & Qirollar To'qnashuvi</p>
                </div>
                <div className="hidden sm:block px-4 py-1.5 bg-primary/20 border border-amber-500/50 rounded-full text-xs text-amber-200 backdrop-blur-md">
                  Oldindan buyurtma
                </div>
              </div>
            </div>
          </motion.div>

        </div>

        {/* ── UNIFIED COMMAND CENTER: 3 Cards + CTA Button ────────────────── */}
        <motion.div
          className="flex flex-col sm:flex-row items-stretch gap-4"
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.1, delayChildren: 0.4 } },
          }}
        >
          {/* 3 Info Cards in a grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
            <InfoCard
              icon={gotScroll}
              label={
                seriesArticle
                  ? locField(seriesArticle, "title", lang) ?? tx.articleFallbackLabel
                  : tx.articleFallbackLabel
              }
              sub={
                seriesArticle?.published_at
                  ? new Date(seriesArticle.published_at).toLocaleDateString(
                    lang === "en" ? "en-GB" : lang === "ru" ? "ru-RU" : "uz-UZ",
                    { day: "numeric", month: "long" }
                  )
                  : tx.articleFallbackSub
              }
              onClick={() =>
                seriesArticle
                  ? navigate(`/blog/${seriesArticle.id}`)
                  : navigate("/blog")
              }
            />

            <InfoCard
              icon={gotShields}
              label={tx.quizLabel}
              sub={tx.quizSub}
              onClick={() => navigate("/taxtlar-quiz")}
            />

            <InfoCard
              icon={gotStack}
              label={tx.booksLabel(gotBooksCount)}
              sub={tx.booksSub}
              onClick={() => navigate("/library?series=got")}
            />
          </div>

          {/* Epic CTA Button (moved from left column) */}
          <motion.button
            variants={cardItem}
            onClick={() => navigate("/library?series=got")}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="btn-glass
              inline-flex items-center justify-center gap-2
              px-10 py-4
              rounded-sm
              text-accent
              font-got tracking-[0.15em] uppercase text-sm
              hover:bg-amber-900/20 hover:border-amber-400 hover:text-accent
              transition-all duration-300
              shadow-[0_0_15px_rgba(217,119,6,0.1)]
              hover:shadow-[0_0_25px_rgba(217,119,6,0.3)]
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
              w-full sm:w-auto
              h-full
            "
          >
            <span>{tx.discoverBtn}</span>
            <ChevronRight className="h-4 w-4 shrink-0" />
          </motion.button>
        </motion.div>

        {/* House words footnote */}
        <motion.p
          className="
            font-serif italic text-[11px] text-center
            text-neutral-600
            mt-4
          "
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          {tx.footnote}
        </motion.p>

      </div>
    </section>
  );
};

export default TaxtlarTeaser;