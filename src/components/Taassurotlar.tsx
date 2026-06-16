import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence, useInView, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, PenLine } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import { useData } from "@/context/DataContext";
import FeedbackForm from "./FeedbackForm";

// ── Design assets ─────────────────────────────────────────────────────────────
import waxSeal from "@/assets/design/seal.webp";
import pen from "@/assets/design/pen.webp";

// Import the new Van Gogh background (PNG)
let bgImg: string | undefined;
try { bgImg = new URL("@/assets/design/taassurotlar-bg.webp", import.meta.url).href; } catch { bgImg = undefined; }

// ── Types ─────────────────────────────────────────────────────────────────────
interface Review {
  id: string | number;
  name: string;
  role: string | null;
  city: string | null;
  text: string;
  stars: number;
}

// ── Hardcoded seed reviews (shown when DB is empty / loading) ─────────────────
const SEED_REVIEWS: Review[] = [
  {
    id: "seed-1",
    name: "Malika Yusupova",
    role: "Adabiyot o'qituvchisi",
    city: "Toshkent",
    text: "Tarjima shunchalik ravon va tabiiy chiqibdikiki, qachon o'zbek tiliga o'tib ketganimni sezmay qoldim. Har bir so'z o'z joyida — go'yo asar dastlab shu tilda yozilgandek. Bu haqiqiy san'at.",
    stars: 5,
  },
  {
    id: "seed-2",
    name: "Jasur Normatov",
    role: "Yozuvchi va bloger",
    city: "Samarqand",
    text: "Booktopia tarjimalarida eng muhimi — tilning ruhi yo'qolmagan. Qahramonlarning nutqi, ichki kechinmalari — hammasi juda tirik, juda ishonarli. Qolgan kitobxonlargayam katta ishonch bilan tavsiya etaman.",
    stars: 5,
  },
  {
    id: "seed-3",
    name: "Dilnoza Rahimova",
    role: "Universitet talabasi",
    city: "Buxoro",
    text: "Oldin rus tilidagi nusxasini o'qigandim. O'zbek tarjimasini o'qib, go'yo yangi kitob ochgandek his qildim — bu qadar boy, bu qadar jonli. Rahmat, Booktopia!",
    stars: 5,
  },
  {
    id: "seed-4",
    name: "Sherzod Karimov",
    role: "Muhandis, kitob ixlosmandi",
    city: "Namangan",
    text: "Texnik soha odami bo'lsam-da, Booktopia chiqarayotgan kitoblarni sotib olyapman doimiy. Bu darajadagi sifatni kutmagan edim.",
    stars: 5,
  },
  {
    id: "seed-5",
    name: "Feruza Mirzayeva",
    role: "Psixolog",
    city: "Farg'ona",
    text: "Insonning ichki dunyosini ifodalashda tarjimon nihoyatda nozik ish qilgan. Bir zarra ham his-tuyg'u yo'qolmagan. Ana shu darajadagi tarjimani uzoq kutgan edik.",
    stars: 5,
  },
  {
    id: "seed-6",
    name: "Otabek Xolmatov",
    role: "Jurnalist",
    city: "Qarshi",
    text: "Har bir kitob o'zbek tiliga yangi nafas olib kirmoqda. Tahririyat jamoasiga chin yurakdan rahmat!",
    stars: 5,
  },
  {
    id: "seed-7",
    name: "Mohira Sultonova",
    role: "Doktorant, filolog",
    city: "Toshkent",
    text: "Ilmiy nuqtai nazardan ham tarjima sifati a'lo. Leksika, sintaksis, uslub — har bir jihat puxta o'ylangan. O'zbek adabiyotiga munosib va ulkan hissa.",
    stars: 5,
  },
  {
    id: "seed-8",
    name: "Bahodir Toshmatov",
    role: "Maktab o'quvchisi",
    city: "Andijon",
    text: "Navbatdagi kitobni intiqlik bilan kutyapmiz.",
    stars: 5,
  },
];

const SCROLL_STEP = 432;
const AUTOPLAY_MS = 4000;
const PAUSE_MS = 8000;

// ── i18n ──────────────────────────────────────────────────────────────────────
const SECTION_TEXT = {
  uz: {
    badge: "Kitobxonlar fikri",
    title: "Taassurotlar",
    subtitle: "Kitob sahifalaridan ko'ngilga ko'chgan so'zlar.",
    leaveFeedback: "Fikr bildirish",
    hideForm: "Yopish",
  },
  ru: {
    badge: "Мнения читателей",
    title: "Отзывы",
    subtitle: "Слова, которые перешли со страниц книг в сердца.",
    leaveFeedback: "Оставить отзыв",
    hideForm: "Закрыть",
  },
  en: {
    badge: "Readers' Thoughts",
    title: "Testimonials",
    subtitle: "Words that travelled from the page into the heart.",
    leaveFeedback: "Leave a Review",
    hideForm: "Close",
  },
} as const;

