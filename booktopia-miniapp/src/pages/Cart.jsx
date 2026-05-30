import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useLang } from '../context/LangContext';
import { formatPrice, haptic } from '../lib/utils';
import CheckoutSheet from '../components/CheckoutSheet';
import PageTransition from '../components/PageTransition';
import { ShoppingCart } from '@phosphor-icons/react';

const T = {
  title:      { uz: 'Savat',           ru: 'Корзина',    en: 'Cart' },
  empty:      { uz: 'Savat bo\'sh',    ru: 'Корзина пуста', en: 'Cart is empty' },
  emptyDesc:  { uz: 'Katalogdan biror kitob tanlang', ru: 'Выберите книги из каталога', en: 'Pick some books from the catalog' },
  total:      { uz: 'Jami:',           ru: 'Итого:',     en: 'Total:' },
  checkout:   { uz: '🛒 Buyurtma berish', ru: '🛒 Оформить', en: '🛒 Place order' },
  clear:      { uz: 'Tozalash',        ru: 'Очистить',   en: 'Clear' },
  remove:     { uz: 'O\'chirish',      ru: 'Удалить',    en: 'Remove' },
  browse:     { uz: 'Katalogga o\'tish', ru: 'В каталог', en: 'Go to catalog' },
  addMore:    { uz: '+ Yana kitob qo\'shish', ru: '+ Добавить еще книгу', en: '+ Add another book' },
};

export default function Cart() {
  const navigate = useNavigate();
  const { items, removeItem, incrementQty, decrementQty, clearCart, totalPrice, totalCount } = useCart();
  const { lang } = useLang();
  const [showSheet, setShowSheet] = useState(false);

  const t = (k) => T[k]?.[lang] ?? T[k]?.uz;

  if (items.length === 0) {
    return (
      <PageTransition>
      <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70dvh' }}>
        <div className="empty-state">
          <div className="empty-state__icon"><ShoppingCart size={56} weight="thin" color="var(--text-3)" /></div>
          <h2 className="empty-state__title">{t('empty')}</h2>
          <p className="empty-state__desc">{t('emptyDesc')}</p>
          <Link to="/catalog" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ marginTop: 8 }}>{t('browse')}</button>
          </Link>
        </div>
      </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
    <>
      <div className="page">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px' }}>
          <h1 style={{ fontSize: 22 }}>{t('title')} ({totalCount})</h1>
          <button
            onClick={() => { haptic('light'); clearCart(); }}
            style={{ border: 'none', background: 'none', color: 'var(--discount)', fontFamily: 'Nunito, sans-serif', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            {t('clear')}
          </button>
        </div>

        {/* Items */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
          {items.map(item => (
            <SwipeableCartItem
              key={item.id}
              item={item}
              lang={lang}
              onRemove={() => { haptic('light'); removeItem(item.id); }}
              onQtyUp={() => { haptic('light'); incrementQty(item.id); }}
              onQtyDown={() => { haptic('light'); decrementQty(item.id); }}
            />
          ))}
        </div>

        {/* Summary */}
        <div style={{ padding: '16px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-2)' }}>{t('total')}</span>
          <span className="price" style={{ fontSize: 22, color: 'var(--blue-500)' }}>{formatPrice(totalPrice)}</span>
        </div>

        <div style={{ padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <motion.button
            className="btn-primary"
            onClick={() => { haptic('medium'); setShowSheet(true); }}
            whileTap={{ scale: 0.97, y: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            {t('checkout')}
          </motion.button>
          
          <motion.button
            onClick={() => { haptic('light'); navigate('/catalog'); }}
            whileTap={{ scale: 0.97 }}
            style={{
              padding: '12px',
              background: 'var(--surface-2)',
              color: 'var(--text-1)',
              border: 'none',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            {t('addMore')}
          </motion.button>
        </div>
      </div>

        {showSheet && <CheckoutSheet lang={lang} onClose={() => setShowSheet(false)} />}
    </>
    </PageTransition>
  );
}

// ── Swipeable Cart Item (iOS-style swipe-to-delete) ────────────────────────────
function SwipeableCartItem({ item, lang, onRemove, onQtyUp, onQtyDown }) {
  const title  = item[`title_${lang}`] || item.title  || '—';
  const author = item[`author_${lang}`] || item.author || '—';
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-80, -40], [1, 0]);
  const itemOpacity   = useTransform(x, [-80, 0], [0.6, 1]);

  const handleDragEnd = (_, info) => {
    if (info.offset.x < -70) {
      haptic('warning');
      // Snap to reveal delete button
      animate(x, -80, { type: 'spring', stiffness: 500, damping: 40 });
    } else {
      // Snap back
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 40 });
    }
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid var(--surface-2)' }}>
      {/* Red delete zone revealed under the item */}
      <motion.div
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0,
          width: 80,
          background: 'var(--discount)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: deleteOpacity,
        }}
      >
        <button
          onClick={onRemove}
          style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}
        >
          🗑
        </button>
      </motion.div>

      {/* The draggable item row */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -80, right: 0 }}
        dragElastic={{ left: 0.1, right: 0.1 }}
        onDragEnd={handleDragEnd}
        style={{ x, opacity: itemOpacity, touchAction: 'pan-y', background: 'var(--surface)' }}
      >
        <div style={{ display: 'flex', gap: 12, padding: '14px 16px', alignItems: 'center' }}>
          {/* Cover thumbnail */}
          {item.cover_url ? (
            <img src={item.cover_url} alt={title}
              style={{ width: 52, height: 72, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
          ) : (
            <div style={{ width: 52, height: 72, background: 'var(--blue-800)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>📚</div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3, marginBottom: 2 }}>{title}</p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>{author}</p>
            {item.price && (
              <p className="price" style={{ fontSize: 14, marginTop: 6 }}>
                {formatPrice(item.price * item.qty)}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <div className="qty-stepper">
              <button className="qty-btn" onClick={onQtyDown}>−</button>
              <span className="qty-num">{item.qty}</span>
              <button className="qty-btn" onClick={onQtyUp}>+</button>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>← swipe</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

