import { motion } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useWishlist } from '../context/WishlistContext';
import { formatPrice, haptic } from '../lib/utils';
import { ShoppingCart, Books } from '@phosphor-icons/react';

const T = {
  addedToCart: { uz: 'Savatga qo\'shildi!', ru: 'Добавлено в корзину!', en: 'Added to cart!' },
  addedDesc:   { uz: 'Buyurtmani "Savat" bo\'limida rasmiylashtirishingiz mumkin.', ru: 'Вы можете оформить заказ в разделе "Корзина".', en: 'You can finish your order in the Cart tab.' },
  buy:         { uz: '🛒 Sotib olish',      ru: '🛒 Купить',           en: '🛒 Buy now' },
  noPrice:     { uz: 'Narx yo\'q',          ru: 'Цена не указана',     en: 'No price' },
  outOfStock:  { uz: 'Tugagan',             ru: 'Закончилось',         en: 'Out of stock' },
  addToCart:   { uz: 'Savatga qo\'shish',   ru: 'Добавить в корзину',  en: 'Add to cart' },
  save:        { uz: 'Saqlanganlarga qo\'shish', ru: 'Добавить в избранное',  en: 'Add to wishlist' },
  unsave:      { uz: 'Saqlanganlardan olib tashlash', ru: 'Убрать из избранного', en: 'Remove from wishlist' },
  saved:       { uz: 'Saqlanganlarga qo\'shildi', ru: 'Добавлено в избранное', en: 'Added to wishlist' },
  savedDesc:   { uz: 'Profil > Saqlanganlar bo\'limida ko\'rishingiz mumkin.',
                 ru: 'Найдёте в разделе Профиль > Избранное.',
                 en: 'Find it under Profile > Wishlist.' },
  unsaved:     { uz: 'Saqlanganlardan olib tashlandi', ru: 'Убрано из избранного', en: 'Removed from wishlist' },
  openBook:    { uz: 'Kitobni ochish',      ru: 'Открыть книгу',       en: 'Open book' },
  soon:        { uz: 'Tez kunda',           ru: 'Скоро',               en: 'Coming soon' },
  isNew:       { uz: 'Yangi',               ru: 'Новинка',             en: 'New' },
};

export default function BookCard({ book, lang = 'uz', onNavigate, index = 0 }) {
  const { addItem } = useCart();
  const { showToast } = useToast();

  const t = (k) => T[k]?.[lang] ?? T[k]?.uz;

  const title  = book[`title_${lang}`]  || book.title  || '—';
  const author = book[`author_${lang}`] || book.author || '—';
  const price  = book.price;
  const isNew  = !!book.is_new;
  const isSoon = !!book.coming_soon;
  const isOutOfStock = book.stock === 0 || (book.stock != null && book.stock <= 0);

  const handleBuy = (e) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    haptic('success');
    addItem(book);
    showToast(t('addedToCart'), t('addedDesc'));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28, delay: index * 0.06 }}
    >
      {/* role/tabIndex/keydown rather than a real <button>, so the wishlist and
          quick-add buttons can live inside the card without nesting buttons.
          Still focusable and announced, which a bare <div onClick> was not. */}
      <motion.div
        role="button"
        tabIndex={0}
        className="book-card"
        whileTap={{ scale: 0.96, y: 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        onClick={() => onNavigate?.(`/book/${book.id}`)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onNavigate?.(`/book/${book.id}`);
          }
        }}
        aria-label={`${title} — ${author}${price ? `, ${formatPrice(price)}` : ''}`}
      >
        {/* Cover */}
        <div className="book-card__cover-wrapper">
          {book.cover_url ? (
            <img
              className="book-card__cover"
              src={book.cover_url}
              alt=""
              loading="lazy"
              decoding="async"
              width="300"
              height="400"
              style={{
                // The wrapper crops to 2/3; without a focal point a centred
                // crop cuts the title off covers that carry it near the top.
                objectPosition: `${book.img_focus_x ?? 50}% ${book.img_focus_y ?? 20}%`,
                ...(isOutOfStock ? { filter: 'grayscale(0.5)', opacity: 0.85 } : null),
              }}
            />
          ) : (
            <div className="book-card__cover-placeholder" aria-hidden="true">
              <Books size={30} weight="duotone" color="var(--text-3)" />
            </div>
          )}
          <div className="book-card__spine" />

          {/* On the cover, not beside it — the control belongs to the book. */}
          <WishBtn bookId={book.id} title={title} t={t} showToast={showToast} />
        </div>

        {/* Badge */}
        {isOutOfStock ? (
          <span className="badge badge--out-of-stock">{t('outOfStock')}</span>
        ) : (
          <>
            {isNew && !isSoon && <span className="badge badge--new">{t('isNew')}</span>}
            {isSoon && <span className="badge badge--soon">{t('soon')}</span>}
          </>
        )}

        {/* Body */}
        <div className="book-card__body">
          <p className="book-card__title">{title}</p>
          <p className="book-card__author">{author}</p>
          <div className="book-card__price-row">
            {price
              ? <span className="price" style={{ fontSize: 14 }}>{formatPrice(price)}</span>
              : <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{t('noPrice')}</span>
            }
            {!isSoon && !isOutOfStock && price && (
              <button
                type="button"
                className="book-card__btn-quick"
                onClick={handleBuy}
                aria-label={`${t('addToCart')}: ${title}`}
              >
                <ShoppingCart size={18} weight="bold" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Wishlist heart button ───────────────────────────────────────────────────────
function WishBtn({ bookId, title, t, showToast }) {
  const { isSaved, toggle } = useWishlist();
  const liked = isSaved(bookId);

  const onToggle = (e) => {
    e.stopPropagation();
    haptic('light');
    toggle(bookId);
    // A heart on a cover is ambiguous on its own — say what it did and where
    // the book went, the first time as much as every time.
    if (!liked) showToast?.(t('saved'), t('savedDesc'), 'success');
    else showToast?.(t('unsaved'), null, 'info');
  };

  return (
    <motion.button
      type="button"
      className={`wish-btn${liked ? ' wish-btn--on' : ''}`}
      onClick={onToggle}
      aria-label={`${liked ? t('unsave') : t('save')}: ${title}`}
      aria-pressed={liked}
      whileTap={{ scale: 0.75 }}
      animate={liked ? { scale: [1, 1.3, 1] } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" fill={liked ? '#E53E3E' : 'none'} stroke={liked ? '#E53E3E' : '#7A8A99'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </motion.button>
  );
}