type SectionLang = keyof typeof SECTION_TEXT;

// ── Stars ─────────────────────────────────────────────────────────────────────
const Stars = ({ count }: { count: number }) => (
  <div className="flex gap-0.5 mb-4" aria-label={`${count} yulduz`}>
    {Array.from({ length: 5 }).map((_, i) => (
      <span key={i} className={`text-sm leading-none ${i < count ? "text-accent" : "text-neutral-300 dark:text-neutral-600"}`}>
        ★
      </span>
    ))}
  </div>
);

// ── Review card ───────────────────────────────────────────────────────────────
const ReviewCard = ({ review, index }: { review: Review; index: number }) => {
  const reduced = useReducedMotion();
  const rotateDeg = reduced ? 0 : index % 2 === 0 ? 1.6 : -1.6;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{
        opacity: 1, y: 0,
        transition: {
          type: "spring", stiffness: 100, damping: 18,
          delay: Math.min(index * 0.06, 0.36),
        },
      }}
      viewport={{ once: true, margin: "0px" }}
      whileHover={reduced ? {} : { rotate: 0, y: -8, zIndex: 30, transition: { duration: 0.2 } }}
      className="
        relative w-[85vw] max-w-[400px] shrink-0 snap-center whitespace-normal
        rounded-xl p-6 cursor-default select-none
        bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md
        shadow-2xl border border-white/50 dark:border-neutral-700/50
      "
      style={{ rotate: rotateDeg, transformOrigin: "center bottom" }}
    >
      <img
        src={waxSeal} alt="" aria-hidden draggable={false}
        className="absolute -top-4 -right-4 w-14 h-14 object-contain pointer-events-none select-none drop-shadow-xl hover:scale-110 transition-transform duration-300"
      />
      <div
        className="font-serif text-accent/20 dark:text-accent/15 select-none mb-1 leading-none"
        style={{ fontSize: "48px", lineHeight: 1, marginTop: "-4px" }}
        aria-hidden
      >
        "
      </div>
      <Stars count={review.stars} />
      <p className="font-serif text-sm italic leading-relaxed mb-4 break-words text-neutral-800 dark:text-neutral-200">
        {review.text}
      </p>
      <div className="h-px w-10 bg-amber-400/50 dark:bg-primary/90/50 mb-4" />
      <p className="font-serif text-sm font-bold text-neutral-900 dark:text-white leading-tight">
        {review.name}
      </p>
      <p className="font-sans text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 font-medium">
        {[review.role, review.city].filter(Boolean).join(" · ")}
      </p>
    </motion.div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const Taassurotlar = () => {
  const { lang } = useLang();
  const { reviews: dbReviews = [] } = useData() as any;
  const sectionRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(sectionRef, { once: true, margin: "0px" });
  const reduced = useReducedMotion();

  const [isPaused, setIsPaused] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const pauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tx = SECTION_TEXT[(lang as SectionLang)] ?? SECTION_TEXT.uz;

  // Merge: DB published reviews first, then seeds to pad out the carousel
  const reviews: Review[] = dbReviews.length >= 4
    ? dbReviews
    : [
      ...dbReviews,
      ...SEED_REVIEWS.slice(dbReviews.length),
    ];

  // ── Scroll helpers ────────────────────────────────────────────────────────
  const scrollRight = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 10;
    if (atEnd) {
      el.scrollTo({ left: 0, behavior: "smooth" });
    } else {
      el.scrollBy({ left: SCROLL_STEP, behavior: "smooth" });
    }
  }, []);

  const scrollLeft = useCallback(() => {
    scrollRef.current?.scrollBy({ left: -SCROLL_STEP, behavior: "smooth" });
  }, []);

  const triggerPause = useCallback(() => {
    setIsPaused(true);
    if (pauseTimer.current) clearTimeout(pauseTimer.current);
    pauseTimer.current = setTimeout(() => setIsPaused(false), PAUSE_MS);
  }, []);

  const handleLeft = useCallback(() => { scrollLeft(); triggerPause(); }, [scrollLeft, triggerPause]);
  const handleRight = useCallback(() => { scrollRight(); triggerPause(); }, [scrollRight, triggerPause]);

  // ── Auto-play ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isPaused || reduced || showForm) return;
    const interval = setInterval(scrollRight, AUTOPLAY_MS);
    return () => clearInterval(interval);
  }, [isPaused, reduced, scrollRight, showForm]);

  // Cleanup pause timer on unmount
  useEffect(() => {
    return () => { if (pauseTimer.current) clearTimeout(pauseTimer.current); };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="taassurotlar"
      // TIGHTER PADDING for compact view
      className="relative overflow-hidden py-12 md:py-16 border-y border-neutral-200/50 dark:border-white/10 z-10"
    >
      {/* ── Background: Painted Masterpiece ── */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div aria-hidden className="absolute inset-0 transition-opacity duration-700"
          style={{
            backgroundImage: bgImg ? `url(${bgImg})` : undefined,
            backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat",
            opacity: 0.9,
          }}
        />
        {/* The user's requested bg-white/40 overlay */}
        <div className="absolute inset-0 bg-white/40 dark:bg-black/60" />
      </div>

      <div className="relative z-10">

        {/* ── HIGH-CONTRAST HEADER ── */}
        <motion.div
          // REDUCED MARGIN BOTTOM
          className="text-center px-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65 }}
        >
          <div className="inline-flex items-center justify-center gap-4 mb-4">
            {/* Left Pen - Darker for visibility */}
            <img src={pen} alt="" aria-hidden draggable={false}
              className="w-7 h-7 object-contain opacity-90 dark:opacity-60 -scale-x-100 drop-shadow-md"
              style={{ filter: "grayscale(0.2)" }}
            />
            {/* BADGE - Dark amber, extra bold */}
            <p className="text-xs font-heading font-black uppercase tracking-[0.35em] text-amber-950 dark:text-accent whitespace-nowrap drop-shadow-sm">
              {tx.badge}
            </p>
            {/* Right Pen */}
            <img src={pen} alt="" aria-hidden draggable={false}
              className="w-7 h-7 object-contain opacity-90 dark:opacity-60 drop-shadow-md"
              style={{ filter: "grayscale(0.2)" }}
            />
          </div>

          {/* TITLE */}
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold leading-[1.05] tracking-wide text-amber-950 dark:text-white mb-3 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {tx.title}
          </h2>

          {/* SUBTITLE */}
          <p className="font-serif italic text-amber-950 dark:text-neutral-100 text-lg md:text-xl leading-loose max-w-md mx-auto drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)] dark:drop-shadow-md">
            {tx.subtitle}
          </p>
        </motion.div>

        {/* Carousel - REDUCED VERTICAL PADDING */}
        <div
          ref={scrollRef}
          className="flex overflow-x-auto gap-8 pb-8 pt-4 px-6 sm:px-12 md:px-20 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
        >
          <style>{`#taassurotlar div::-webkit-scrollbar{display:none}`}</style>
          {reviews.map((review, i) => (
            <ReviewCard key={review.id} review={review} index={i} />
          ))}
          <div className="shrink-0 w-6 sm:w-10" aria-hidden />
        </div>

        <div className="flex items-center justify-center gap-5 mt-2">
          <button
            onClick={handleLeft}
            className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md shadow-md border border-neutral-200/50 dark:border-white/10 p-3 rounded-full text-neutral-600 dark:text-neutral-400 hover:text-primary dark:hover:text-accent hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none"
            aria-label="Oldingi sharh"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Auto-play indicator */}
          <div className="flex items-center gap-2 w-8 justify-center">
            {isPaused ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-400/50 dark:bg-neutral-600/50" />
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-400/50 dark:bg-neutral-600/50" />
              </>
            ) : (
              <span className="h-2 w-2 rounded-full bg-primary/80 transition-colors duration-300" />
            )}
          </div>

          <button
            onClick={handleRight}
            className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md shadow-md border border-neutral-200/50 dark:border-white/10 p-3 rounded-full text-neutral-600 dark:text-neutral-400 hover:text-primary dark:hover:text-accent hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none"
            aria-label="Keyingi sharh"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Leave feedback toggle - REDUCED MARGIN TOP */}
        <div className="flex justify-center mt-6">
          <motion.button
            whileTap={{ scale: 0.985 }}
            onClick={() => { setShowForm((p) => !p); triggerPause(); }}
            className="btn-glass"
          >
            <PenLine className="h-4 w-4" />
            {showForm ? tx.hideForm : tx.leaveFeedback}
          </motion.button>
        </div>

        {/* Collapsible feedback form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="mx-auto max-w-2xl px-6 mt-8 pb-4">
                <FeedbackForm />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom flourish - REDUCED MARGIN & THICKER, BOLDER LINES */}
        <motion.div
          className="flex items-center justify-center gap-4 mt-8 pb-2"
          initial={{ opacity: 0 }}
          animate={headerInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          {/* Thicker h-[2px] and solid amber colors */}
          <div className="h-[2px] w-20 bg-gradient-to-r from-amber-600/10 to-amber-600/80 dark:from-amber-500/10 dark:to-amber-500/80" />
          <img src={waxSeal} alt="" aria-hidden draggable={false}
            className="w-10 h-10 object-contain drop-shadow-md"
          />
          <div className="h-[2px] w-20 bg-gradient-to-l from-amber-600/10 to-amber-600/80 dark:from-amber-500/10 dark:to-amber-500/80" />
        </motion.div>

      </div>
    </section>
  );
};

export default Taassurotlar;