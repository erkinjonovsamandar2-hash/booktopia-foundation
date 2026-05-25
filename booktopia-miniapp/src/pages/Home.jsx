import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { formatPrice, haptic, tg } from '../lib/utils';
import { useLang } from '../context/LangContext';
import CheckoutSheet from '../components/CheckoutSheet';
import PageTransition from '../components/PageTransition';
import { Books, ShoppingCart, RocketLaunch, Flame, Eye, PenNib, Star } from '@phosphor-icons/react';

// ── Translations ───────────────────────────────────────────────────────────────
const T = {
  greeting:    { uz: 'Assalomu alaykum',  ru: 'Добрый день',       en: 'Hello' },
  hero1:       { uz: 'Eng yaxshi kitoblar', ru: 'Лучшие книги',    en: 'The best books' },
  hero2:       { uz: '— uyingizga 24 soatda', ru: '— домой за 24 часа', en: '— at your door in 24h' },
  heroSub:     { uz: 'Toshkent bo\'ylab yetkazib beramiz', ru: 'Доставляем по всему Ташкенту', en: 'Delivered across Tashkent' },
  howTitle:    { uz: 'Qanday ishlaydi?',  ru: 'Как это работает?', en: 'How it works?' },
  step1t:      { uz: 'Kitob tanlang',     ru: 'Выберите книгу',    en: 'Choose a book' },
  step1d:      { uz: 'Katalogdan',        ru: 'Из каталога',       en: 'From catalog' },
  step2t:      { uz: 'Buyurtma bering',   ru: 'Оформите заказ',    en: 'Place order' },
  step2d:      { uz: '30 sekund',         ru: '30 секунд',         en: '30 seconds' },
  step3t:      { uz: 'Qo\'lingizda',      ru: 'В ваших руках',     en: 'In your hands' },
  step3d:      { uz: '24 soat ichida',    ru: 'В течение 24 часов', en: 'Within 24 hours' },
  featured:    { uz: '📚 Tanlangan kitoblar', ru: '📚 Избранные книги', en: '📚 Featured Books' },
  newBooks:    { uz: '✨ Yangi nashrlar',  ru: '✨ Новинки',         en: '✨ New Releases' },
  seeAll:      { uz: 'Barchasini ko\'rish →', ru: 'Смотреть все →', en: 'See all →' },
  catalogCta:  { uz: 'Butun katalogni ko\'rish', ru: 'Открыть каталог', en: 'Open catalog' },
  buy:         { uz: 'Sotib olish',       ru: 'Купить',             en: 'Buy' },
  blogTitle:   { uz: '✍️ Maqolalar',      ru: '✍️ Статьи',          en: '✍️ Articles' },
  blogCta:     { uz: 'Barchasini o\'qish →', ru: 'Читать все →',   en: 'Read all →' },
  readMore:    { uz: 'Batafsil o\'qish',  ru: 'Читать далее',       en: 'Read more' },
  soonTitle:   { uz: '⏳ Tez kunda',      ru: '⏳ Скоро',           en: '⏳ Coming Soon' },
  notify:      { uz: 'Xabar bering',      ru: 'Уведомить меня',     en: 'Notify me' },
  notified:    { uz: '✅ Xabar beriladi', ru: '✅ Уведомим вас',    en: '✅ You\'re on the list' },
  bestsellers: { uz: '🔥 Eng ko\'p sotilgan', ru: '🔥 Бестселлеры',  en: '🔥 Bestsellers' },
  recentTitle: { uz: '👁 So\'nggi ko\'rilgan', ru: '👁 Недавно просмотренные', en: '👁 Recently Viewed' },
  trustOrders: { uz: 'buyurtma bajarildi', ru: 'заказов выполнено', en: 'orders fulfilled' },
  trustOfficial:{ uz: 'Rasmiy nashriyot', ru: 'Официальное изд-во', en: 'Official publisher' },
  trustDelivery:{ uz: '24 soat kafolat', ru: 'Гарантия 24 часа',   en: '24-hour guarantee' },
};

