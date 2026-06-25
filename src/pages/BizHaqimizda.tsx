// @refresh reset
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import {
  FileText, ExternalLink, Users, ArrowRight,
  MapPin, Globe, ShieldCheck, Star,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BookCover from "@/components/BookCover";
import SpotlightCard from "@/components/SpotlightCard";
import { useData } from "@/context/DataContext";
import { useLang, locField, type Lang } from "@/context/LanguageContext";
import { getBookSlug } from "@/lib/slugify";
import { imgUrl } from "@/lib/imageUrl";

// ── Page-level translations (all static text, 3 languages) ───────────────────
const CONTENT = {
  uz: {
    heroLabel: "Nashriyot · Toshkent · Tash. 2024",
    heroTitle: ["O'zbekiston kitob", "nashriyoti."],
    heroDesc:
      "Booktopia — dunyo tafakkurining eng muhim asarlarini o‘zbek tilida taqdim etish orqali bilim va mutolaa madaniyatini rivojlantirishni o‘z oldiga maqsad qilgan nashriyotdir.",
    heroTagline:
      "Publishing world literature in Uzbek with licensed rights & expert translation.",
    credLabel: "Rasmiy ma'lumotlar",
    credRows: [
      { label: "Nomi",   value: '"BOOKTOPIA" MChJ' },
      { label: "Shakl",  value: "Mas'uliyati Cheklangan Jamiyat" },
      { label: "STIR",   value: "308048939" },
      { label: "Manzil", value: "Toshkent, Uchtepa tumani" },
    ],
    facts: [
      { value: "2024", main: "Tashkil etilgan", sub: "Founded" },
      { value: "20+",  main: "Nashr etilgan",   sub: "Titles" },
      { value: "3",    main: "Til",             sub: "Languages" },
      { value: "100%", main: "Litsenziyali",    sub: "Licensed" },
    ],
    whoLabel: "Kim biz?",
    whoTitle: ["O'zbekistonda yangi kitob madaniyatini", "quramiz."],
    whoP1:
      "Booktopia — jahon adabiyotining eng sara asarlarini o'zbek o'quvchisiga yetkazish maqsadida 2024-yilda tashkil etilgan nashriyot. Har bir kitob tanlov, huquqlar, professional tarjima va premium bosma bosqichlaridan o'tadi.",
    whoP2:
      "We acquire international publishing rights directly from rights-holders worldwide and produce premium Uzbek-language editions — bringing world literature to Uzbekistan's growing reading community.",
    address: "Toshkent shahri, Uchtepa tumani, G9 mavzesi, Kichik xalqa yo'li, 20-uy",
    pillars: [
      {
        title: "Rasmiy litsenziya",
        desc: "O'zbekiston Respublikasi Prezidenti Administratsiyasi huzuridagi Axborot va ommaviy kommunikatsiyalar agentligi tomonidan berilgan rasmiy noshirlik faoliyati tasdiqnomasiga ega.",
      },
      {
        title: "Xalqaro huquqlar",
        desc: "Dunyo nashriyotlari bilan to'g'ridan-to'g'ri shartnoma asosida tarjima huquqlari xarid qilinadi.",
      },
      {
        title: "Professional tarjima",
        desc: "Har bir asar o'z sohasining mutaxassis tarjimoni tomonidan o'zbek tiliga o'giriladi.",
      },
      {
        title: "Sifat kafolati",
        desc: "2024-yildan beri o'zbek kitob bozoriga yuqori sifatli nashrlar yetkazib kelinmoqda.",
      },
    ],
    docsLabel: "Hujjatlar",
    docsTitle: "Rasmiy hujjatlar",
    docLicense: {
      tag: "Rasmiy hujjat",
      title: "Noshirlik faoliyatini boshlaganlik haqida xabarnoma",
      desc: "O'zbekiston Respublikasi Prezidenti Administratsiyasi huzuridagi Axborot va ommaviy kommunikatsiyalar agentligi tomonidan berilgan. Raqami: № 497205.",
      cta: "PDF ko'rish",
    },
    docReg: {
      tag: "Tasdiqnoma",
      title: "Noshirlik faoliyati tasdiqnomasi",
      desc: "Tasdiqnoma reestri bo'yicha tartib raqami: X-25434. Taqdim etilgan sana: 22.11.2024.",
    },
    docStir: {
      tag: "Soliq ma'lumotlari",
      title: "Soliq to'lovchining identifikatsiya raqami",
      desc: "O'zbekiston Respublikasi davlat soliq xizmatiga ro'yxatdan o'tgan yuridik shaxs. STIR: 308048939.",
    },
    booksLabel: "Katalog",
    booksTitle: "Nashr etilgan asarlar",
    booksLink: "Barcha kitoblarni ko'rish",
    booksCta: "Ko'rish →",
    teamLabel: "Jamoamiz",
    teamTitle: "Kitoblar ortida odamlar turibdi.",
    teamDesc:
      "Muharrirlar, tarjimonlar, muqova dizaynerlari va sahifalovchilar — har bir asar bir butun jamoaning mehnati.",
    teamCta: "Jamoani ko'rish",
    partnerTag: "Rights & Partnerships",
    partnerTitle: "Xalqaro hamkorlik uchun",
    partnerDesc:
      "We are open to rights discussions, co-publication, and translation partnerships with international publishers and literary agencies.",
    emailCta: "Email us",
    partnersLink: "Hamkorlar",
  },
  ru: {
    heroLabel: "Издательство · Ташкент · Осн. 2024",
    heroTitle: ["Узбекское книжное", "издательство."],
    heroDesc:
      "Booktopia — современное издательство, профессионально переводящее лучшие произведения мировой литературы на узбекский язык и выпускающее высококачественные книги.",
    heroTagline:
      "Publishing world literature in Uzbek with licensed rights & expert translation.",
    credLabel: "Официальные данные",
    credRows: [
      { label: "Название", value: '"BOOKTOPIA" ООО' },
      { label: "Форма",    value: "Общество с ограниченной ответственностью" },
      { label: "ИНН",      value: "308048939" },
      { label: "Адрес",    value: "Ташкент, р-н Учтепа" },
    ],
    facts: [
      { value: "2024", main: "Основано",      sub: "Founded" },
      { value: "20+",  main: "Изданий",       sub: "Titles" },
      { value: "3",    main: "Языка",         sub: "Languages" },
      { value: "100%", main: "Лицензировано", sub: "Licensed" },
    ],
    whoLabel: "Кто мы?",
    whoTitle: ["Мы строим новую культуру", "чтения в Узбекистане."],
    whoP1:
      "Booktopia — издательство, основанное в 2024 году с целью донести лучшие произведения мировой литературы до узбекского читателя. Каждая книга проходит этапы отбора, приобретения прав, профессионального перевода и высококачественной печати.",
    whoP2:
      "We acquire international publishing rights directly from rights-holders worldwide and produce premium Uzbek-language editions — bringing world literature to Uzbekistan's growing reading community.",
    address: "г. Ташкент, р-н Учтепа, массив G9, Кичик халка йўли, 20",
    pillars: [
      {
        title: "Официальная лицензия",
        desc: "Имеет официальное уведомление о начале издательской деятельности, выданное Агентством по информации и массовым коммуникациям при Президенте РУз.",
      },
      {
        title: "Международные права",
        desc: "Права на перевод приобретаются напрямую у правообладателей и литературных агентств по всему миру.",
      },
      {
        title: "Профессиональный перевод",
        desc: "Каждое произведение переводится на узбекский язык специалистом в своей области.",
      },
      {
        title: "Гарантия качества",
        desc: "С 2024 года на узбекский книжный рынок поставляются высококачественные издания.",
      },
    ],
    docsLabel: "Документы",
    docsTitle: "Официальные документы",
    docLicense: {
      tag: "Официальный документ",
      title: "Уведомление о начале издательской деятельности",
      desc: "Выдано Агентством по информации и массовым коммуникациям при Администрации Президента Республики Узбекистан. Номер: № 497205.",
      cta: "Открыть PDF",
    },
    docReg: {
      tag: "Подтверждение",
      title: "Подтверждение издательской деятельности",
      desc: "Регистрационный номер в реестре: X-25434. Дата выдачи: 22.11.2024.",
    },
    docStir: {
      tag: "Налоговые данные",
      title: "Идентификационный номер налогоплательщика",
      desc: "Юридическое лицо, зарегистрированное в государственной налоговой службе Республики Узбекистан. ИНН: 308048939.",
    },
    booksLabel: "Каталог",
    booksTitle: "Изданные произведения",
    booksLink: "Смотреть все книги",
    booksCta: "Открыть →",
    teamLabel: "Наша команда",
    teamTitle: "За книгами стоят люди.",
    teamDesc:
      "Редакторы, переводчики, дизайнеры обложек и верстальщики — каждая книга — это труд целой команды.",
    teamCta: "Познакомиться с командой",
    partnerTag: "Rights & Partnerships",
    partnerTitle: "Для международного сотрудничества",
    partnerDesc:
      "We are open to rights discussions, co-publication, and translation partnerships with international publishers and literary agencies.",
    emailCta: "Email us",
    partnersLink: "Партнёры",
  },
  en: {
    heroLabel: "Publisher · Tashkent · Est. 2024",
    heroTitle: ["Uzbekistan's book", "publisher."],
    heroDesc:
      "Booktopia is a modern publishing house producing premium Uzbek-language editions of the world's finest literature through professional translation.",
    heroTagline:
      "Publishing world literature in Uzbek with licensed rights & expert translation.",
    credLabel: "Official Details",
    credRows: [
      { label: "Name",     value: '"BOOKTOPIA" LLC' },
      { label: "Type",     value: "Limited Liability Company" },
      { label: "TIN",      value: "308048939" },
      { label: "Location", value: "Tashkent, Uchtepa district" },
    ],
    facts: [
      { value: "2024", main: "Founded",   sub: "Asos solingan" },
      { value: "20+",  main: "Titles",    sub: "Nashrlar" },
      { value: "3",    main: "Languages", sub: "Tillar" },
      { value: "100%", main: "Licensed",  sub: "Litsenziyali" },
    ],
    whoLabel: "Who we are",
    whoTitle: ["Building a new reading culture", "in Uzbekistan."],
    whoP1:
      "Booktopia is a publishing house founded in 2024 with the mission to bring the finest works of world literature to Uzbek readers. Every book goes through careful selection, rights acquisition, expert translation, and premium production.",
    whoP2:
      "We acquire international publishing rights directly from rights-holders worldwide and produce premium Uzbek-language editions — bringing world literature to Uzbekistan's growing reading community.",
    address: "Tashkent city, Uchtepa district, G9 massiv, Kichik xalqa yo'li, 20",
    pillars: [
      {
        title: "Officially Licensed",
        desc: "Holds an official publishing activity notification issued by the Information and Mass Communications Agency under the President of the Republic of Uzbekistan.",
      },
      {
        title: "International Rights",
        desc: "Translation rights are acquired directly from rights-holders and literary agencies worldwide.",
      },
      {
        title: "Expert Translation",
        desc: "Every work is translated into Uzbek by a subject-matter expert and professional translator.",
      },
      {
        title: "Quality Guarantee",
        desc: "Since 2024, delivering high-quality premium editions to the Uzbek book market.",
      },
    ],
    docsLabel: "Documents",
    docsTitle: "Official Documents",
    docLicense: {
      tag: "Official Document",
      title: "Notification of Publishing Activity",
      desc: "Issued by the Information and Mass Communications Agency under the Administration of the President of the Republic of Uzbekistan. No. 497205.",
      cta: "View PDF",
    },
    docReg: {
      tag: "Confirmation",
      title: "Publishing Activity Confirmation",
      desc: "Registry serial number: X-25434. Issued: 22.11.2024.",
    },
    docStir: {
      tag: "Tax Information",
      title: "Taxpayer Identification Number",
      desc: "Legal entity registered with the State Tax Service of the Republic of Uzbekistan. TIN: 308048939.",
    },
    booksLabel: "Catalog",
    booksTitle: "Published Works",
    booksLink: "Browse all books",
    booksCta: "View →",
    teamLabel: "Our Team",
    teamTitle: "Behind the books are people.",
    teamDesc:
      "Editors, translators, cover designers, and layout artists — every book is the work of an entire dedicated team.",
    teamCta: "Meet the team",
    partnerTag: "Rights & Partnerships",
    partnerTitle: "For international partnerships",
    partnerDesc:
      "We are open to rights discussions, co-publication, and translation partnerships with international publishers and literary agencies.",
    emailCta: "Email us",
    partnersLink: "Partners",
  },
} as const;

// ── Pillar icons (order matches pillars array) ────────────────────────────────
const PILLAR_ICONS = [
  <ShieldCheck className="w-5 h-5" />,
  <Globe className="w-5 h-5" />,
  <FileText className="w-5 h-5" />,
  <Star className="w-5 h-5" />,
];

// ── Shared animation wrapper ──────────────────────────────────────────────────
const Reveal = ({
  children, delay = 0, className = "", from = "bottom",
}: {
  children: React.ReactNode; delay?: number; className?: string;
  from?: "bottom" | "left" | "right";
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const initial =
    from === "left" ? { opacity: 0, x: -28 } :
    from === "right" ? { opacity: 0, x: 28 } :
    { opacity: 0, y: 22 };
  return (
    <motion.div ref={ref} className={className}
      initial={initial}
      animate={inView ? { opacity: 1, x: 0, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
};

const Divider = () => (
  <div className="flex items-center gap-4 my-4" aria-hidden>
    <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gold/30" />
    <div className="w-2 h-2 rotate-45 shrink-0 bg-gold shadow-[0_0_8px_rgba(213,173,54,0.4)]" />
    <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gold/30" />
  </div>
);

const SectionLabel = ({ label, title }: { label: string; title: string }) => (
  <div className="text-center mb-12">
    <div className="inline-flex items-center gap-3 mb-3">
      <div className="h-px w-8 bg-gold/40" />
      <span className="font-sans text-[10px] sm:text-[11px] uppercase tracking-[0.45em] text-gold font-black">{label}</span>
      <div className="h-px w-8 bg-gold/40" />
    </div>
    <h2 className="font-heading font-black tracking-tight text-foreground drop-shadow-sm"
      style={{ fontSize: "clamp(1.85rem, 3.5vw, 2.8rem)" }}>
      {title}
    </h2>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
const BizHaqimizda = () => {
  const { books } = useData();
  const { lang } = useLang();
  const T = CONTENT[lang as Lang] ?? CONTENT.uz;

  const getImgUrl = (url?: string | null): string | null => {
    return imgUrl(url);
  };

  const publishedBooks = books.slice(0, 8);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }}
      className="min-h-screen bg-[#faf9f5] dark:bg-[#080808]">

      <Navbar />

      {/* ── §1 HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          className="relative z-10 w-full"
          style={{ background: "linear-gradient(160deg, #1a1205 0%, #0f0a02 100%)" }}>

          <svg viewBox="0 0 1200 400" fill="none" aria-hidden
            className="absolute inset-0 w-full h-full pointer-events-none opacity-10">
            <circle cx="200" cy="200" r="260" stroke="#f59e0b" strokeWidth="0.6" strokeDasharray="4 12" />
            <circle cx="1000" cy="200" r="220" stroke="#f59e0b" strokeWidth="0.6" strokeDasharray="3 10" />
            <path d="M0 400 Q600 80 1200 400" stroke="#f59e0b" strokeWidth="0.8" fill="none" />
          </svg>

          <div className="relative max-w-6xl mx-auto px-5 sm:px-8 pt-28 sm:pt-36 pb-16 sm:pb-20">
            <div className="flex flex-col lg:flex-row items-start lg:items-end gap-10 lg:gap-20">

              {/* Left: headline */}
              <div className="flex-1">
                <Reveal>
                  <div className="inline-flex items-center gap-3 mb-5">
                    <div className="h-px w-8 bg-gold/50" />
                    <span className="font-sans text-[11px] uppercase tracking-[0.45em] text-gold font-black">
                      {T.heroLabel}
                    </span>
                  </div>
                </Reveal>

                <Reveal delay={0.1}>
                  <h1 className="font-heading font-black tracking-tight leading-[1.05] text-amber-50 drop-shadow-md"
                    style={{ fontSize: "clamp(2.6rem, 5.5vw, 4.2rem)" }}>
                    {T.heroTitle[0]}{" "}
                    <br className="hidden sm:block" />
                    <em className="not-italic bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
                      {T.heroTitle[1]}
                    </em>
                  </h1>
                </Reveal>

                <Reveal delay={0.18}>
                  <p className="font-serif text-lg sm:text-xl text-amber-100/70 leading-relaxed max-w-xl mt-5">
                    {T.heroDesc}
                  </p>
                </Reveal>

                <Reveal delay={0.25}>
                  <p className="font-sans text-sm text-amber-200/40 mt-3 tracking-wide">
                    {T.heroTagline}
                  </p>
                </Reveal>
              </div>

              {/* Right: credential card */}
              <Reveal from="right" delay={0.2} className="w-full lg:w-auto shrink-0">
                <div
                  className="rounded-2xl border border-amber-500/25 px-6 py-5 min-w-[260px]"
                  style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)" }}>
                  <p className="font-sans text-[9px] uppercase tracking-[0.45em] text-gold/70 font-black mb-4">
                    {T.credLabel}
                  </p>
                  {T.credRows.map(({ label, value }) => (
                    <div key={label} className="flex items-baseline justify-between gap-4 py-2
                      border-b border-white/8 last:border-0">
                      <span className="font-sans text-[11px] text-amber-200/40 font-bold uppercase tracking-wider shrink-0">
                        {label}
                      </span>
                      <span className="font-sans text-[12px] text-amber-50/80 font-medium text-right">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </Reveal>

            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="relative z-20 max-w-5xl mx-auto px-5 sm:px-8 -mt-6">
          <Reveal>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl overflow-hidden shadow-2xl border border-amber-500/15"
              style={{ background: "linear-gradient(135deg, #38250f 0%, #2a1a08 100%)" }}>
              {T.facts.map(({ value, main, sub }, i) => (
                <div key={sub}
                  className="flex flex-col items-center justify-center gap-1 py-5 px-4 text-center relative"
                  style={{ borderRight: i < T.facts.length - 1 ? "1px solid rgba(245,158,11,0.12)" : undefined }}>
                  <span className="font-heading font-black text-3xl sm:text-4xl text-gold leading-none">
                    {value}
                  </span>
                  <span className="font-sans text-[9px] uppercase tracking-[0.3em] text-amber-200/50 font-black">
                    {main}
                  </span>
                  <span className="font-sans text-[9px] uppercase tracking-[0.2em] text-amber-500/30 font-bold">
                    {sub}
                  </span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── §2 WHO WE ARE ───────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 pt-20 pb-12">

        {/* Editorial spread: text left — brand image right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center mb-12">

          {/* Left: text */}
          <div>
            <Reveal>
              <div className="inline-flex items-center gap-3 mb-5">
                <div className="h-px w-8 bg-gold/40" />
                <span className="font-sans text-[11px] uppercase tracking-[0.4em] text-gold font-black">
                  {T.whoLabel}
                </span>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="font-heading font-black tracking-tight text-foreground mb-6 leading-[1.1]"
                style={{ fontSize: "clamp(1.9rem, 3.2vw, 2.8rem)" }}>
                {T.whoTitle[0]}{" "}
                <span className="bg-gradient-to-r from-amber-500 to-amber-700 bg-clip-text text-transparent">
                  {T.whoTitle[1]}
                </span>
              </h2>
            </Reveal>
            <Reveal delay={0.14}>
              <p className="font-serif text-lg text-foreground/75 leading-relaxed mb-5">
                {T.whoP1}
              </p>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="font-serif text-base text-foreground/60 leading-relaxed mb-6">
                {T.whoP2}
              </p>
            </Reveal>
            <Reveal delay={0.26}>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                <span className="font-sans text-sm text-foreground/55">
                  {T.address}
                </span>
              </div>
            </Reveal>
          </div>

          {/* Right: brand identity image — editorial spread anchor */}
          <Reveal from="right" delay={0.12} className="w-full">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl
              border border-amber-500/20
              aspect-[4/3] lg:aspect-[1/1]"
              style={{ boxShadow: "0 32px 64px -16px rgba(0,0,0,0.35), 0 0 0 1px rgba(245,158,11,0.12)" }}>
              <img
                src="/booktopia-logo_dark.jpg"
                alt="Booktopia"
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover object-center transition-transform duration-700 hover:scale-[1.03]"
              />
              {/* bottom caption strip */}
              <div className="absolute bottom-0 inset-x-0 px-5 py-4
                bg-gradient-to-t from-black/80 via-black/30 to-transparent">
                <p className="font-sans text-[9px] uppercase tracking-[0.4em] text-amber-300/70 font-black">
                  BOOKTOPIA · TOSHKENT · EST. 2024
                </p>
              </div>
            </div>
          </Reveal>

        </div>

        {/* Pillars — horizontal 4-col row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {T.pillars.map((p, i) => (
            <Reveal key={i} delay={i * 0.07}>
              <div className="rounded-2xl p-5 h-full group hover:-translate-y-1 transition-transform duration-300
                bg-white/70 dark:bg-black/40 border border-neutral-200/80 dark:border-white/10 shadow-sm">
                <div className="w-9 h-9 rounded-full flex items-center justify-center mb-4
                  bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-900/10
                  border border-amber-300 dark:border-amber-700/40 text-primary/90 dark:text-accent">
                  {PILLAR_ICONS[i]}
                </div>
                <h3 className="font-heading font-bold text-foreground text-[14px] mb-2">{p.title}</h3>
                <p className="font-sans text-[12px] text-foreground/60 leading-relaxed">{p.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

      </section>

      <div className="max-w-5xl mx-auto px-8"><Divider /></div>

      {/* ── §3 OFFICIAL DOCUMENTS ───────────────────────────────────────────── */}
      <section className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
        <Reveal><SectionLabel label={T.docsLabel} title={T.docsTitle} /></Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* Publishing activity notification — actual PDF */}
          <Reveal delay={0.05}>
            <a href="/noshirlik-litsenziya.pdf" target="_blank" rel="noopener noreferrer"
              className="group block rounded-2xl overflow-hidden border border-neutral-200/80 dark:border-white/10
                shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1
                bg-white dark:bg-black/40">

              <div className="relative h-44 flex items-center justify-center overflow-hidden"
                style={{ background: "linear-gradient(145deg, #f7f3ec 0%, #ede5d4 100%)" }}>
                <svg viewBox="0 0 120 100" fill="none" aria-hidden
                  className="absolute inset-0 w-full h-full opacity-10 pointer-events-none">
                  <circle cx="60" cy="50" r="40" stroke="#8b6a2a" strokeWidth="0.8" strokeDasharray="3 6" />
                  <circle cx="60" cy="50" r="55" stroke="#8b6a2a" strokeWidth="0.4" strokeDasharray="2 8" />
                </svg>
                <div className="relative flex flex-col items-center gap-2 z-10">
                  <div className="w-14 h-14 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center shadow-inner">
                    <ShieldCheck className="w-7 h-7 text-amber-700" />
                  </div>
                  <span className="font-sans text-[10px] uppercase tracking-[0.35em] text-amber-800 font-black">
                    TASDIQNOMA
                  </span>
                  <span className="font-serif text-xs text-amber-700/70 font-bold">№ 497205</span>
                </div>
                <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/80 flex items-center justify-center
                  opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                  <ExternalLink className="w-3.5 h-3.5 text-amber-800" />
                </div>
              </div>

              <div className="p-5">
                <p className="font-sans text-[9px] uppercase tracking-[0.3em] text-gold font-black mb-1.5">
                  {T.docLicense.tag}
                </p>
                <h3 className="font-heading font-bold text-foreground text-[15px] leading-snug mb-2">
                  {T.docLicense.title}
                </h3>
                <p className="font-sans text-[12px] text-foreground/55 leading-relaxed mb-3">
                  {T.docLicense.desc}
                </p>
                <div className="flex items-center gap-1.5 font-sans text-[11px] font-bold text-amber-700 dark:text-amber-400">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{T.docLicense.cta}</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </a>
          </Reveal>

          {/* Registry confirmation */}
          <Reveal delay={0.1}>
            <div className="group rounded-2xl overflow-hidden border border-neutral-200/80 dark:border-white/10
              shadow-sm bg-white dark:bg-black/40">

              <div className="relative h-44 flex items-center justify-center overflow-hidden"
                style={{ background: "linear-gradient(145deg, #eef2f8 0%, #dce6f5 100%)" }}>
                <svg viewBox="0 0 120 100" fill="none" aria-hidden
                  className="absolute inset-0 w-full h-full opacity-10 pointer-events-none">
                  <circle cx="60" cy="50" r="40" stroke="#1a4070" strokeWidth="0.8" strokeDasharray="3 6" />
                  <circle cx="60" cy="50" r="55" stroke="#1a4070" strokeWidth="0.4" strokeDasharray="2 8" />
                </svg>
                <div className="relative flex flex-col items-center gap-2 z-10">
                  <div className="w-14 h-14 rounded-full bg-blue-100 border-2 border-blue-300 flex items-center justify-center shadow-inner">
                    <FileText className="w-7 h-7 text-blue-700" />
                  </div>
                  <span className="font-sans text-[10px] uppercase tracking-[0.3em] text-blue-800 font-black">
                    REESTRI
                  </span>
                  <span className="font-serif text-xs text-blue-700/70 font-bold">X-25434</span>
                </div>
              </div>

              <div className="p-5">
                <p className="font-sans text-[9px] uppercase tracking-[0.3em] text-[#00A3FF] font-black mb-1.5">
                  {T.docReg.tag}
                </p>
                <h3 className="font-heading font-bold text-foreground text-[15px] leading-snug mb-2">
                  {T.docReg.title}
                </h3>
                <p className="font-sans text-[12px] text-foreground/55 leading-relaxed">
                  {T.docReg.desc}
                </p>
              </div>
            </div>
          </Reveal>

          {/* STIR / TIN card */}
          <Reveal delay={0.15}>
            <div className="rounded-2xl overflow-hidden border border-neutral-200/80 dark:border-white/10
              shadow-sm bg-white dark:bg-black/40">
              <div className="relative h-44 flex items-center justify-center overflow-hidden"
                style={{ background: "linear-gradient(145deg, #f5f0f8 0%, #e8e0f4 100%)" }}>
                <div className="relative flex flex-col items-center gap-2 z-10">
                  <div className="w-14 h-14 rounded-full bg-purple-100 border-2 border-purple-300 flex items-center justify-center shadow-inner">
                    <Globe className="w-7 h-7 text-purple-700" />
                  </div>
                  <span className="font-sans text-[10px] uppercase tracking-[0.3em] text-purple-800 font-black">
                    STIR / TIN
                  </span>
                  <span className="font-serif text-sm text-purple-700 font-black tracking-wider">308048939</span>
                </div>
              </div>
              <div className="p-5">
                <p className="font-sans text-[9px] uppercase tracking-[0.3em] text-purple-600 font-black mb-1.5">
                  {T.docStir.tag}
                </p>
                <h3 className="font-heading font-bold text-foreground text-[15px] leading-snug mb-2">
                  {T.docStir.title}
                </h3>
                <p className="font-sans text-[12px] text-foreground/55 leading-relaxed">
                  {T.docStir.desc}
                </p>
              </div>
            </div>
          </Reveal>

        </div>
      </section>

      <div className="max-w-5xl mx-auto px-8"><Divider /></div>

      {/* ── §4 PUBLISHED BOOKS ──────────────────────────────────────────────── */}
      {publishedBooks.length > 0 && (
        <section className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
          <Reveal>
            <SectionLabel label={T.booksLabel} title={T.booksTitle} />
          </Reveal>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
            {publishedBooks.map((book, i) => (
              <Reveal key={(book as any).id} delay={i * 0.06}>
                <Link to={`/book/${getBookSlug(book)}`} className="h-full block">
                  <SpotlightCard className="h-full p-3 md:p-4 group cursor-pointer">
                    <div className="flex flex-col gap-3 h-full">
                      <BookCover
                        src={(book as any).cover_url}
                        alt={locField(book as any, "title", lang)}
                        className="w-3/4 mx-auto"
                        hover={true}
                        loading="lazy"
                      />
                      <div className="flex flex-col items-center text-center mt-auto">
                        <h4 className="font-heading font-black tracking-tight text-[13px] md:text-[15px]
                          text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                          {locField(book as any, "title", lang)}
                        </h4>
                        <span className="w-8 h-[1.5px] bg-primary/30 my-2 transition-all duration-500
                          group-hover:w-14 group-hover:bg-primary" />
                        <p className="font-sans text-[10px] font-bold text-muted-foreground
                          tracking-[0.15em] uppercase truncate w-full text-center">
                          {locField(book as any, "author", lang)}
                        </p>
                      </div>
                    </div>
                  </SpotlightCard>
                </Link>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.2}>
            <div className="flex justify-center mt-10">
              <Link to="/library"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl font-heading font-bold
                  text-sm tracking-wide border-2 border-amber-500/40 text-amber-700 dark:text-amber-400
                  hover:bg-amber-500/8 transition-all duration-200">
                {T.booksLink}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </Reveal>
        </section>
      )}

      <div className="max-w-5xl mx-auto px-8"><Divider /></div>

      {/* ── §5 TEAM TEASER ──────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
        <Reveal>
          <div
            className="relative rounded-[2rem] overflow-hidden px-8 sm:px-14 md:px-16 py-12 sm:py-14
              border border-amber-500/20"
            style={{
              background: "linear-gradient(160deg, #38250f 0%, #1a1205 100%)",
              boxShadow: "0 24px 60px -12px rgba(245,158,11,0.2)",
            }}>

            <svg viewBox="0 0 800 280" fill="none" aria-hidden
              className="absolute inset-0 w-full h-full pointer-events-none opacity-15">
              <circle cx="700" cy="140" r="160" stroke="#f59e0b" strokeWidth="0.7" strokeDasharray="4 10" />
              <circle cx="100" cy="140" r="120" stroke="#f59e0b" strokeWidth="0.4" strokeDasharray="2 8" />
              <path d="M0 280 Q400 40 800 280" stroke="#f59e0b" strokeWidth="0.8" fill="none" />
            </svg>

            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center
              justify-between gap-8">
              <div>
                <div className="inline-flex items-center gap-3 mb-4">
                  <Users className="w-4 h-4 text-gold/70" />
                  <span className="font-sans text-[11px] uppercase tracking-[0.4em] text-gold/70 font-black">
                    {T.teamLabel}
                  </span>
                </div>
                <h2 className="font-heading font-black tracking-tight text-amber-50 leading-tight mb-3"
                  style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>
                  {T.teamTitle}
                </h2>
                <p className="font-serif text-amber-100/60 max-w-lg leading-relaxed">
                  {T.teamDesc}
                </p>
              </div>
              <Link to="/team"
                className="shrink-0 inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl font-heading
                  font-bold text-sm tracking-wide bg-gold text-[#1a1205] hover:bg-amber-400
                  transition-colors duration-200 shadow-lg">
                {T.teamCta}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── §6 INTERNATIONAL CTA ────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 pb-20 sm:pb-28">
        <Reveal>
          <div className="rounded-2xl border border-neutral-200/80 dark:border-white/10
            bg-white/70 dark:bg-black/40 backdrop-blur-xl shadow-sm px-8 sm:px-12 py-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 justify-between">
              <div>
                <p className="font-sans text-[9px] uppercase tracking-[0.4em] text-gold font-black mb-2">
                  {T.partnerTag}
                </p>
                <h3 className="font-heading font-black text-foreground text-xl sm:text-2xl mb-2">
                  {T.partnerTitle}
                </h3>
                <p className="font-sans text-sm text-foreground/60 leading-relaxed max-w-md">
                  {T.partnerDesc}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <a href="mailto:booktopiatashkent@gmail.com"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl
                    font-heading font-bold text-sm tracking-wide bg-foreground text-background
                    hover:opacity-90 transition-opacity shadow-md">
                  {T.emailCta}
                  <ArrowRight className="w-4 h-4" />
                </a>
                <Link to="/hamkorlar"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl
                    font-heading font-bold text-sm tracking-wide border-2 border-amber-500/40
                    text-amber-700 dark:text-amber-400 hover:bg-amber-500/8 transition-colors">
                  {T.partnersLink}
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <Footer />
    </motion.div>
  );
};

export default BizHaqimizda;
