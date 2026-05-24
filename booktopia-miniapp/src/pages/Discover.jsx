import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useLang } from '../context/LangContext';
import { formatPrice, haptic } from '../lib/utils';
import PageTransition from '../components/PageTransition';

// ── Translations ───────────────────────────────────────────────────────────────
const T = {
  title:        { uz: 'Kashfiyot',             ru: 'Открытия',           en: 'Discover' },
  bookOfWeek:   { uz: '🔥 Haftaning kitob',   ru: '🔥 Книга недели',    en: '🔥 Book of the Week' },
  paths:        { uz: '🗺️ O\'qish yo\'llari',  ru: '🗺️ Пути чтения',    en: '🗺️ Reading Paths' },
  pathsDesc:    { uz: 'Maqsadingizni tanlang va biz kitoblarni tanlaymiz', ru: 'Выберите цель — мы подберём книги', en: 'Pick a goal, we\'ll pick the books' },
  buy:          { uz: 'Sotib olish',            ru: 'Купить',             en: 'Buy now' },
  books:        { uz: 'ta kitob',               ru: 'книг',               en: 'books' },
  start:        { uz: 'Boshlash',               ru: 'Начать',             en: 'Start' },
  continue:     { uz: 'Davom etish',            ru: 'Продолжить',         en: 'Continue' },
  done:         { uz: '✅ Tugatildi',           ru: '✅ Завершено',       en: '✅ Completed' },
  progress:     { uz: 'ta o\'qildi',            ru: 'прочитано',          en: 'read' },
};

// ── Reading Path definitions (hardcoded, books fetched by category) ───────────
const PATHS = [
  {
    id: 'leadership',
    emoji: '🚀',
    color: '#265999',
    colorLight: '#E8F4FD',
    title: { uz: 'Liderlik yo\'li', ru: 'Путь лидера', en: 'Leadership Path' },
    goal:  { uz: '6 oyda yetakchi bo\'ling', ru: 'Станьте лидером за 6 месяцев', en: 'Become a leader in 6 months' },
    category: 'erkin-millat',
    maxBooks: 5,
  },
  {
    id: 'history',
    emoji: '🏛️',
    color: '#D5AD36',
    colorLight: '#FBF6E3',
    title: { uz: 'Tarix va Madaniyat', ru: 'История и культура', en: 'History & Culture' },
    goal:  { uz: 'O\'zbek tarixini chuqur o\'rganing', ru: 'Изучите историю Узбекистана', en: 'Master Uzbek history' },
    category: 'amir-temur',
    maxBooks: 5,
  },
  {
    id: 'science',
    emoji: '🔬',
    color: '#38A169',
    colorLight: '#EBF8F0',
    title: { uz: 'Ilm va Kashfiyot', ru: 'Наука и открытия', en: 'Science & Discovery' },
    goal:  { uz: 'Ilmiy fikrlashni rivojlantiring', ru: 'Развивайте научное мышление', en: 'Develop scientific thinking' },
    category: 'ilmiy',
    maxBooks: 4,
  },
  {
    id: 'classics',
    emoji: '🌍',
    color: '#805AD5',
    colorLight: '#F5F0FF',
    title: { uz: 'Jahon Klassikasi', ru: 'Мировая классика', en: 'World Classics' },
    goal:  { uz: 'Dunyo adabiyotini kashf eting', ru: 'Откройте мировую литературу', en: 'Explore world literature' },
    category: 'jahon',
    maxBooks: 6,
  },
];

// ── Load purchased book IDs from localStorage orders ──────────────────────────
function getPurchasedIds() {
  try {
    const orders = JSON.parse(localStorage.getItem('booktopia_orders') ?? '[]');
    const ids = new Set();
    orders.forEach(o => (o.items ?? []).forEach(item => ids.add(item.book_id ?? item.id)));
    return ids;
  } catch { return new Set(); }
}

export default function Discover() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const [weekBook, setWeekBook] = useState(null);
  const [pathBooks, setPathBooks] = useState({}); // { [pathId]: Book[] }
  const [loading, setLoading] = useState(true);
  const purchased = getPurchasedIds();

  const t = (k) => T[k]?.[lang] ?? T[k]?.uz ?? k;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch book of the week (most recent featured book)
      const { data: featured } = await supabase
        .from('books')
        .select('*')
        .eq('featured', true)
        .order('created_at', { ascending: false })
        .limit(1);
      if (featured?.[0]) setWeekBook(featured[0]);

      // Fetch books for each path by category
      const results = {};
      await Promise.all(
        PATHS.map(async (path) => {
          const { data } = await supabase
            .from('books')
            .select('*')
            .eq('category', path.category)
            .limit(path.maxBooks);
          results[path.id] = data ?? [];
        })
      );
      setPathBooks(results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="page" style={{ paddingBottom: 90 }}>
        {/* Header */}
        <div style={{ padding: '20px 16px 8px' }}>
          <h1 style={{ fontSize: 26, fontWeight: 900 }}>{t('title')}</h1>
        </div>

        {/* ── Book of the Week ─────────────────────────────────────────────── */}
        {(weekBook || loading) && (
          <section style={{ padding: '8px 16px 20px' }}>
            <p className="section-title" style={{ marginBottom: 12 }}>{t('bookOfWeek')}</p>
            {loading ? (
              <div className="skeleton" style={{ height: 160, borderRadius: 16 }} />
            ) : weekBook ? (
              <WeekBookCard book={weekBook} lang={lang} onNavigate={navigate} t={t} />
            ) : null}
          </section>
        )}

        {/* Divider */}
        <div className="divider" />

        {/* ── Reading Paths ─────────────────────────────────────────────────── */}
        <section style={{ padding: '16px 0 0' }}>
          <div style={{ padding: '0 16px 4px' }}>
            <p className="section-title">{t('paths')}</p>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: -8 }}>{t('pathsDesc')}</p>
          </div>

          <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />
                ))
              : PATHS.map(path => (
                  <PathCard
                    key={path.id}
                    path={path}
                    books={pathBooks[path.id] ?? []}
                    purchased={purchased}
                    lang={lang}
                    t={t}
                    onNavigate={navigate}
                  />
                ))
            }
          </div>
        </section>
      </div>
    </PageTransition>
  );
}