const STEPS = [
  { Icon: Books,        tKey: 'step1t', dKey: 'step1d', color: '#265999', light: '#E8F4FD' },
  { Icon: ShoppingCart, tKey: 'step2t', dKey: 'step2d', color: '#D5AD36', light: '#FBF6E3' },
  { Icon: RocketLaunch, tKey: 'step3t', dKey: 'step3d', color: '#38A169', light: '#EBF8F0' },
];

export default function Home() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const [books, setBooks]               = useState([]);
  const [articles, setArticles]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [sheetBook, setSheetBook]       = useState(null);
  const [notified, setNotified]         = useState(() => {
    try { return JSON.parse(localStorage.getItem('booktopia_notified') ?? '{}'); }
    catch { return {}; }
  });
  const [recentIds, setRecentIds]       = useState(() => {
    try { return JSON.parse(localStorage.getItem('booktopia_recent') ?? '[]'); }
    catch { return []; }
  });

  // Get Telegram user name
  const user      = tg()?.initDataUnsafe?.user;
  const firstName = user?.first_name ?? '';

  const t = (k) => T[k]?.[lang] ?? T[k]?.uz ?? k;

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [booksRes, articlesRes] = await Promise.all([
        supabase.from('books').select('*').order('sort_order', { ascending: true, nullsFirst: false }),
        supabase.from('blog_posts').select('id,slug,title,excerpt,reading_time,image_url,published_at').eq('published', true).order('published_at', { ascending: false }).limit(4),
      ]);
      if (booksRes.data)    setBooks(booksRes.data);
      if (articlesRes.data) setArticles(articlesRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleNotify = (bookId) => {
    const next = { ...notified, [bookId]: true };
    setNotified(next);
    localStorage.setItem('booktopia_notified', JSON.stringify(next));
    haptic('success');
  };

  // De-duplicate same book across language editions
  const uniqueBooks = books.reduce((acc, b) => {
    const key = (b.author || '').toLowerCase().replace(/\s/g, '') +
                (b.title  || '').toLowerCase().slice(0, 12);
    if (!acc.seen.has(key)) { acc.seen.add(key); acc.list.push(b); }
    return acc;
  }, { seen: new Set(), list: [] }).list;

  const featured      = uniqueBooks.filter(b => b.featured).slice(0, 8);
  const newReleases   = uniqueBooks.filter(b => b.category === 'new').slice(0, 6);
  const comingSoon    = uniqueBooks.filter(b => b.status === 'soon' || b.price === null).slice(0, 5);
  // Bestsellers: featured books ordered by sort_order (lowest = most popular)
  const bestsellers   = uniqueBooks.filter(b => b.featured && b.price).slice(0, 6);
  // Recently viewed: match stored IDs to loaded books, keep order
  const byId          = Object.fromEntries(uniqueBooks.map(b => [b.id, b]));
  const recentlyViewed = recentIds.map(id => byId[id]).filter(Boolean).slice(0, 6);

  // Track a book view into localStorage
  const trackView = (bookId) => {
    setRecentIds(prev => {
      const next = [bookId, ...prev.filter(id => id !== bookId)].slice(0, 10);
      localStorage.setItem('booktopia_recent', JSON.stringify(next));
      return next;
    });
  };

  // Calculate order count from localStorage for the trust bar
  const orderCount = (() => {
    try {
      const orders = JSON.parse(localStorage.getItem('booktopia_orders') ?? '[]');
      // Base of 500+ regardless; add real local orders on top
      return orders.length > 0 ? `${500 + orders.length}+` : '500+';
    } catch { return '500+'; }
  })();

  return (
    <PageTransition>
      <div className="page" style={{ paddingTop: 0, paddingBottom: 100 }}>

        {/* ── 1. HERO ──────────────────────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(160deg, #0A192F 0%, #132D55 55%, #265999 100%)',
          padding: '28px 20px 32px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Dot-grid texture */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: 'radial-gradient(rgba(0,205,254,0.1) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }} />
          {/* Gold glow */}
          <div style={{
            position: 'absolute', top: -60, right: -60,
            width: 220, height: 220, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(213,173,54,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {firstName ? (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontWeight: 600, marginBottom: 8 }}
              >
                {t('greeting')}{firstName ? `, ${firstName}` : ''}! 👋
              </motion.p>
            ) : null}

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 28 }}
              style={{ fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1.2, margin: 0 }}
            >
              {t('hero1')}<br />
              <span style={{ color: '#00CDFE' }}>{t('hero2')}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 10, fontWeight: 600 }}
            >
              📍 {t('heroSub')}
            </motion.p>

            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => { haptic('light'); navigate('/catalog'); }}
              style={{
                marginTop: 20, padding: '10px 22px',
                background: '#00CDFE', color: '#0A192F',
                border: 'none', borderRadius: 50,
                fontSize: 13, fontWeight: 900, cursor: 'pointer',
              }}
            >
              {t('seeAll')}
            </motion.button>
          </div>
        </div>


        {/* ── 2. HOW IT WORKS ──────────────────────────────────────────────────── */}
        <div style={{ padding: '24px 16px 20px' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, color: 'var(--text-1)' }}>
            {t('howTitle')}
          </h2>
          <div style={{ display: 'flex', gap: 10 }}>
            {STEPS.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08, type: 'spring', stiffness: 300, damping: 28 }}
                style={{
                  flex: 1,
                  background: 'var(--surface)',
                  borderRadius: 16,
                  padding: '14px 10px',
                  textAlign: 'center',
                  boxShadow: 'var(--shadow-card)',
                  position: 'relative',
                }}
              >
                {/* Arrow connector — not on last */}
                {i < STEPS.length - 1 && (
                  <div style={{
                    position: 'absolute', right: -8, top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 12, color: 'var(--text-3)', zIndex: 2,
                    fontWeight: 800,
                  }}>›</div>
                )}
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: step.light,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, margin: '0 auto 8px',
                }}><step.Icon size={22} weight="duotone" color={step.color} /></div>
                <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.25 }}>
                  {t(step.tKey)}
                </p>
                <p style={{ fontSize: 10, fontWeight: 700, color: step.color, marginTop: 3 }}>
                  {t(step.dKey)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="divider" />

        {/* ── 3a. RECENTLY VIEWED (returning users only) ───────────────────────── */}
        {recentlyViewed.length > 0 && (
          <div style={{ paddingTop: 20, paddingBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 14px' }}>
              <h2 style={{ fontSize: 16, fontWeight: 800 }}>{t('recentTitle')}</h2>
            </div>
            <div className="h-scroll" style={{ paddingBottom: 12 }}>
              {recentlyViewed.map((book, i) => (
                <PortraitCard
                  key={book.id} book={book} lang={lang} index={i}
                  onNavigate={(path) => { trackView(book.id); navigate(path); }}
                  onBuy={() => { haptic('light'); setSheetBook(book); }}
                />
              ))}
            </div>
            <div className="divider" />
          </div>
        )}

        {/* ── 3b. BESTSELLERS ──────────────────────────────────────────────────── */}
        {(loading || bestsellers.length > 0) && (
          <div style={{ paddingTop: recentlyViewed.length > 0 ? 0 : 20, paddingBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 14px' }}>
              <h2 style={{ fontSize: 16, fontWeight: 800 }}>{t('bestsellers')}</h2>
              <button
                onClick={() => navigate('/catalog')}
                style={{ fontSize: 12, fontWeight: 800, color: 'var(--blue-500)', background: 'none', border: 'none', cursor: 'pointer' }}
              >{t('seeAll')}</button>
            </div>
            <div className="h-scroll" style={{ paddingBottom: 12 }}>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <PortraitSkeleton key={i} />)
                : bestsellers.map((book, i) => (
                    <PortraitCard
                      key={book.id} book={book} lang={lang} index={i}
                      onNavigate={(path) => { trackView(book.id); navigate(path); }}
                      onBuy={() => { haptic('light'); setSheetBook(book); }}
                    />
                  ))
              }
            </div>
          </div>
        )}

        {/* ── 4. NEW RELEASES ──────────────────────────────────────────────── */}
        {(loading || newReleases.length > 0) && (
          <div style={{ paddingBottom: 8 }}>
            <div className="divider" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 16px 14px' }}>
              <h2 style={{ fontSize: 16, fontWeight: 800 }}>{t('newBooks')}</h2>
              <button
                onClick={() => navigate('/catalog?cat=new')}
                style={{ fontSize: 12, fontWeight: 800, color: 'var(--blue-500)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {t('seeAll')}
              </button>
            </div>
            <div className="h-scroll" style={{ paddingBottom: 12 }}>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <PortraitSkeleton key={i} />)
                : newReleases.map((book, i) => (
                    <PortraitCard
                      key={book.id} book={book} lang={lang} index={i}
                      onNavigate={navigate}
                      onBuy={() => { haptic('light'); setSheetBook(book); }}
                    />
                  ))
              }
            </div>
          </div>
        )}

        {/* ── 5. BLOG TEASERS ───────────────────────────────────────────────────── */}
        {(loading || articles.length > 0) && (
          <div>
            <div className="divider" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 16px 14px' }}>
              <h2 style={{ fontSize: 16, fontWeight: 800 }}>{t('blogTitle')}</h2>
              <button
                onClick={() => { haptic('light'); window.Telegram?.WebApp?.openLink('https://booktopia.uz/blog'); }}
                style={{ fontSize: 12, fontWeight: 800, color: 'var(--blue-500)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {t('blogCta')}
              </button>
            </div>
            <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {loading
                ? Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="skeleton" style={{ height: 90, borderRadius: 14 }} />
                  ))
                : articles.slice(0, 3).map((a, i) => (
                    <BlogCard key={a.id} article={a} lang={lang} t={t} index={i} />
                  ))
              }
            </div>
          </div>
        )}

        {/* ── 6. CATALOG CTA ───────────────────────────────────────────────────── */}

        {/* ── 7. CATALOG CTA ───────────────────────────────────────────────────── */}
        <div style={{ padding: '12px 16px 0' }}>
          <motion.button
            className="btn-primary"
            onClick={() => { haptic('medium'); navigate('/catalog'); }}
            whileTap={{ scale: 0.97, y: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            style={{ background: 'linear-gradient(135deg, #265999, #4488BF)' }}
          >
            {t('catalogCta')}
          </motion.button>
        </div>

      </div>

      {sheetBook && (
        <CheckoutSheet book={sheetBook} lang={lang} onClose={() => setSheetBook(null)} />
      )}
    </PageTransition>
  );
}

// ── Portrait Book Card (for horizontal strips) ─────────────────────────────────
function PortraitCard({ book, lang, index, onNavigate, onBuy }) {
  const title  = book[`title_${lang}`] || book.title  || '—';
  const author = book[`author_${lang}`] || book.author || '—';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 300, damping: 28 }}
      style={{ width: 130, flexShrink: 0, cursor: 'pointer' }}
    >
      {/* Cover */}
      <div
        onClick={() => onNavigate(`/book/${book.id}`)}
        style={{
          position: 'relative',
          width: 130, height: 185,
          borderRadius: '3px 12px 12px 3px',
          overflow: 'hidden',
          boxShadow: '-6px 4px 18px rgba(0,0,0,0.35), inset -3px 0 8px rgba(0,0,0,0.4)',
          background: 'var(--surface-2)',
        }}
      >
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            loading="lazy"
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: `linear-gradient(135deg, #0A192F, #265999)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.4)', fontSize: 36,
          }}>📚</div>
        )}
        {/* Spine highlight */}
        <div style={{
          position: 'absolute', inset: '0 auto 0 0', width: 10,
          background: 'linear-gradient(to right, rgba(255,255,255,0.4), rgba(255,255,255,0.05) 2px, rgba(0,0,0,0.3) 5px, rgba(0,0,0,0.6) 8px, transparent)',
          pointerEvents: 'none',
        }} />
        {/* New badge */}
        {book.category === 'new' && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            background: '#FF6B35', color: '#fff',
            fontSize: 9, fontWeight: 900, padding: '2px 7px',
            borderRadius: 20, letterSpacing: '0.05em',
          }}>NEW</div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '8px 2px 0' }}>
        <p style={{
          fontSize: 12, fontWeight: 700, lineHeight: 1.3, color: 'var(--text-1)',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{title}</p>
        <p style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {author}
        </p>
        {book.price ? (
          <motion.button
            onClick={onBuy}
            whileTap={{ scale: 0.93 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            style={{
              marginTop: 7, width: '100%', padding: '6px 0',
              background: 'var(--blue-500)', color: '#fff',
              border: 'none', borderRadius: 8,
              fontSize: 11, fontWeight: 800, cursor: 'pointer',
              fontFamily: 'Nunito, sans-serif',
            }}
          >
            {formatPrice(book.price)}
          </motion.button>
        ) : null}
      </div>
    </motion.div>
  );
}

// ── Portrait Skeleton ──────────────────────────────────────────────────────────
function PortraitSkeleton() {
  return (
    <div style={{ width: 130, flexShrink: 0 }}>
      <div className="skeleton" style={{ width: 130, height: 185, borderRadius: 12 }} />
      <div style={{ padding: '8px 2px 0', display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div className="skeleton" style={{ height: 12, width: '90%', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 10, width: '60%', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 28, width: '100%', borderRadius: 8, marginTop: 2 }} />
      </div>
    </div>
  );
}

// ── Blog Article Teaser Card ───────────────────────────────────────────────────
function BlogCard({ article, lang, t, index }) {
  const title   = article[`title_${lang}`] || article.title || '—';
  const excerpt = article[`excerpt_${lang}`] || article.excerpt || '';
  const url     = `https://booktopia.uz/blog/${article.slug || article.id}`;

  const openArticle = () => {
    haptic('light');
    if (window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 300, damping: 28 }}
      onClick={openArticle}
      style={{
        display: 'flex', gap: 12, alignItems: 'center',
        background: 'var(--surface)',
        borderRadius: 14,
        padding: 12,
        boxShadow: 'var(--shadow-card)',
        cursor: 'pointer',
      }}
    >
      {/* Thumbnail */}
      {article.image_url ? (
        <img
          src={article.image_url}
          alt={title}
          style={{
            width: 72, height: 72,
            objectFit: 'cover',
            borderRadius: 10,
            flexShrink: 0,
          }}
        />
      ) : (
        <div style={{
          width: 72, height: 72, borderRadius: 10,
          background: 'var(--blue-100)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, flexShrink: 0,
        }}>✍️</div>
      )}

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13, fontWeight: 700, lineHeight: 1.3, color: 'var(--text-1)',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          marginBottom: 4,
        }}>{title}</p>
        {excerpt && (
          <p style={{
            fontSize: 11, color: 'var(--text-2)', lineHeight: 1.4,
            display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{excerpt}</p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          {article.reading_time && (
            <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600 }}>
              🕐 {article.reading_time}
            </span>
          )}
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--blue-500)' }}>
            {t('readMore')} →
          </span>
        </div>
      </div>
    </motion.div>
  );
}

