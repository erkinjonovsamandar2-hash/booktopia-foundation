import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { formatPrice, haptic } from '../lib/utils';
import CheckoutSheet from './CheckoutSheet';

const T = {
  addedToCart: { uz: 'Savatga qo\'shildi!', ru: 'Добавлено в корзину!', en: 'Added to cart!' },
  buy:         { uz: '🛒 Sotib olish',      ru: '🛒 Купить',           en: '🛒 Buy now' },
  noPrice:     { uz: 'Narx yo\'q',          ru: 'Цена не указана',     en: 'No price' },
};

export default function BookCard({ book, lang = 'uz', onNavigate }) {
  const { addItem } = useCart();
  const [showSheet, setShowSheet] = useState(false);

  const title  = book[`title_${lang}`]  || book.title  || '—';
  const author = book[`author_${lang}`] || book.author || '—';
  const price  = book.price;
  const isNew  = book.category === 'new' || book.featured;
  const isSoon = book.category === 'soon';

  const handleBuy = (e) => {
    e.stopPropagation();
    haptic('light');
    addItem(book);
    setShowSheet(true);
  };

  return (
    <>
      <div className="book-card" onClick={() => onNavigate?.(`/book/${book.id}`)}>
        {/* Cover */}
        {book.cover_url ? (
          <img
            className="book-card__cover"
            src={book.cover_url}
            alt={title}
            loading="lazy"
          />
        ) : (
          <div className="book-card__cover-placeholder">📚</div>
        )}

        {/* Badge */}
        {isNew && !isSoon && <span className="badge badge--new">New</span>}
        {isSoon && <span className="badge badge--soon">Tez kunda</span>}

        {/* Wishlist */}
        <WishBtn bookId={book.id} />

        {/* Body */}
        <div className="book-card__body">
          <p className="book-card__title">{title}</p>
          <p className="book-card__author">{author}</p>
          <div className="book-card__price-row">
            {price
              ? <span className="price" style={{ fontSize: 14 }}>{formatPrice(price)}</span>
              : <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{T.noPrice[lang]}</span>
            }
          </div>
          {!isSoon && price && (
            <button className="book-card__btn" onClick={handleBuy}>
              🛒 {lang === 'ru' ? 'Купить' : lang === 'en' ? 'Buy' : 'Sotib olish'}
            </button>
          )}
        </div>
      </div>

      {showSheet && (
        <CheckoutSheet
          book={book}
          lang={lang}
          onClose={() => setShowSheet(false)}
        />
      )}
    </>
  );
}

// ── Wishlist heart button ───────────────────────────────────────────────────────
function WishBtn({ bookId }) {
  const [liked, setLiked] = useState(() => {
    try {
      const w = JSON.parse(localStorage.getItem('booktopia_wish') ?? '[]');
      return w.includes(bookId);
    } catch { return false; }
  });

  const toggle = (e) => {
    e.stopPropagation();
    haptic('light');
    const next = !liked;
    setLiked(next);
    try {
      const w = JSON.parse(localStorage.getItem('booktopia_wish') ?? '[]');
      const updated = next ? [...w, bookId] : w.filter(id => id !== bookId);
      localStorage.setItem('booktopia_wish', JSON.stringify(updated));
    } catch {}
  };

  return (
    <button className="wish-btn" onClick={toggle} aria-label="Saqlash">
      <svg viewBox="0 0 24 24" fill={liked ? '#E53E3E' : 'none'} stroke={liked ? '#E53E3E' : '#9BAAB8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
