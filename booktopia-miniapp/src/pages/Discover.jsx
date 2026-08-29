import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useLang } from '../context/LangContext';
import { formatPrice, haptic } from '../lib/utils';
import PageTransition from '../components/PageTransition';

const T = {
  title:     { uz: 'Kashfiyot',           ru: 'Открытия',        en: 'Discover' },
  subtitle:  { uz: 'Maqsadingiz nima?',   ru: 'Какова ваша цель?', en: 'What\'s your goal?' },
  weekBadge: { uz: 'HAFTA TANLOVI',       ru: 'КНИГА НЕДЕЛИ',    en: 'BOOK OF THE WEEK' },
  paths:     { uz: 'O\'qish yo\'llari',   ru: 'Пути чтения',     en: 'Reading Paths' },
  read:      { uz: 'ta o\'qildi',         ru: 'прочитано',       en: 'read' },
  of:        { uz: 'dan',                 ru: 'из',              en: 'of' },
  explore:   { uz: 'Ko\'proq →',          ru: 'Подробнее →',     en: 'Explore →' },
};

// ── 4 Reading Paths — hardcoded to actual book IDs ────────────────────────────
const PATHS = [
  {
    id: 'temur',
    emoji: '🏰',
    color: '#D5AD36',
    colorLight: '#FBF6E3',
    title:  { uz: 'Temur imperiyasi',       ru: 'Империя Тамерлана',     en: 'Tamerlane\'s Empire' },
    goal:   { uz: 'Uchta roman — bir buyuk tarix', ru: '3 романа — одна великая история', en: '3 novels — one epic story' },
    bookIds: [
      'b0231bf0-8315-48d0-bd84-7bb7986a83ea', // Amir Temur
      '6c1d5416-fc75-41b1-9572-893bcdb5b815', // Safar gulxanlari
      '284d69cf-53fc-4568-839b-fe61fb9e415e', // Yildirim Boyazid
    ],
  },
  {
    id: 'uzbek',
    emoji: '🇺🇿',
    color: '#265999',
    colorLight: '#E8F4FD',
    title:  { uz: 'O\'zbek qalbi',          ru: 'Узбекская душа',         en: 'Uzbek Soul' },
    goal:   { uz: 'Hayot, tarix va tafakkur', ru: 'Жизнь, история, мышление', en: 'Life, history and thought' },
    bookIds: [
      '4aff3b2d-2751-4c9c-9fff-119564e76d1e', // Bygone days (O'tkan kunlar)
      'a3a96a05-c21f-4d13-80b0-6fb9eb3270d1', // O'zbekistonda yana bir kun
      'f12ce0f0-fca6-454b-9f84-266b37091012', // Erkin millat poydevori (uz)
    ],
  },
  {
    id: 'world',
    emoji: '🌍',
    color: '#805AD5',
    colorLight: '#F5F0FF',
    title:  { uz: 'Dunyo sargardonligi',    ru: 'Путешествие по мирам',  en: 'World Odyssey' },
    goal:   { uz: '6 mamlakat, 6 davr, 1 sayohat', ru: '6 стран, 6 эпох, 1 путешествие', en: '6 countries, 6 eras, 1 journey' },
    bookIds: [
      'e2c81926-7157-42a7-aa9b-b4114d912799', // Usta va Margarita
      '880bdff5-3f0f-4e33-af14-412305d10257', // Martin Iden
      '57beb805-581b-45df-bfc7-d9c8e4c7548d', // Askanio
      'fea19796-1ac0-4ac7-837b-322aef7808ee', // Mayoq sari
      '300cb4c0-cbc0-42ba-9882-ef6ddad5e4d2', // Ijarachi
      'f115b83b-94ed-487a-b216-d7256466c0ea', // Mushuklar dunyodan g'oyib bo'lsa
    ],
  },
  {
    id: 'mind',
    emoji: '🧠',
    color: '#38A169',
    colorLight: '#EBF8F0',
    title:  { uz: 'Inson kodi',             ru: 'Код человека',           en: 'Human Code' },
    goal:   { uz: 'O\'zingni o\'rgan — o\'zgalarni tushun', ru: 'Познай себя — пойми других', en: 'Know yourself — understand others' },
    bookIds: [
      'cc528e91-8aee-4021-826c-01bd5c12b072', // Tana tili haqida mukammal kitob
      '9f04d148-bb2a-42c4-abb0-790835ce70b9', // Ultrabilim
    ],
  },
];

function getPurchasedIds() {
  try {
    const orders = JSON.parse(localStorage.getItem('booktopia_orders') ?? '[]');
    const ids = new Set();
    orders.forEach(o => (o.items ?? []).forEach(i => ids.add(i.book_id ?? i.id)));
    return ids;
  } catch { return new Set(); }
}

// Get current ISO week number for the "HAFTA TANLOVI" badge
function getWeekNumber() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
}

