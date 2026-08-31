import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { formatPrice, haptic } from '../lib/utils';
import { useLang } from '../context/LangContext';
import { useCart } from '../context/CartContext';
import CheckoutSheet from '../components/CheckoutSheet';
import PageTransition from '../components/PageTransition';
import LoadError from '../components/LoadError';

const T = {
  back:     { uz: '← Orqaga',   ru: '← Назад',    en: '← Back' },
  buy:      { uz: '🛒 Sotib olish', ru: '🛒 Купить', en: '🛒 Buy now' },
  added:    { uz: '✓ Savatga qo\'shildi', ru: '✓ В корзине', en: '✓ In cart' },
  author:   { uz: 'Muallif',    ru: 'Автор',       en: 'Author' },
  desc:     { uz: 'Tavsif',     ru: 'Описание',    en: 'Description' },
  category: { uz: 'Tur',        ru: 'Жанр',        en: 'Category' },
  noPrice:  { uz: 'Narxi so\'rash', ru: 'Узнать цену', en: 'Ask for price' },
  notFound: { uz: 'Kitob topilmadi', ru: 'Книга не найдена', en: 'Book not found' },
  backToCatalog: { uz: 'Katalogga qaytish', ru: 'Вернуться в каталог', en: 'Back to catalog' },
  askPrice: { uz: 'Narxni so\'rash', ru: 'Узнать цену', en: 'Ask for price' },
  excerpt:  { uz: 'Namuna o\'qish', ru: 'Читать фрагмент', en: 'Read excerpt' },
  wholesaleOffer: { uz: '10+ xarid qiling, har biridan 5 000 so\'m tejab qoling!', ru: 'Купите 10+ и сэкономьте 5 000 сум на каждой!', en: 'Buy 10+ and save 5,000 UZS on each!' },
  outOfStock: { uz: '🚫 Zaxirada tugagan', ru: '🚫 Нет в наличии', en: '🚫 Out of stock' },
};