// ── Book of the Week Card ─────────────────────────────────────────────────────
function WeekBookCard({ book, lang, onNavigate, t }) {
  const title  = book[`title_${lang}`]  || book.title  || '—';
  const author = book[`author_${lang}`] || book.author || '—';

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      onClick={() => { haptic('light'); onNavigate(`/book/${book.id}`); }}
      style={{
        background: 'linear-gradient(135deg, var(--blue-900) 0%, var(--blue-600) 100%)',
        borderRadius: 18,
        padding: 20,
        display: 'flex',
        gap: 16,
        alignItems: 'center',
        cursor: 'pointer',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Glow orb */}
      <div style={{
        position: 'absolute', top: -30, right: -30,
        width: 140, height: 140,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,205,254,0.2) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Cover */}
      {book.cover_url ? (
        <img
          src={book.cover_url}
          alt={title}
          style={{
            width: 70, height: 100,
            objectFit: 'cover',
            borderRadius: 8,
            flexShrink: 0,
            boxShadow: '-4px 4px 16px rgba(0,0,0,0.5)',
          }}
        />
      ) : (
        <div style={{
          width: 70, height: 100, borderRadius: 8,
          background: 'rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, flexShrink: 0,
        }}>📚</div>
      )}

      {/* Info */}
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
          🔥 {lang === 'ru' ? 'Книга недели' : lang === 'en' ? 'Book of the Week' : 'Haftaning kitob'}
        </p>
        <p style={{ fontSize: 16, fontWeight: 900, color: '#fff', lineHeight: 1.3, marginBottom: 4 }}>{title}</p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{author}</p>
        {book.price && (
          <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--cyan)', marginTop: 8 }}>
            {formatPrice(book.price)}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ── Reading Path Card ─────────────────────────────────────────────────────────
function PathCard({ path, books, purchased, lang, t, onNavigate }) {
  const [expanded, setExpanded] = useState(false);
  const title = path.title[lang] ?? path.title.uz;
  const goal  = path.goal[lang]  ?? path.goal.uz;
  const readCount = books.filter(b => purchased.has(b.id)).length;
  const total     = books.length;
  const pct       = total > 0 ? (readCount / total) * 100 : 0;
  const isComplete = readCount > 0 && readCount === total;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      style={{
        background: 'var(--surface)',
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
        border: `2px solid ${expanded ? path.color : 'transparent'}`,
        transition: 'border-color 0.2s ease',
      }}
    >
      {/* Header row */}
      <motion.div
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onClick={() => { haptic('light'); setExpanded(e => !e); }}
        style={{ padding: '16px 16px 12px', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Emoji badge */}
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: path.colorLight,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, flexShrink: 0,
          }}>
            {path.emoji}
          </div>

          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>{title}</p>
            <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{goal}</p>
          </div>

          {/* Chevron */}
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </motion.div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700 }}>
              {total > 0 ? `${readCount}/${total} ${t('progress')}` : `${total} ${t('books')}`}
            </span>
            {isComplete && (
              <span style={{ fontSize: 11, fontWeight: 800, color: path.color }}>{t('done')}</span>
            )}
          </div>
          <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 30, delay: 0.2 }}
              style={{ height: '100%', background: path.color, borderRadius: 4 }}
            />
          </div>
        </div>
      </motion.div>

      {/* Expanded book list */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          style={{ borderTop: `1px solid var(--surface-2)` }}
        >
          {books.length === 0 ? (
            <p style={{ padding: '16px', fontSize: 13, color: 'var(--text-3)', textAlign: 'center' }}>
              {lang === 'ru' ? 'Книги скоро появятся...' : lang === 'en' ? 'Books coming soon...' : 'Kitoblar broz qo\'shiladi...'}
            </p>
          ) : (
            books.map((book, idx) => {
              const btitle  = book[`title_${lang}`] || book.title || '—';
              const bauthor = book[`author_${lang}`] || book.author || '—';
              const isRead  = purchased.has(book.id);
              return (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05, type: 'spring', stiffness: 400, damping: 30 }}
                  onClick={() => { haptic('light'); onNavigate(`/book/${book.id}`); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px',
                    borderBottom: idx < books.length - 1 ? '1px solid var(--surface-2)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  {/* Step number / checkmark */}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: isRead ? path.color : 'var(--surface-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 800,
                    color: isRead ? '#fff' : 'var(--text-3)',
                    transition: 'background 0.2s',
                  }}>
                    {isRead ? '✓' : idx + 1}
                  </div>

                  {/* Cover thumb */}
                  {book.cover_url ? (
                    <img src={book.cover_url} alt={btitle}
                      style={{ width: 36, height: 52, objectFit: 'cover', borderRadius: 5, flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 36, height: 52, background: path.colorLight, borderRadius: 5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📚</div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: isRead ? 'var(--text-3)' : 'var(--text-1)', textDecoration: isRead ? 'line-through' : 'none' }}>{btitle}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{bauthor}</p>
                  </div>

                  {book.price && !isRead && (
                    <span style={{ fontSize: 12, fontWeight: 800, color: path.color, flexShrink: 0 }}>
                      {formatPrice(book.price)}
                    </span>
                  )}
                </motion.div>
              );
            })
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
