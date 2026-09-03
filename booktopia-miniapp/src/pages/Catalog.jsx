import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getBooks } from '../lib/booksCache';
import { getCategoryLabel, CATEGORIES, haptic } from '../lib/utils';
import { useLang } from '../context/LangContext';
import BookCard from '../components/BookCard';
import PageTransition from '../components/PageTransition';
import LoadError from '../components/LoadError';
import { MagnifyingGlass, Package } from '@phosphor-icons/react';

const T = {
  title:    { uz: 'Katalog',           ru: 'Каталог',    en: 'Catalog' },
  searchPh: { uz: 'Qidirish...',       ru: 'Поиск...',   en: 'Search...' },
  searchLabel: { uz: 'Kitob qidirish', ru: 'Поиск книг', en: 'Search books' },
  empty:    { uz: 'Kitoblar topilmadi', ru: 'Книги не найдены', en: 'No books found' },
  emptyFor: { uz: 'so\'rovi bo\'yicha hech narsa topilmadi', ru: 'ничего не найдено по запросу', en: 'nothing found for' },
  count:    { uz: 'ta kitob',          ru: 'книг',       en: 'books' },
  clear:    { uz: 'Tozalash',          ru: 'Очистить',   en: 'Clear' },
};


export default function Catalog() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const [params, setParams] = useSearchParams();
  const initCat = params.get('cat') ?? 'all';

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(CATEGORIES.includes(initCat) ? initCat : 'all');

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    getBooks()
      .then((rows) => { setBooks(rows ?? []); })
      .catch(err => setError(err))
      .finally(() => setLoading(false));
  }, [reloadKey]);

  // Retry runs from a click, so setting state here is safe.
  const load = () => { setLoading(true); setError(null); setReloadKey(k => k + 1); };

  // Keep the active filter in the URL so back/refresh preserve it.
  const changeCategory = (cat) => {
    setCategory(cat);
    haptic('light');
    const next = new URLSearchParams(params);
    if (cat === 'all') next.delete('cat'); else next.set('cat', cat);
    setParams(next, { replace: true });
  };

  const t = (k) => T[k]?.[lang] ?? T[k]?.uz;

  const filtered = books.filter(b => {
    if (b.shop_visible === false) return false;
    const q = search.trim().toLowerCase();
    // Search every localized title and author, not just the active language.
    const haystack = [
      b.title, b.title_ru, b.title_en,
      b.author, b.author_ru, b.author_en,
    ].filter(Boolean).join(' ').toLowerCase();
    const matchQ = !q || haystack.includes(q);
    // 'new' is a lifecycle flag rather than a genre, so it cannot be
    // compared against b.category like the others.
    const matchC = category === 'all'
      || (category === 'new' ? !!b.is_new : b.category === category);
    return matchQ && matchC;
  });

  return (
    <PageTransition>
    <div className="page">
      {/* Header */}
      <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 22 }}>{t('title')}</h1>
        {!error && (
          <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 600 }}>
            {filtered.length} {t('count')}
          </span>
        )}
      </div>

      {/* Search */}
      <div className="search-bar">
        <MagnifyingGlass size={16} weight="regular" color="var(--text-3)" aria-hidden="true" />
        <input
          id="catalog-search"
          aria-label={t('searchLabel')}
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('searchPh')}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            aria-label={t('clear')}
            style={{ border: 'none', background: 'none', color: 'var(--text-2)', fontSize: 16, cursor: 'pointer' }}
          >×</button>
        )}
      </div>

      {/* Category pills */}
      <div className="h-scroll" style={{ paddingTop: 4 }} role="group" aria-label={t('title')}>
        {CATEGORIES.map(cat => (
          <motion.button
            key={cat}
            className={`pill pill--${category === cat ? 'active' : 'idle'}`}
            onClick={() => changeCategory(cat)}
            aria-pressed={category === cat}
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
      ) : error ? (
        <LoadError lang={lang} onRetry={load} />
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">
            <Package size={56} weight="thin" color="var(--text-3)" />
          </div>
          <h3 className="empty-state__title">{t('empty')}</h3>
          {search.trim() && (
            <p className="empty-state__desc">“{search.trim()}” — {t('emptyFor')}</p>
          )}
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
