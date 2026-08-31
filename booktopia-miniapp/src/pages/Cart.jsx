import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useLang } from '../context/LangContext';
import { useToast } from '../context/ToastContext';
import { formatPrice, haptic, getEffectivePrice } from '../lib/utils';
import CheckoutSheet from '../components/CheckoutSheet';
import PageTransition from '../components/PageTransition';
import { ShoppingCart, CheckCircle, Books, WarningCircle } from '@phosphor-icons/react';

const T = {
  title:      { uz: 'Savat',           ru: 'Корзина',    en: 'Cart' },
  empty:      { uz: 'Savat bo\'sh',    ru: 'Корзина пуста', en: 'Cart is empty' },
  emptyDesc:  { uz: 'Katalogdan biror kitob tanlang', ru: 'Выберите книги из каталога', en: 'Pick some books from the catalog' },
  total:      { uz: 'Jami:',           ru: 'Итого:',     en: 'Total:' },
  checkout:   { uz: 'Buyurtma berish', ru: 'Оформить заказ', en: 'Place order' },
  clear:      { uz: 'Tozalash',        ru: 'Очистить',   en: 'Clear' },
  remove:     { uz: 'O\'chirish',      ru: 'Удалить',    en: 'Remove' },
  browse:     { uz: 'Katalogga o\'tish', ru: 'В каталог', en: 'Go to catalog' },
  addMore:    { uz: '+ Yana kitob qo\'shish', ru: '+ Добавить еще книгу', en: '+ Add another book' },
  outOfStock: { uz: 'Zaxirada tugagan', ru: 'Нет в наличии', en: 'Out of stock' },
  clearConfirm: { uz: 'Savatni tozalash?', ru: 'Очистить корзину?', en: 'Clear the cart?' },
  paidTitle:  { uz: 'To\'lov qabul qilindi', ru: 'Оплата получена', en: 'Payment received' },
  paidDesc:   { uz: 'Buyurtmangiz tasdiqlandi. Holatini Buyurtmalarim bo\'limida kuzating.',
                ru: 'Ваш заказ подтверждён. Статус — в разделе «Мои заказы».',
                en: 'Your order is confirmed. Track it under My Orders.' },
  paidCta:    { uz: 'Buyurtmalarim', ru: 'Мои заказы', en: 'My Orders' },
  cleared:    { uz: 'Savat tozalandi',  ru: 'Корзина очищена', en: 'Cart cleared' },
  cancel:     { uz: 'Bekor qilish',     ru: 'Отмена',          en: 'Cancel' },
  swipeHint:  { uz: 'suring',           ru: 'смахните',        en: 'swipe' },
  wholesale:  { uz: 'Ulgurji narx',     ru: 'Оптовая цена',    en: 'Wholesale price' },
  maxStock:   { uz: 'Zaxiradagi maksimal miqdor', ru: 'Максимум на складе', en: 'Maximum available' },
  updated:    { uz: 'Savat yangilandi', ru: 'Корзина обновлена', en: 'Cart updated' },
  decrease:   { uz: 'Kamaytirish',      ru: 'Уменьшить',       en: 'Decrease' },
  increase:   { uz: 'Ko\'paytirish',    ru: 'Увеличить',       en: 'Increase' },
};

