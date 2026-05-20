import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { locField, formatPrice, getCategoryLabel, CATEGORIES, haptic } from '../lib/utils';
import { useLang } from '../context/LangContext';
import BookCard from '../components/BookCard';

// ── Translations ──────────────────────────────────────────────────────────────
const T = {
  welcome:    { uz: 'Xush kelibsiz',   ru: 'Добро пожаловать', en: 'Welcome' },
  subtitle:   { uz: 'Qanday kitob qidiryapsiz?', ru: 'Что ищем сегодня?', en: 'What are you looking for?' },
  searchPh:   { uz: 'Kitob yoki muallif qidirish...', ru: 'Поиск книги или автора...', en: 'Search book or author...' },
  featured:   { uz: '⭐ Tavsiya etilgan',  ru: '⭐ Рекомендуем',   en: '⭐ Featured' },
  newBooks:   { uz: '✨ Yangi nashrlar',   ru: '✨ Новинки',        en: '✨ New Releases' },
  seeAll:     { uz: 'Barchasi',            ru: 'Все',              en: 'All' },
  loading:    { uz: 'Yuklanmoqda...',      ru: 'Загрузка...',      en: 'Loading...' },
};

const HERO_SLIDES = [
  {
    eyebrow: { uz: 'Booktopia Kutubxonasi', ru: 'Библиотека Booktopia', en: 'Booktopia Library' },
    title:   { uz: 'O\'qish — eng yaxshi\nsarmoya', ru: 'Чтение — лучшая\nинвестиция', en: 'Reading is the\nbest investment' },
    bg:      'linear-gradient(135deg, #0A192F 0%, #265999 100%)',
    accent:  '#00CDFE',
  },
  {
    eyebrow: { uz: 'Yangi nashrlar', ru: 'Новинки', en: 'New Arrivals' },
    title:   { uz: 'Yangi kitoblar\nsizni kutmoqda', ru: 'Новые книги\nуже здесь', en: 'New books\nawaiting you' },
    bg:      'linear-gradient(135deg, #132D55 0%, #4488BF 100%)',
    accent:  '#D5AD36',
  },
];

