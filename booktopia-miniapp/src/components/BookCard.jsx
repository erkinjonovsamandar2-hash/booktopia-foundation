import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { formatPrice, haptic } from '../lib/utils';
import PageTransition from './PageTransition';
import { ShoppingCart } from '@phosphor-icons/react';

const T = {
  addedToCart: { uz: 'Savatga qo\'shildi!', ru: 'Добавлено в корзину!', en: 'Added to cart!' },
  addedDesc:   { uz: 'Buyurtmani "Savat" bo\'limida rasmiylashtirishingiz mumkin.', ru: 'Вы можете оформить заказ в разделе "Корзина".', en: 'You can finish your order in the Cart tab.' },
  buy:         { uz: '🛒 Sotib olish',      ru: '🛒 Купить',           en: '🛒 Buy now' },
  noPrice:     { uz: 'Narx yo\'q',          ru: 'Цена не указана',     en: 'No price' },
};

export default function BookCard({ book, lang = 'uz', onNavigate, index = 0 }) {
  const { addItem } = useCart();

  const title  = book[`title_${lang}`]  || book.title  || '—';
  const author = book[`author_${lang}`] || book.author || '—';
  const price  = book.price;
  const isNew  = book.category === 'new' || book.featured;
  const isSoon = book.category === 'soon';

  const handleBuy = (e) => {
    e.stopPropagation();
    haptic('success');
    addItem(book);
    
    // Show Telegram popup if available
    if (window.Telegram?.WebApp?.showPopup) {
      window.Telegram.WebApp.showPopup({
        title: T.addedToCart[lang] || T.addedToCart.uz,
        message: T.addedDesc[lang] || T.addedDesc.uz,
        buttons: [{ type: 'ok' }]
      });
    } else {
      alert((T.addedToCart[lang] || T.addedToCart.uz) + "\n" + (T.addedDesc[lang] || T.addedDesc.uz));
    }
  };

  return (
    <>
      {/* Staggered fade-up on initial render */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28, delay: index * 0.06 }}
      >
        {/* Tap feedback: spring scale + slight y push */}
        <motion.div
          className="book-card"
          whileTap={{ scale: 0.96, y: 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          onClick={() => onNavigate?.(`/book/${book.id}`)}
        >
          {/* Cover */}
          <div className="book-card__cover-wrapper">
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
            <div className="book-card__spine" />
          </div>

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
              {!isSoon && price && (
                <button
                  className="book-card__btn-quick"
                  onClick={handleBuy}
                  aria-label="Savatga qo'shish"
                >
                  <ShoppingCart size={18} weight="bold" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
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
    <motion.button
      className="wish-btn"
      onClick={toggle}
      aria-label="Saqlash"
      whileTap={{ scale: 0.75 }}
      animate={liked ? { scale: [1, 1.3, 1] } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      <svg viewBox="0 0 24 24" fill={liked ? '#E53E3E' : 'none'} stroke={liked ? '#E53E3E' : '#9BAAB8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </motion.button>
  );
}
