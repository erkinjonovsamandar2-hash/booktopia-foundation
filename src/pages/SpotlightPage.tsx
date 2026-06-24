import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import gotBg from "@/assets/design/bgot.webp";
import gotBooks from "@/assets/design/got-books.webp";
import { ChevronRight } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useLang, locField } from "@/context/LanguageContext";
import BookCover from "@/components/BookCover";

const SpotlightPage = () => {
  const { books } = useData();
  const { lang } = useLang();

  // Filter books specifically for Game of Thrones series
  const kolleksiyaBooks = books.filter(
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
  ).slice(0, 8);

  return (
    <div className="min-h-screen bg-[#0a0806] pt-24 pb-16 relative">
      {/* Fixed background texture (very subtle) */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <img
          src={gotBg}
          alt=""
          className="w-full h-full object-cover opacity-10"
        />
      </div>

      <Navbar />

      <div className="relative z-10">
        {/* ── CINEMATIC HERO ──────────────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-6 pt-8 md:pt-12 pb-16">
          <div className="flex flex-col items-center text-center">

            {/* Title - Game of Thrones style (UNCLIPPED) */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="
                font-got
                tracking-[0.15em]
                text-4xl md:text-5xl lg:text-6xl
                leading-[1.4]
                py-4
                mb-12
                bg-gradient-to-b from-[#fff7ad] via-[#ffc107] to-[#b91c1c]
                bg-clip-text text-transparent
                drop-shadow-[0_2px_20px_rgba(255,160,0,0.3)]
              "
            >
              MUZ VA OLOV QO'SHIG'I
            </motion.h1>

            {/* Featured Books Image with CINEMATIC CROP */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {/* Cinematic Cropped Hero */}
              <div className="relative w-full max-w-5xl mx-auto h-[350px] md:h-[500px] rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(251,191,36,0.1)] border border-amber-500/20 mb-12 group">
                {/* object-top combined with a fixed height naturally chops off the bottom of tall images */}
                <img
                  src={gotBooks}
                  alt="Taxtlar O'yini Kitoblari"
                  className="w-full h-[130%] object-cover object-[center_15%] transition-transform duration-1000 group-hover:scale-105"
                />
                {/* Inner shadow overlays to blend the sharp edges into the dark page */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0806] via-transparent to-[#0a0806]/50 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0a0806] via-transparent to-[#0a0806] pointer-events-none" />
              </div>
            </motion.div>

            {/* Lore Text (REFINED) */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="
                max-w-3xl
                font-serif italic
                text-neutral-300
                text-lg md:text-xl
                leading-relaxed
                mb-10
              "
            >
              Vesterosning taqdiri qilich damida va ajdaholar nafasida. Booktopia taqdim etadi: Dunyoni o'zgartirgan saga ilk bor o'zbek tilida.
            </motion.p>

            {/* Navigation Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link
                to="/library?series=got"
                className="btn-glass px-10 py-5 rounded-sm"
              >
                <span>Kutubxonani ko'rish</span>
                <ChevronRight className="h-4 w-4 shrink-0" />
              </Link>

              <Link
                to="/quiz"
                className="btn-glass-ghost px-10 py-5 rounded-sm"
              >
                <span>Uyingizni aniqlash</span>
                <ChevronRight className="h-4 w-4 shrink-0" />
              </Link>
            </motion.div>

          </div>
        </section>

        {/* Archive Vault Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent my-16" />

        {/* ── KOLLEKSIYA (Collection) ────────────────────────────────────── */}
        {kolleksiyaBooks.length > 0 && (
          <section className="mx-auto max-w-7xl px-6 py-12">
            <div className="mb-10">
              <h2 className="text-3xl md:text-4xl font-heading font-black tracking-tight font-bold text-foreground mb-3">
                {lang === "ru" ? "Коллекция" : lang === "en" ? "Collection" : "Kolleksiya"}
              </h2>
              <p className="text-sm font-sans font-bold uppercase tracking-[0.2em] text-gold">
                {lang === "ru" ? "Полная серия Песни Льда и Пламени" : lang === "en" ? "The Complete Song of Ice and Fire Series" : "Muz va Olov Qo'shig'ining to'liq seriyasi"}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {kolleksiyaBooks.map((book, i) => (
                <div
                  key={book.id}
                  className="bg-black/40 border border-white/10 backdrop-blur-md rounded-xl overflow-visible group hover:border-amber-500/50 transition-all duration-300"
                >
                  <div className="p-3">
                    <BookCover
                      src={book.cover_url}
                      alt={locField(book, "title", lang)}
                      className="w-full"
                      hover={true}
                      loading="lazy"
                    />
                  </div>
                  <div className="p-4 pt-2">
                    <h3 className="font-heading font-bold text-foreground text-sm line-clamp-2 leading-tight mb-2 group-hover:text-gold transition-colors">
                      {locField(book, "title", lang)}
                    </h3>
                    <p className="font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-gold/70">
                      {locField(book, "author", lang)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── SOHA YANGILIKLARI - Placeholder Grid ───────────────────────── */}
        <div className="mt-24 mb-16 mx-auto max-w-7xl px-6">
          <div className="flex items-center gap-6 mb-10">
            <h2 className="text-2xl md:text-3xl font-heading font-black tracking-tight text-foreground">Soha Yangiliklari</h2>
            <div className="h-[1px] bg-gold/20 flex-grow" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Article Card 1 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-gold/40 transition-all duration-300 cursor-pointer group hover:-translate-y-1">
              <div className="w-full h-48 bg-[#0a0806] rounded-lg mb-4 flex items-center justify-center border border-white/5 overflow-hidden">
                <span className="text-4xl opacity-50 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all group-hover:scale-110 duration-700">📜</span>
              </div>
              <h3 className="text-foreground font-heading font-bold text-lg mb-2 group-hover:text-gold transition-colors line-clamp-2">Jorj R.R. Martin yangi asar ustida ishlamoqda</h3>
              <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed">Vesteros olami kengayishda davom etmoqda. Muallif o'zining so'nggi intervyusida kelajakdagi rejalarini ma'lum qildi...</p>
            </div>

            {/* Article Card 2 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-amber-500/40 transition-all duration-300 cursor-pointer group hover:-translate-y-1">
              <div className="w-full h-48 bg-[#0a0806] rounded-lg mb-4 flex items-center justify-center border border-white/5">
                <span className="text-4xl opacity-50 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all">⚔️</span>
              </div>
              <h3 className="text-accent font-medium mb-2 group-hover:text-accent line-clamp-2">Ajdaholar raqsi: Tarixiy faktlar</h3>
              <p className="text-neutral-400 text-sm line-clamp-3">Targaryenlar xonadonidagi eng qonli fuqarolar urushi qanday boshlangan edi? Kitob va serial o'rtasidagi farqlar...</p>
            </div>
          </div>
        </div>

      </div>

      <Footer />
    </div>
  );
};

export default SpotlightPage;