export default function Discover() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const [weekBook, setWeekBook]   = useState(null);
  const [pathBooks, setPathBooks] = useState({});
  const [loading, setLoading]     = useState(true);
  const purchased = getPurchasedIds();
  const t = (k) => T[k]?.[lang] ?? T[k]?.uz ?? k;

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      // Book of the week: featured, ordered by created_at desc
      const { data: fw } = await supabase
        .from('books').select('*')
        .eq('featured', true)
        .order('created_at', { ascending: false });
      
      const visibleFw = (fw || []).filter(b => b.shop_visible !== false);
      if (visibleFw[0]) setWeekBook(visibleFw[0]);

      // For each path fetch by specific IDs
      const allIds = PATHS.flatMap(p => p.bookIds);
      const { data: allBooks } = await supabase
        .from('books').select('*')
        .in('id', allIds);

      if (allBooks) {
        const visibleBooks = allBooks.filter(b => b.shop_visible !== false);
        const byId = Object.fromEntries(visibleBooks.map(b => [b.id, b]));
        const results = {};
        PATHS.forEach(path => {
          results[path.id] = path.bookIds.map(id => byId[id]).filter(Boolean);
        });
        setPathBooks(results);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <PageTransition>
      <div className="page" style={{ paddingBottom: 90 }}>

        {/* Header */}
        <div style={{ padding: '20px 16px 4px' }}>
          <h1 style={{ fontSize: 26, fontWeight: 900 }}>{t('title')}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>{t('subtitle')}</p>
        </div>

        {/* ── Hafta Tanlovi Card ───────────────────────────────────────────── */}
        <section style={{ padding: '16px 16px 20px' }}>
          {loading ? (
            <div className="skeleton" style={{ height: 190, borderRadius: 20 }} />
          ) : weekBook ? (
            <WeekCard book={weekBook} lang={lang} t={t} onNavigate={navigate} />
          ) : null}
        </section>

        <div className="divider" />

        {/* ── Reading Paths ─────────────────────────────────────────────────── */}
        <section style={{ padding: '16px 0 0' }}>
          <div style={{ padding: '0 16px 16px' }}>
            <p className="section-title" style={{ marginBottom: 2 }}>{t('paths')}</p>
          </div>
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />
                ))
              : PATHS.map((path, i) => (
                  <PathCard
                    key={path.id}
                    path={path}
                    books={pathBooks[path.id] ?? []}
                    purchased={purchased}
                    lang={lang}
                    t={t}
                    onNavigate={navigate}
                    index={i}
                  />
                ))
            }
          </div>
        </section>
      </div>
    </PageTransition>
  );
}