export default function Home() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [slide, setSlide] = useState(0);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    loadBooks();
    const timer = setInterval(() => setSlide(s => (s + 1) % HERO_SLIDES.length), 4000);
    return () => clearInterval(timer);
  }, []);

  const loadBooks = async () => {
    try {
      const { data } = await supabase
        .from('books')
        .select('*')
        .order('sort_order', { ascending: true, nullsFirst: false });
      if (data) setBooks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const t = (k) => T[k]?.[lang] ?? T[k]?.uz ?? k;

  // Filter by search + category
  const filtered = books.filter(b => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (b.title || '').toLowerCase().includes(q) ||
      (b[`title_${lang}`] || '').toLowerCase().includes(q) ||
      (b.author || '').toLowerCase().includes(q);
    const matchCat = activeCategory === 'all' || b.category === activeCategory;
    return matchSearch && matchCat;
  });

  const featured = books.filter(b => b.featured).slice(0, 6);
  const newReleases = books.filter(b => b.category === 'new').slice(0, 6);
  const hero = HERO_SLIDES[slide];

  const showingFiltered = search || activeCategory !== 'all';

  return (
    <div className="page" style={{ paddingTop: 0 }}>

      {/* ── Hero banner ───────────────────────────────────────────────────────── */}
      {!showingFiltered && (
        <div
          className="hero-banner"
          style={{ background: hero.bg, margin: '12px 16px', minHeight: 170 }}
          onClick={() => navigate('/catalog')}
        >
          <div className="hero-banner__content">
            <p className="hero-banner__eyebrow" style={{ color: hero.accent }}>
              {hero.eyebrow[lang] ?? hero.eyebrow.uz}
            </p>
            <h1 className="hero-banner__title" style={{ whiteSpace: 'pre-line', fontSize: 22 }}>
              {hero.title[lang] ?? hero.title.uz}
            </h1>
            <button className="hero-banner__cta" style={{ background: hero.accent, color: '#0A192F' }}>
              {t('seeAll')} →
            </button>
          </div>
          {/* Slide dots */}
          <div style={{ position: 'absolute', bottom: 14, right: 16, display: 'flex', gap: 5 }}>
            {HERO_SLIDES.map((_, i) => (
              <span key={i} style={{
                width: i === slide ? 18 : 6, height: 6,
                borderRadius: 4,
                background: i === slide ? '#fff' : 'rgba(255,255,255,0.4)',
                transition: 'width 0.3s ease',
              }} />
            ))}
          </div>
        </div>
      )}

      {/* ── Search ────────────────────────────────────────────────────────────── */}
      <div className="search-bar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('searchPh')}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ border: 'none', background: 'none', color: 'var(--text-3)', fontSize: 16, cursor: 'pointer' }}>×</button>
        )}
      </div>

      {/* ── Category pills ────────────────────────────────────────────────────── */}
      <div className="h-scroll" style={{ paddingTop: 0 }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`pill pill--${activeCategory === cat ? 'active' : 'idle'}`}
            onClick={() => { setActiveCategory(cat); haptic('light'); }}
          >
            {getCategoryLabel(cat, lang)}
          </button>
        ))}
      </div>

      {/* ── Filtered results ──────────────────────────────────────────────────── */}
      {showingFiltered ? (
        <div>
          <div style={{ padding: '12px 16px 0', color: 'var(--text-2)', fontSize: 13, fontWeight: 600 }}>
            {filtered.length} {lang === 'ru' ? 'книг' : lang === 'en' ? 'books' : 'ta kitob'}
          </div>
          {loading ? <SkeletonGrid /> : (
            <div className="books-grid" style={{ marginTop: 12 }}>
              {filtered.map((book, i) => (
                <BookCard key={book.id} book={book} lang={lang} onNavigate={navigate} index={i} />
              ))}
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="empty-state">
              <span className="empty-state__icon">🔍</span>
              <h3 className="empty-state__title">
                {lang === 'ru' ? 'Ничего не найдено' : lang === 'en' ? 'Nothing found' : 'Hech narsa topilmadi'}
              </h3>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Featured */}
          {featured.length > 0 && (
            <div>
              <div className="section-header">
                <h2>{t('featured')}</h2>
                <button className="section-header__more" onClick={() => navigate('/catalog')}>
                  {t('seeAll')} →
                </button>
              </div>
              {loading ? <SkeletonGrid /> : (
                <div className="books-grid">
                  {featured.map((book, i) => (
                    <BookCard key={book.id} book={book} lang={lang} onNavigate={navigate} index={i} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* New Releases */}
          {newReleases.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div className="divider" />
              <div className="section-header">
                <h2>{t('newBooks')}</h2>
                <button className="section-header__more" onClick={() => navigate('/catalog?cat=new')}>
                  {t('seeAll')} →
                </button>
              </div>
              {loading ? <SkeletonGrid /> : (
                <div className="books-grid">
                  {newReleases.map((book, i) => (
                    <BookCard key={book.id} book={book} lang={lang} onNavigate={navigate} index={i} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* All books if no featured */}
          {!loading && featured.length === 0 && (
            <div className="books-grid" style={{ marginTop: 12 }}>
              {books.slice(0, 6).map((book, i) => (
                <BookCard key={book.id} book={book} lang={lang} onNavigate={navigate} index={i} />
              ))}
            </div>
          )}
        </>
      )}

      <div style={{ height: 20 }} />
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="books-grid" style={{ marginTop: 8 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ borderRadius: 14, overflow: 'hidden' }}>
          <div className="skeleton" style={{ aspectRatio: '3/4', width: '100%' }} />
          <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="skeleton" style={{ height: 14, width: '80%' }} />
            <div className="skeleton" style={{ height: 11, width: '55%' }} />
            <div className="skeleton" style={{ height: 14, width: '60%', marginTop: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