export default function Cart() {
  const navigate = useNavigate();
  const { items, removeItem, incrementQty, decrementQty, clearCart, revalidate, atStockCeiling, totalPrice, totalCount, importNotice, dismissImportNotice, paidNotice, dismissPaidNotice } = useCart();
  const { showToast } = useToast();
  const { lang } = useLang();
  const [showSheet, setShowSheet] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const revalidatedRef = useRef(false);

  // The cart is a localStorage snapshot taken at add-time. Re-check price and
  // stock against the database once per visit so it cannot silently go stale.
  useEffect(() => {
    if (revalidatedRef.current) return;
    revalidatedRef.current = true;
    revalidate?.()
      .then((changes) => { if (changes) showToast(T.updated[lang] ?? T.updated.uz, null, 'info'); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (importNotice?.added > 0) {
      const msg = lang === 'ru'
        ? `Добавлено ${importNotice.added} кн. с сайта`
        : lang === 'en'
        ? `Added ${importNotice.added} book(s) from website`
        : `Veb-saytdan ${importNotice.added} ta kitob savatingizga o'tkazildi!`;
      showToast(msg, null, 'success');
      dismissImportNotice();
    }
  }, [importNotice, showToast, dismissImportNotice, lang]);

  const t = (k) => T[k]?.[lang] ?? T[k]?.uz;

  if (items.length === 0) {
    return (
      <PageTransition>
      <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70dvh' }}>
        {/* After paying, the customer lands back here on an empty cart. Without
            this the cart just silently emptied, with no confirmation anywhere. */}
        {paidNotice ? (
          <div className="empty-state" role="status">
            <div className="empty-state__icon">
              <CheckCircle size={64} weight="fill" color="var(--success, #38A169)" />
            </div>
            <h2 className="empty-state__title">{t('paidTitle')}</h2>
            <p className="empty-state__desc">{t('paidDesc')}</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                className="btn-primary"
                style={{ width: 'auto', padding: '10px 20px' }}
                onClick={() => { haptic('light'); dismissPaidNotice(); navigate('/orders'); }}
              >
                {t('paidCta')}
              </button>
              <button
                className="btn-secondary"
                style={{ width: 'auto', padding: '10px 20px' }}
                onClick={() => { dismissPaidNotice(); navigate('/catalog'); }}
              >
                {t('browse')}
              </button>
            </div>
          </div>
        ) : (
        <div className="empty-state">
          <div className="empty-state__icon"><ShoppingCart size={56} weight="thin" color="var(--text-3)" /></div>
          <h2 className="empty-state__title">{t('empty')}</h2>
          <p className="empty-state__desc">{t('emptyDesc')}</p>
          <Link to="/catalog" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ marginTop: 8 }}>{t('browse')}</button>
          </Link>
        </div>
        )}
      </div>
      </PageTransition>
    );
  }

  const hasOutOfStockItems = items.some(i => i.stock === 0 || (i.stock != null && i.stock <= 0));

  return (
    <PageTransition>
    <>
      <div className="page">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px' }}>
          <h1 style={{ fontSize: 22 }}>{t('title')} ({totalCount})</h1>
          {/* Clearing the cart used to be a single tap with no confirmation
              and no undo — it wiped a 1 900 000 so'm cart during QA. */}
          {confirmClear ? (
            <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={() => { haptic('warning'); clearCart(); setConfirmClear(false); showToast(t('cleared'), null, 'info'); }}
                style={{ border: 'none', background: 'var(--discount)', color: '#fff', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                {t('clear')}
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                style={{ border: 'none', background: 'var(--surface-2)', color: 'var(--text-1)', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                {t('cancel')}
              </button>
            </span>
          ) : (
            <button
              onClick={() => { haptic('light'); setConfirmClear(true); }}
              aria-label={t('clearConfirm')}
              style={{ border: 'none', background: 'none', color: 'var(--discount)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >
              {t('clear')}
            </button>
          )}
        </div>

        {hasOutOfStockItems && (
          <div style={{ margin: '0 16px 12px', padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 12, color: 'var(--discount)', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <WarningCircle size={17} weight="duotone" style={{ flexShrink: 0 }} />
            <span>{lang === 'ru' ? 'В корзине есть закончившиеся товары. Пожалуйста, удалите их.' : lang === 'en' ? 'Some items in your cart are out of stock. Please remove them.' : 'Savatda tugagan kitoblar bor. Iltimos, ularni o\'chiring.'}</span>
          </div>
        )}

        {/* Items */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
          {items.map((item, idx) => (
            <SwipeableCartItem
              key={item.id}
              item={item}
              lang={lang}
              showSwipeHint={idx === 0}
              onRemove={() => { haptic('light'); removeItem(item.id); }}
              onQtyUp={() => { haptic('light'); incrementQty(item.id); }}
              onQtyDown={() => { haptic('light'); decrementQty(item.id); }}
              atCeiling={atStockCeiling(item.id)}
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
            disabled={hasOutOfStockItems}
            whileTap={hasOutOfStockItems ? {} : { scale: 0.97, y: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            style={hasOutOfStockItems ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
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
function SwipeableCartItem({ item, lang, showSwipeHint, onRemove, onQtyUp, onQtyDown, atCeiling }) {
  const tt = (k) => T[k]?.[lang] ?? T[k]?.uz;
  const title  = item[`title_${lang}`] || item.title  || '—';
  const author = item[`author_${lang}`] || item.author || '—';
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-80, -40], [1, 0]);
  const itemOpacity   = useTransform(x, [-80, 0], [0.6, 1]);
  const pointerEvents = useTransform(x, [-50, -40], ['auto', 'none']);

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
          pointerEvents: pointerEvents,
          zIndex: 1,
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
        style={{ x, opacity: itemOpacity, touchAction: 'pan-y', background: 'var(--surface)', zIndex: 10, position: 'relative' }}
      >
        <div style={{ display: 'flex', gap: 12, padding: '14px 16px', alignItems: 'center' }}>
          {/* Cover thumbnail */}
          {item.cover_url ? (
            <img src={item.cover_url} alt={title}
              style={{ width: 52, height: 72, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
          ) : (
            <div style={{ width: 52, height: 72, background: 'var(--blue-800)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Books size={22} weight="duotone" color="rgba(255,255,255,0.5)" /></div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3, marginBottom: 2 }}>{title}</p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>{author}</p>
            {item.price && (
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <p className="price" style={{ fontSize: 14 }}>
                  {formatPrice(getEffectivePrice(item.price, item.qty) * item.qty)}
                </p>
                {item.qty >= 10 && (
                  <span style={{ fontSize: 11, textDecoration: 'line-through', color: 'var(--text-3)', fontWeight: 600 }}>
                    {formatPrice(item.price * item.qty)}
                  </span>
                )}
              </div>
            )}
            {item.qty >= 10 && (
              <span style={{ display: 'inline-block', fontSize: 10, background: 'var(--discount)', color: '#fff', padding: '2px 6px', borderRadius: 4, fontWeight: 700, marginTop: 4 }}>
                {tt('wholesale')}
              </span>
            )}
            {(item.stock === 0 || (item.stock != null && item.stock <= 0)) && (
              <span style={{ display: 'inline-block', fontSize: 10, background: 'var(--discount)', color: '#fff', padding: '2px 6px', borderRadius: 4, fontWeight: 700, marginTop: 4 }}>
                {T.outOfStock[lang] || T.outOfStock.uz}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <div className="qty-stepper">
              <button className="qty-btn" onClick={onQtyDown} aria-label={tt('decrease')}>−</button>
              <span className="qty-num">{item.qty}</span>
              {/* Quantity can no longer exceed available stock. */}
              <button
                className="qty-btn"
                onClick={onQtyUp}
                disabled={atCeiling}
                aria-label={atCeiling ? tt('maxStock') : tt('increase')}
                title={atCeiling ? tt('maxStock') : undefined}
                style={atCeiling ? { opacity: 0.35, cursor: 'not-allowed' } : undefined}
              >+</button>
            </div>
            {showSwipeHint && (
              <span style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600 }}>← {tt('swipeHint')}</span>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
