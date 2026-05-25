import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { getCategoryLabel, CATEGORIES, haptic } from '../lib/utils';
import { useLang } from '../context/LangContext';
import BookCard from '../components/BookCard';
import PageTransition from '../components/PageTransition';
import { MagnifyingGlass, Package } from '@phosphor-icons/react';

const T = {
  title:    { uz: 'Katalog',           ru: 'Каталог',    en: 'Catalog' },
  searchPh: { uz: 'Qidirish...',       ru: 'Поиск...',   en: 'Search...' },
  empty:    { uz: 'Kitoblar topilmadi', ru: 'Книги не найдены', en: 'No books found' },
  count:    { uz: 'ta kitob',          ru: 'книг',       en: 'books' },
};

export default function Catalog() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const [params] = useSearchParams();
  const initCat = params.get('cat') ?? 'all';

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(initCat);

  useEffect(() => {
    supabase.from('books').select('*').order('sort_order', { ascending: true, nullsFirst: false })
      .then(({ data }) => { if (data) setBooks(data); })
      .finally(() => setLoading(false));
  }, []);

  const t = (k) => T[k]?.[lang] ?? T[k]?.uz;

  const filtered = books.filter(b => {
    const q = search.toLowerCase();
    const matchQ = !q ||
      (b.title || '').toLowerCase().includes(q) ||
      (b[`title_${lang}`] || '').toLowerCase().includes(q) ||
      (b.author || '').toLowerCase().includes(q);
    const matchC = category === 'all' || b.category === category;
    return matchQ && matchC;
  });

  return (
    <PageTransition>
    <div className="page">
      {/* Header */}
      <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 22 }}>{t('title')}</h1>
        <span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 600 }}>
          {filtered.length} {t('count')}
        </span>
      </div>

      {/* Search */}
      <div className="search-bar">
        <MagnifyingGlass size={16} weight="regular" color="var(--text-3)" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchPh')} />
        {search && <button onClick={() => setSearch('')} style={{ border: 'none', background: 'none', color: 'var(--text-3)', fontSize: 16, cursor: 'pointer' }}>×</button>}
      </div>

      {/* Category pills */}
      <div className="h-scroll" style={{ paddingTop: 4 }}>
        {CATEGORIES.map(cat => (
          <motion.button
            key={cat}
            className={`pill pill--${category === cat ? 'active' : 'idle'}`}
            onClick={() => { setCategory(cat); haptic('light'); }}
            whileTap={{ scale: 0.93 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            {getCategoryLabel(cat, lang)}
          </motion.button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ height: 12 }} />
      {loading ? (
        <SkeletonGrid />
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">
            <Package size={56} weight="thin" color="var(--text-3)" />
          </div>
          <h3 className="empty-state__title">{t('empty')}</h3>
        </div>
      ) : (
        <div className="books-grid">
          {filtered.map((book, i) => (
            <BookCard key={book.id} book={book} lang={lang} onNavigate={navigate} index={i} />
          ))}
        </div>
      )}
      <div style={{ height: 20 }} />
    </div>
    </PageTransition>
  );
}

function SkeletonGrid() {
  return (
    <div className="books-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ borderRadius: 14, overflow: 'hidden' }}>
          <div className="skeleton" style={{ aspectRatio: '3/4', width: '100%' }} />
          <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="skeleton" style={{ height: 14, width: '80%' }} />
            <div className="skeleton" style={{ height: 11, width: '55%' }} />
            <div className="skeleton" style={{ height: 14, width: '60%', marginTop: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
