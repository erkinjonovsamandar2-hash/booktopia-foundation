import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Compass, Home } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import parchmentTexture from "@/assets/design/parchment-texture.webp";

const NotFound = () => {
  const location = useLocation();
  const { lang } = useLang();

  useEffect(() => {
    console.error("404 Error: Missing manuscript at route:", location.pathname);
  }, [location.pathname]);

  // ── Multilingual Dictionary for the "Lost Manuscript" Theme ──
  const content = {
    uz: {
      badge: "Xatolik 404",
      title: "Yo'qolgan Qo'lyozma",
      desc: "Kechirasiz, siz qidirayotgan sahifa kutubxonamizdan topilmadi. U o'chirilgan, nomi o'zgargan yoki noma'lum olamga ko'chirilgan bo'lishi mumkin.",
      btn: "Bosh sahifaga qaytish",
    },
    ru: {
      badge: "Ошибка 404",
      title: "Потерянная рукопись",
      desc: "Извините, страница, которую вы ищете, не найдена в нашей библиотеке. Возможно, она была удалена, переименована или перемещена в неизвестный мир.",
      btn: "Вернуться на главную",
    },
    en: {
      badge: "Error 404",
      title: "Lost Manuscript",
      desc: "Sorry, the page you are looking for could not be found in our library. It may have been removed, renamed, or relocated to an unknown realm.",
      btn: "Return to Homepage",
    }
  };

  // Fallback to Uzbek if the lang string is unexpected
  const currentLang = (lang === "uz" || lang === "ru" || lang === "en") ? lang : "uz";
  const text = content[currentLang];

  return (
    <div className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 sm:px-6">
      
      {/* ── 1. The Physical Canvas Background ── */}
      <div 
        className="absolute inset-0 pointer-events-none -z-20 opacity-20 dark:opacity-40 mix-blend-multiply dark:mix-blend-screen" 
        style={{ backgroundImage: `url(${parchmentTexture})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      />
      
      {/* ── 2. Cinematic Lighting (Lost in the dark) ── */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/90/10 dark:bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute inset-0 pointer-events-none -z-10 bg-[radial-gradient(circle_at_center,transparent_0%,var(--background)_80%)]" />

      {/* ── Giant Background Watermark ── */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center text-[250px] md:text-[350px] font-serif font-black text-foreground/[0.03] dark:text-foreground/[0.02] select-none pointer-events-none -z-10 leading-none">
        404
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center relative z-10 max-w-2xl mx-auto flex flex-col items-center"
      >
        {/* Floating Compass Icon */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="mb-8 p-6 rounded-full bg-primary/10 border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.15)]"
        >
          <Compass className="w-12 h-12 text-accent" strokeWidth={1.5} />
        </motion.div>

        {/* Badge */}
        <div className="inline-flex items-center gap-4 mb-6">
          <span className="w-12 h-[1px] bg-primary/50"></span>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary dark:text-accent">
            {text.badge}
          </p>
          <span className="w-12 h-[1px] bg-primary/50"></span>
        </div>

        {/* Main Title */}
        <h1 className="text-5xl md:text-7xl font-heading font-black tracking-tight font-bold text-foreground mb-6 tracking-tight drop-shadow-md">
          {text.title}
        </h1>

        {/* Description */}
        <p className="mb-12 text-base md:text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto">
          {text.desc}
        </p>

        {/* Premium Back Button */}
        <Link 
          to="/" 
          className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-xl border border-amber-700/50 bg-gradient-to-r from-[#1a1510] to-[#0a0806] text-accent font-bold uppercase tracking-widest text-xs md:text-sm hover:bg-amber-900/30 hover:border-amber-400 hover:text-accent transition-all duration-300 shadow-[0_0_20px_rgba(217,119,6,0.15)] hover:shadow-[0_0_30px_rgba(217,119,6,0.3)] overflow-hidden"
        >
          <span className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <Home className="relative z-10 w-4 h-4" />
          <span className="relative z-10">{text.btn}</span>
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFound;