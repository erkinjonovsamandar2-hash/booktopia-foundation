import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { formatPrice, haptic, getCategoryLabel } from '../lib/utils';
import { useLang } from '../context/LangContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useWishlist } from '../context/WishlistContext';
import CheckoutSheet from '../components/CheckoutSheet';
import PageTransition from '../components/PageTransition';
import { Books, FileText, Heart, ShoppingCart, Check } from '@phosphor-icons/react';
import LoadError from '../components/LoadError';

const T = {
  back:     { uz: '← Orqaga',   ru: '← Назад',    en: '← Back' },
  buy:      { uz: 'Sotib olish', ru: 'Купить', en: 'Buy now' },
  added:    { uz: 'Savatga qo\'shildi', ru: 'В корзине', en: 'In cart' },
  addToCart:{ uz: 'Savat',              ru: 'В корзину',  en: 'Cart' },
  viewCart: { uz: 'Savatda',            ru: 'В корзине',  en: 'In cart' },
  addedMsg: { uz: 'Savatga qo\'shildi', ru: 'Добавлено в корзину', en: 'Added to cart' },
  addedSub: { uz: 'Yana kitob tanlashingiz mumkin', ru: 'Можно выбрать ещё книги', en: 'You can keep browsing' },
  author:   { uz: 'Muallif',    ru: 'Автор',       en: 'Author' },
  desc:     { uz: 'Tavsif',     ru: 'Описание',    en: 'Description' },
  category: { uz: 'Tur',        ru: 'Жанр',        en: 'Category' },
  noPrice:  { uz: 'Narxi so\'rash', ru: 'Узнать цену', en: 'Ask for price' },
  notFound: { uz: 'Kitob topilmadi', ru: 'Книга не найдена', en: 'Book not found' },
  backToCatalog: { uz: 'Katalogga qaytish', ru: 'Вернуться в каталог', en: 'Back to catalog' },
  askPrice: { uz: 'Narxni so\'rash', ru: 'Узнать цену', en: 'Ask for price' },
  excerpt:  { uz: 'Namuna o\'qish', ru: 'Читать фрагмент', en: 'Read excerpt' },
  save:     { uz: 'Saqlanganlarga qo\'shish', ru: 'В избранное',      en: 'Add to wishlist' },
  saved:    { uz: 'Saqlangan',                ru: 'В избранном',      en: 'Saved' },
  wholesaleOffer: { uz: '10+ xarid qiling, har biridan 5 000 so\'m tejab qoling!', ru: 'Купите 10+ и сэкономьте 5 000 сум на каждой!', en: 'Buy 10+ and save 5,000 UZS on each!' },
  outOfStock: { uz: 'Zaxirada tugagan', ru: 'Нет в наличии', en: 'Out of stock' },
};

export default function BookDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang } = useLang();
  const { addItem, items } = useCart();
  const { showToast } = useToast();
  const { isSaved, toggle } = useWishlist();

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

  // Adding to the cart must not drag you into checkout. Buying was the only
  // action this page offered, so the only way to keep browsing was to back out
  // of an order form you never meant to open.
  const handleAddToCart = () => {
    if (isOutOfStock) return;
    if (inCart) { haptic('light'); navigate('/cart'); return; }
    haptic('success');
    addItem(book);
    showToast(t('addedMsg'), t('addedSub'));
  };

  // Checkout takes the whole cart, not just this book, so the button has to
  // quote what will actually be charged. It showed this book's price while the
  // sheet behind it totalled several.
  const cartTotal  = items.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
  const orderTotal = inCart ? cartTotal : cartTotal + (book.price || 0);

  return (
    <PageTransition>
    <>
      <div className="page" style={{ paddingBottom: 90 }}>
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          style={{ margin: '12px 16px 0', border: 'none', background: 'none', color: 'var(--blue-500)', fontSize: 15, fontWeight: 700, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
        >
          {t('back')}
        </button>

        {/* Cover hero */}
        <div style={{
          position: 'relative',
          background: book.bg_color || 'linear-gradient(135deg, #0A192F 0%, #265999 100%)',
          display: 'flex',
          justifyContent: 'center',
          padding: '28px 40px 32px',
          margin: '12px 0 0',
          overflow: 'hidden',
        }}>
          {/* Backdrop drawn from the cover itself, blurred and dimmed. */}
          {book.cover_url && (
            <div
              aria-hidden="true"
              style={{
                position: 'absolute', inset: '-20%',
                backgroundImage: `url(${book.cover_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(28px) saturate(1.15)',
                opacity: 0.55,
                transform: 'scale(1.1)',
              }}
            />
          )}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(180deg, rgba(10,25,47,0.34) 0%, rgba(10,25,47,0.62) 100%)',
            }}
          />
          {book.cover_url ? (
            <div className="book-card__cover-wrapper" style={{ height: 240, width: 'auto', aspectRatio: '2/3', margin: '0 auto', position: 'relative', zIndex: 1, boxShadow: '0 22px 44px rgba(0,0,0,0.45)' }}>
              <img
                src={book.cover_url}
                alt={title}
                className="book-card__cover"
                style={isOutOfStock ? { filter: 'grayscale(0.5)', opacity: 0.85 } : undefined}
              />
              <div className="book-card__spine" />
            </div>
          ) : (
            <div className="book-card__cover-wrapper" style={{ height: 240, width: 'auto', aspectRatio: '2/3', margin: '0 auto', position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, boxShadow: '0 22px 44px rgba(0,0,0,0.45)' }}>
              <Books size={46} weight="duotone" color="rgba(255,255,255,0.45)" />
              <div className="book-card__spine" />
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: '20px 16px 0' }}>
          {/* Category reads as an eyebrow above the title, so the eye lands on
              the title first rather than on a label-and-value line. */}
          {book.category && (
            <p style={{
              fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--blue-500)', marginBottom: 6,
            }}>
              {getCategoryLabel(book.category, lang)}
            </p>
          )}
          <h1 style={{ fontSize: 24, lineHeight: 1.2, marginBottom: 6, letterSpacing: '-0.01em' }}>{title}</h1>
          <p style={{ fontSize: 14, color: 'var(--text-2)', fontWeight: 600, marginBottom: 16 }}>
            {author}
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
                {t('outOfStock')}
              </span>
            )}
          </div>
          {!isOutOfStock && book.price && book.price >= 10000 && (
            <div style={{ marginBottom: 20 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, background: 'var(--discount)', color: '#fff', padding: '4px 8px', borderRadius: 6, fontWeight: 700 }}>
                {t('wholesaleOffer')}
              </span>
            </div>
          )}

          {/* Description */}
          {desc && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                {t('desc')}
              </p>
              <p style={{ fontSize: 15, lineHeight: 1.72, color: 'var(--text-2)' }}>
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

          {/* Save for later — the decision usually happens on this screen, so
              the action belongs here and not only in the catalogue grid. */}
          <button
            type="button"
            onClick={() => { haptic('light'); toggle(book.id); }}
            aria-pressed={isSaved(book.id)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '13px', marginBottom: 12,
              borderRadius: 'var(--radius-md)', cursor: 'pointer',
              fontSize: 15, fontWeight: 800,
              background: isSaved(book.id) ? '#FFF5F5' : 'var(--surface-2)',
              color: isSaved(book.id) ? '#C53030' : 'var(--text-1)',
              border: `1.5px solid ${isSaved(book.id) ? '#FEB2B2' : 'transparent'}`,
            }}
          >
            <Heart size={18} weight={isSaved(book.id) ? 'fill' : 'bold'} />
            {isSaved(book.id) ? t('saved') : t('save')}
          </button>

          {/* PDF excerpt */}
          {book.excerpt_url && (
            <a
              href={book.excerpt_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{ textDecoration: 'none', marginBottom: 12 }}
            >
              <FileText size={16} weight="duotone" /> {t('excerpt')}
            </a>
          )}

        </div>
      </div>

      <div style={{ height: 168 }} /> {/* Scroll clearance for the fixed buy bar + nav */}

      {/* Fixed buy button */}
      {book.price && (
        <div style={{
          position: 'fixed', bottom: 0,
          left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 480,
          // Clear the floating bottom nav (approx 76px tall) instead of sitting under it.
          padding: '16px 16px calc(92px + env(safe-area-inset-bottom, 0px))',
          background: 'linear-gradient(to top, var(--bg) 85%, transparent)',
          zIndex: 99,
        }}>
          <div style={{ display: 'flex', gap: 10 }}>
            {/* Secondary: add and stay on the page. */}
            <motion.button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              whileTap={isOutOfStock ? {} : { scale: 0.97, y: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              aria-label={inCart ? t('viewCart') : t('addToCart')}
              style={{
                flex: '0 0 auto', minWidth: 104, whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '14px', borderRadius: 14,
                background: 'var(--surface)',
                border: '1.5px solid ' + (inCart ? 'var(--success)' : 'var(--blue-500)'),
                color: inCart ? 'var(--success)' : 'var(--blue-500)',
                fontSize: 14, fontWeight: 800,
                cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                opacity: isOutOfStock ? 0.5 : 1,
              }}
            >
              {inCart ? <Check size={16} weight="bold" /> : <ShoppingCart size={16} weight="bold" />}
              {inCart ? t('viewCart') : t('addToCart')}
            </motion.button>

            <motion.button
              className="btn-primary"
              onClick={handleBuy}
              disabled={isOutOfStock}
              whileTap={isOutOfStock ? {} : { scale: 0.97, y: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              style={isOutOfStock
                ? { flex: 1, minWidth: 0, whiteSpace: 'nowrap', fontSize: 14, background: 'var(--surface-2)', color: 'var(--text-3)', cursor: 'not-allowed' }
                : { flex: 1, minWidth: 0, whiteSpace: 'nowrap', fontSize: 14 }}
            >
              {isOutOfStock
                ? t('outOfStock')
                : inCart
                ? (lang === 'ru' ? 'Заказать' : lang === 'en' ? 'Order' : 'Buyurtma')
                : t('buy')} {!isOutOfStock && <>&nbsp;·&nbsp; {formatPrice(orderTotal)}</>}
            </motion.button>
          </div>
        </div>
      )}

      {showSheet && (
        <CheckoutSheet
          book={book}
          lang={lang}
          onClose={() => setShowSheet(false)}
          onAddMore={() => { setShowSheet(false); navigate('/catalog'); }}
        />
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