export default function BookDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang } = useLang();
  const { addItem, items } = useCart();

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSheet, setShowSheet] = useState(false);
  const [readMore, setReadMore] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    // The URL param may be a full slug like "title-words-{uuid}" or a bare UUID.
    // Supabase's id column is UUID type — passing a non-UUID string causes a 400.
    // We extract the UUID by grabbing the last 36 characters if the param is longer.
    const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const match = id.match(UUID_RE);
    const bookId = match ? match[0] : id;

    supabase.from('books').select('*').eq('id', bookId).maybeSingle()
      .then(({ data, error: err }) => {
        // A failed request must not look identical to a book that does not exist.
        if (err) { setError(err); return; }
        setBook(data ?? null);
      })
      .catch(err => setError(err))
      .finally(() => setLoading(false));
  }, [id, reloadKey]);

  // Retry is an event handler, so setting state here is safe.
  const load = () => { setLoading(true); setError(null); setReloadKey(k => k + 1); };

  const t = (k) => T[k]?.[lang] ?? T[k]?.uz ?? k;
  const inCart = book && items.some(i => i.id === book.id);

  if (loading) return <LoadingState />;
  if (error) return (
    <div className="page" style={{ paddingTop: 24 }}>
      <LoadError lang={lang} onRetry={load} />
    </div>
  );
  if (!book || book.shop_visible === false) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-2)' }}>{t('notFound')}</p>
    </div>
  );

  const title  = book[`title_${lang}`]  || book.title  || '—';
  const author = book[`author_${lang}`] || book.author || '—';
  const desc   = book[`description_${lang}`] || book.description || '';
  const shortDesc = desc.slice(0, 200);
  const isLong = desc.length > 200;
  const isOutOfStock = book.stock === 0 || (book.stock != null && book.stock <= 0);

  const handleBuy = () => {
    if (isOutOfStock) return;
    haptic('medium');
    if (!inCart) addItem(book);
    setShowSheet(true);
  };

  return (
    <PageTransition>
    <>
      <div className="page" style={{ paddingBottom: 90 }}>
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          style={{ margin: '12px 16px 0', border: 'none', background: 'none', color: 'var(--blue-500)', fontFamily: 'Nunito, sans-serif', fontSize: 15, fontWeight: 700, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
        >
          {t('back')}
        </button>

        {/* Cover hero */}
        <div style={{
          background: book.bg_color || 'linear-gradient(135deg, #0A192F 0%, #265999 100%)',
          display: 'flex',
          justifyContent: 'center',
          padding: '24px 40px',
          margin: '12px 0 0',
        }}>
          {book.cover_url ? (
            <div className="book-card__cover-wrapper" style={{ height: 240, width: 'auto', aspectRatio: '2/3', margin: '0 auto', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
              <img
                src={book.cover_url}
                alt={title}
                className="book-card__cover"
                style={isOutOfStock ? { filter: 'grayscale(0.5)', opacity: 0.85 } : undefined}
              />
              <div className="book-card__spine" />
            </div>
          ) : (
            <div className="book-card__cover-wrapper" style={{ height: 240, width: 'auto', aspectRatio: '2/3', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
              📚
              <div className="book-card__spine" />
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: '20px 16px 0' }}>
          <h1 style={{ fontSize: 22, lineHeight: 1.25, marginBottom: 6 }}>{title}</h1>
          <p style={{ fontSize: 14, color: 'var(--text-2)', fontWeight: 600, marginBottom: 16 }}>
            {t('author')}: <strong style={{ color: 'var(--text-1)' }}>{author}</strong>
          </p>

          {/* Price & Stock Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
            {book.price ? (
              <span className="price" style={{ fontSize: 24 }}>{formatPrice(book.price)}</span>
            ) : (
              <span style={{ color: 'var(--text-2)', fontSize: 16, fontWeight: 700 }}>{t('noPrice')}</span>
            )}

            {isOutOfStock && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, background: 'var(--discount)', color: '#fff', padding: '4px 10px', borderRadius: 6, fontWeight: 700 }}>
                ⚠️ {t('outOfStock')}
              </span>
            )}
          </div>
          {!isOutOfStock && book.price && book.price >= 10000 && (
            <div style={{ marginBottom: 20 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, background: 'var(--discount)', color: '#fff', padding: '4px 8px', borderRadius: 6, fontWeight: 700 }}>
                <span style={{ fontSize: 14 }}>🔥</span> {t('wholesaleOffer')}
              </span>
            </div>
          )}

          {/* Description */}
          {desc && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                {t('desc')}
              </p>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--text-2)' }}>
                {readMore ? desc : shortDesc}
                {isLong && !readMore && '…'}
              </p>
              {isLong && (
                <button
                  onClick={() => setReadMore(r => !r)}
                  style={{ border: 'none', background: 'none', color: 'var(--blue-500)', fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: '6px 0' }}
                >
                  {readMore
                    ? (lang === 'ru' ? 'Свернуть' : lang === 'en' ? 'Show less' : 'Kamroq ko\'rsatish')
                    : (lang === 'ru' ? 'Читать далее' : lang === 'en' ? 'Read more' : 'Ko\'proq o\'qish')}
                </button>
              )}
            </div>
          )}

          {/* PDF excerpt */}
          {book.excerpt_url && (
            <a
              href={book.excerpt_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{ textDecoration: 'none', marginBottom: 12 }}
            >
              📄 {t('excerpt')}
            </a>
          )}

        </div>
      </div>

      <div style={{ height: 100 }} /> {/* Padding to scroll past fixed button */}

      {/* Fixed buy button */}
      {book.price && (
        <div style={{
          position: 'fixed', bottom: 0,
          left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 480,
          padding: '16px 16px calc(16px + env(safe-area-inset-bottom, 16px))',
          background: 'linear-gradient(to top, var(--bg) 85%, transparent)',
          zIndex: 99,
        }}>
          <motion.button
            className="btn-primary"
            onClick={handleBuy}
            disabled={isOutOfStock}
            whileTap={isOutOfStock ? {} : { scale: 0.97, y: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            style={isOutOfStock ? { background: 'var(--surface-2)', color: 'var(--text-3)', cursor: 'not-allowed' } : undefined}
          >
            {isOutOfStock
              ? t('outOfStock')
              : inCart
              ? (lang === 'ru' ? '✓ Оформить заказ' : lang === 'en' ? '✓ Place order' : '✓ Buyurtma berish')
              : t('buy')} {!isOutOfStock && <>&nbsp;·&nbsp; {formatPrice(book.price)}</>}
          </motion.button>
        </div>
      )}

      {showSheet && (
        <CheckoutSheet book={book} lang={lang} onClose={() => setShowSheet(false)} />
      )}
    </>
    </PageTransition>
  );
}

function LoadingState() {
  return (
    <div className="page">
      <div style={{ height: 200, background: 'var(--surface-2)', margin: '56px 0 0' }} />
      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="skeleton" style={{ height: 28, width: '75%' }} />
        <div className="skeleton" style={{ height: 16, width: '40%' }} />
        <div className="skeleton" style={{ height: 24, width: '30%', marginTop: 4 }} />
      </div>
    </div>
  );
}
