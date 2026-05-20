import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useLang } from '../context/LangContext';
import { formatPrice, haptic } from '../lib/utils';
import CheckoutSheet from '../components/CheckoutSheet';

const T = {
  title:      { uz: 'Savat',           ru: 'Корзина',    en: 'Cart' },
  empty:      { uz: 'Savat bo\'sh',    ru: 'Корзина пуста', en: 'Cart is empty' },
  emptyDesc:  { uz: 'Katalogdan biror kitob tanlang', ru: 'Выберите книги из каталога', en: 'Pick some books from the catalog' },
  total:      { uz: 'Jami:',           ru: 'Итого:',     en: 'Total:' },
  checkout:   { uz: '🛒 Buyurtma berish', ru: '🛒 Оформить', en: '🛒 Place order' },
  clear:      { uz: 'Tozalash',        ru: 'Очистить',   en: 'Clear' },
  remove:     { uz: 'O\'chirish',      ru: 'Удалить',    en: 'Remove' },
  browse:     { uz: 'Katalogga o\'tish', ru: 'В каталог', en: 'Go to catalog' },
};

export default function Cart() {
  const { items, removeItem, updateQty, clearCart, totalPrice, totalCount } = useCart();
  const { lang } = useLang();
  const [showSheet, setShowSheet] = useState(false);

  const t = (k) => T[k]?.[lang] ?? T[k]?.uz;

  if (items.length === 0) {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70dvh' }}>
        <div className="empty-state">
          <span className="empty-state__icon">🛒</span>
          <h2 className="empty-state__title">{t('empty')}</h2>
          <p className="empty-state__desc">{t('emptyDesc')}</p>
          <Link to="/catalog" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ marginTop: 8 }}>{t('browse')}</button>
          </Link>
        </div>
      </div>
    );
  }

  return (
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--surface)' }}>
          {items.map(item => {
            const title = item[`title_${lang}`] || item.title || '—';
            const author = item[`author_${lang}`] || item.author || '—';
            return (
              <div key={item.id} style={{
                display: 'flex', gap: 12, padding: '14px 16px',
                borderBottom: '1px solid var(--surface-2)',
                alignItems: 'center',
              }}>
                {/* Cover */}
                {item.cover_url ? (
                  <img src={item.cover_url} alt={title} style={{ width: 52, height: 72, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
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
                  {/* Qty stepper */}
                  <div className="qty-stepper">
                    <button className="qty-btn" onClick={() => { haptic('light'); updateQty(item.id, item.qty - 1); }}>−</button>
                    <span className="qty-num">{item.qty}</span>
                    <button className="qty-btn" onClick={() => { haptic('light'); updateQty(item.id, item.qty + 1); }}>+</button>
                  </div>
                  {/* Remove */}
                  <button
                    onClick={() => { haptic('light'); removeItem(item.id); }}
                    style={{ border: 'none', background: 'none', color: 'var(--text-3)', fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: 'Nunito, sans-serif', fontWeight: 600 }}
                  >
                    {t('remove')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div style={{ padding: '16px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-2)' }}>{t('total')}</span>
          <span className="price" style={{ fontSize: 22, color: 'var(--blue-500)' }}>{formatPrice(totalPrice)}</span>
        </div>

        <div style={{ padding: '16px 16px 8px' }}>
          <button className="btn-primary" onClick={() => { haptic('medium'); setShowSheet(true); }}>
            {t('checkout')}
          </button>
        </div>
      </div>

      {showSheet && <CheckoutSheet lang={lang} onClose={() => setShowSheet(false)} />}
    </>
  );
}