// ── Hafta Tanlovi Card — dark, premium, inspired by website's EpicSpotlight ───
function WeekCard({ book, lang, t, onNavigate }) {
  const title  = book[`title_${lang}`] || book.title  || '—';
  const author = book[`author_${lang}`] || book.author || '—';
  const week   = getWeekNumber();

  return (
    <motion.div
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      onClick={() => { haptic('light'); onNavigate(`/book/${book.id}`); }}
      style={{
        position: 'relative',
        background: 'linear-gradient(135deg, #0A192F 0%, #132D55 60%, #1A3D6B 100%)',
        borderRadius: 20,
        padding: '20px 20px 20px',
        display: 'flex',
        gap: 18,
        alignItems: 'center',
        cursor: 'pointer',
        overflow: 'hidden',
        minHeight: 190,
      }}
    >
      {/* Dot-grid texture overlay (matching website aesthetic) */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(rgba(0,205,254,0.12) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        zIndex: 0,
      }} />

      {/* Gold glow orb */}
      <div style={{
        position: 'absolute', top: -40, right: -40,
        width: 180, height: 180, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(213,173,54,0.18) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Book cover */}
      <div style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
        {book.cover_url ? (
          <img src={book.cover_url} alt={title} style={{
            width: 76, height: 108,
            objectFit: 'cover',
            borderRadius: '3px 9px 9px 3px',
            boxShadow: '-6px 6px 20px rgba(0,0,0,0.7)',
          }} />
        ) : (
          <div style={{
            width: 76, height: 108, borderRadius: 9,
            background: 'rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30,
          }}>📚</div>
        )}
        {/* Spine highlight */}
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0, width: 8,
          borderRadius: '3px 0 0 3px',
          background: 'linear-gradient(to right, rgba(255,255,255,0.35), transparent)',
          pointerEvents: 'none',
        }} />
      </div>

      {/* Info */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
        {/* Pulsing badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <div style={{ position: 'relative', width: 8, height: 8 }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: '#D5AD36', borderRadius: '50%',
              animation: 'pulse 2s infinite',
            }} />
            <div style={{
              position: 'absolute', inset: '-4px',
              background: 'rgba(213,173,54,0.25)', borderRadius: '50%',
              animation: 'ping 2s infinite',
            }} />
          </div>
          <span style={{
            fontSize: 9, fontWeight: 900, letterSpacing: '0.14em',
            color: '#D5AD36', textTransform: 'uppercase',
          }}>
            {t('weekBadge')} · {week}-HAFTA
          </span>
        </div>

        <p style={{ fontSize: 17, fontWeight: 900, color: '#fff', lineHeight: 1.25, marginBottom: 5 }}>
          {title}
        </p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{author}</p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
          {book.price && (
            <span style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: 15, fontWeight: 700, color: '#00CDFE',
            }}>
              {formatPrice(book.price)}
            </span>
          )}
          <span style={{
            fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.6)',
            marginLeft: 'auto',
          }}>
            {t('explore')}
          </span>
        </div>
      </div>

      <style>{`
        @keyframes ping {
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </motion.div>
  );
}

// ── Path Card with expand/collapse and progress ───────────────────────────────
function PathCard({ path, books, purchased, lang, t, onNavigate, index }) {
  const [open, setOpen] = useState(false);
  const title    = path.title[lang] ?? path.title.uz;
  const goal     = path.goal[lang]  ?? path.goal.uz;
  const readCount = books.filter(b => purchased.has(b.id)).length;
  const total     = books.length;
  const pct       = total > 0 ? (readCount / total) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28, delay: index * 0.07 }}
      style={{
        background: 'var(--surface)',
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
        border: `2px solid ${open ? path.color : 'transparent'}`,
        transition: 'border-color 0.2s',
      }}
    >
      {/* Header */}
      <motion.div
        whileTap={{ scale: 0.985 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onClick={() => { haptic('light'); setOpen(o => !o); }}
        style={{ padding: '15px 15px 14px', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 14, flexShrink: 0,
            background: path.colorLight,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>
            {path.emoji}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.2 }}>{title}</p>
            <p style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2, lineHeight: 1.3 }}>{goal}</p>
          </div>

          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{ flexShrink: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </motion.div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700 }}>
              {readCount}/{total} {t('read')}
            </span>
            {readCount === total && total > 0 && (
              <span style={{ fontSize: 11, fontWeight: 800, color: path.color }}>✅ Tugatildi</span>
            )}
          </div>
          <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ type: 'spring', stiffness: 160, damping: 28, delay: 0.3 }}
              style={{ height: '100%', background: path.color, borderRadius: 4 }}
            />
          </div>
        </div>
      </motion.div>

      {/* Book list (expanded) */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="list"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            style={{ borderTop: `1px solid var(--surface-2)`, overflow: 'hidden' }}
          >
            {books.map((book, idx) => {
              const btitle  = book[`title_${lang}`] || book.title  || '—';
              const bauthor = book[`author_${lang}`] || book.author || '—';
              const done    = purchased.has(book.id);
              const isOutOfStock = book.stock === 0 || (book.stock != null && book.stock <= 0);
              return (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.06, type: 'spring', stiffness: 400, damping: 30 }}
                  onClick={() => { haptic('light'); onNavigate(`/book/${book.id}`); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 15px',
                    borderBottom: idx < books.length - 1 ? '1px solid var(--surface-2)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  {/* Step circle */}
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    background: done ? path.color : isOutOfStock ? 'var(--discount)' : 'var(--surface-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800,
                    color: (done || isOutOfStock) ? '#fff' : 'var(--text-3)',
                    transition: 'background 0.2s',
                  }}>
                    {done ? '✓' : isOutOfStock ? '✕' : idx + 1}
                  </div>

                  {/* Cover thumb */}
                  {book.cover_url ? (
                    <img src={book.cover_url} alt={btitle} style={{
                      width: 48, height: 68, objectFit: 'cover',
                      borderRadius: '2px 7px 7px 2px', flexShrink: 0,
                      boxShadow: '-3px 3px 10px rgba(0,0,0,0.2)',
                      opacity: (done || isOutOfStock) ? 0.5 : 1, transition: 'opacity 0.2s',
                      filter: isOutOfStock ? 'grayscale(0.5)' : undefined,
                    }} />
                  ) : (
                    <div style={{
                      width: 48, height: 68, borderRadius: 7, flexShrink: 0,
                      background: path.colorLight,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                    }}>📚</div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 13, fontWeight: 700, lineHeight: 1.25,
                      color: (done || isOutOfStock) ? 'var(--text-3)' : 'var(--text-1)',
                      textDecoration: done ? 'line-through' : 'none',
                    }}>{btitle}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginTop: 2 }}>{bauthor}</p>
                  </div>

                  {!done && isOutOfStock ? (
                    <span style={{
                      fontSize: 11, fontWeight: 800,
                      color: 'var(--discount)', flexShrink: 0,
                      background: '#FEF2F2', padding: '3px 8px', borderRadius: 6,
                    }}>
                      Tugagan
                    </span>
                  ) : !done && book.price ? (
                    <span style={{
                      fontSize: 12, fontWeight: 800,
                      color: path.color, flexShrink: 0,
                    }}>
                      {formatPrice(book.price)}
                    </span>
                  ) : null}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
