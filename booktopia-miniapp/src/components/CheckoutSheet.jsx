import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useCart } from '../context/CartContext';
import { formatPrice, haptic, tg, getEffectivePrice } from '../lib/utils';
import { Money } from '@phosphor-icons/react';

// ── Phone mask helper ─────────────────────────────────────────────────────────
// Always formats as +998 (XX) XXX-XX-XX, returns raw and display values
const maskPhone = (raw) => {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('998')) digits = digits.slice(3);
  digits = digits.slice(0, 9);
  let out = '+998 ';
  if (digits.length > 0) out += '(' + digits.slice(0, 2);
  if (digits.length >= 2) out += ') ' + digits.slice(2, 5);
  if (digits.length >= 5) out += '-' + digits.slice(5, 7);
  if (digits.length >= 7) out += '-' + digits.slice(7, 9);
  return { display: out, digits };
};

const PaymeLogo = () => (
  <svg width="34" height="20" viewBox="0 0 74 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16.9 12.3c0 2.2-1.3 3.6-3.7 3.6H9.1v3.8H5v-15h8.2c2.4 0 3.7 1.3 3.7 3.6 0 1.9-1 3.1-2.6 3.4 1.7.3 2.6 1.5 2.6 3.6zm-3.6 0c0-1.1-.6-1.6-2-1.6H9.1v3.2h2.2c1.4 0 2-.5 2-1.6zm-.6-5c0-1-.6-1.5-1.9-1.5H9.1v3h1.8c1.3 0 1.9-.5 1.9-1.5zM27 19.7h-4V18c-1.1 1.3-2.6 2-4.6 2-3.1 0-5.4-2.1-5.4-5.2 0-3.1 2.3-5.2 5.4-5.2 2 0 3.5.7 4.6 2V9.9h4v9.8zm-4.1-4.9c0-1.8-1.3-3.1-3.2-3.1-1.9 0-3.2 1.3-3.2 3.1 0 1.8 1.3 3.1 3.2 3.1 1.9 0 3.2-1.3 3.2-3.1zM36.1 12.2l-3.3-8h4.2l1.3 3.8c.4 1 .7 1.9.9 2.7.2-.8.5-1.7.9-2.7l1.3-3.8h4l-4.9 11.5c-1 2.3-2 3.1-3.6 3.1h-.8v-3.3h.3c.7 0 1.2-.4 1.5-1l.3-.7-2.1-4.6zM57 19.7h-4V11.2c0-1-.4-1.5-1.3-1.5-1.1 0-2 .8-2 2.3v7.7h-4V11.2c0-1-.4-1.5-1.3-1.5-1.1 0-2 .8-2 2.3v7.7h-4V9.9h4v1.8c1-1.3 2.5-2.1 4.2-2.1 1.5 0 2.8.6 3.6 1.8 1-1.2 2.5-1.8 4.1-1.8 2.2 0 3.7 1.3 3.7 3.8v6.3zM70.9 14.8H61.6c.3 1.9 1.6 3.2 3.6 3.2 1.5 0 2.5-.7 3.1-1.9h4c-.8 2.6-2.9 4-7.1 4-4.5 0-7.7-3.1-7.7-7.6 0-4.5 3-7.5 7.4-7.5 4.3 0 7 2.8 7 7.1 0 .9-.1 1.9-.1 2.7zm-4.1-2.4c-.2-1.7-1.3-2.9-3.2-2.9-1.9 0-3 1.2-3.3 2.9h6.5z" fill="#35B6CB"/>
  </svg>
);

const ClickLogo = () => (
  <svg width="40" height="14" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M28.4 20c0 7.8-5.7 14.1-14.2 14.1S0 27.8 0 20 5.7 5.9 14.2 5.9c3.9 0 7.4 1.5 10 3.9l-4.1 4.4C18.4 12.6 16.4 12 14.2 12c-4.4 0-8 3.6-8 8s3.6 8 8 8c2.2 0 4.2-.6 5.9-2.2l4.3 4.2zM32.2 33.6V.7h6.3v27.2h10.9v5.7H32.2zM52.3 33.6V6.4h6.3v27.2h-6.3zM94.6 20c0 7.8-5.7 14.1-14.2 14.1S66.2 27.8 66.2 20s5.7-14.1 14.2-14.1c3.9 0 7.4 1.5 10 3.9l-4.1 4.4c-1.7-1.6-3.7-2.2-5.9-2.2-4.4 0-8 3.6-8 8s3.6 8 8 8c2.2 0 4.2-.6 5.9-2.2l4.3 4.2zM98.9 33.6V.7h6.3v15.2l9.7-9.5h8.1L109.8 19l13.6 14.6h-8.4l-9.8-10.7-6.3 6.1v8.6h-6.3z" fill="#0073FF"/>
  </svg>
);

const PAYMENT_OPTIONS = [
  {
    id: 'payme',
    icon: <div style={{ background: '#fff', borderRadius: 4, width: 32, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05)' }}><PaymeLogo /></div>,
    label: { uz: 'Payme', ru: 'Payme', en: 'Payme' },
    sub: { uz: 'Onlayn to\'lov', ru: 'Онлайн оплата', en: 'Online payment' },
  },
  {
    id: 'click',
    icon: <div style={{ background: '#fff', borderRadius: 4, width: 32, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05)' }}><ClickLogo /></div>,
    label: { uz: 'Click', ru: 'Click', en: 'Click' },
    sub: { uz: 'Onlayn to\'lov', ru: 'Онлайн оплата', en: 'Online payment' },
  },
  {
    id: 'cash',
    icon: <div style={{ background: 'var(--surface-2)', borderRadius: 4, width: 32, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Money size={18} weight="duotone" color="#D5AD36" /></div>,
    label: { uz: 'Naqd pul', ru: 'Наличными', en: 'Cash' },
    sub: { uz: 'Yetkazib berganda', ru: 'При доставке', en: 'On delivery' },
  },
];

const T = {
  title:        { uz: 'Buyurtma berish',      ru: 'Оформить заказ',     en: 'Place Order' },
  name:         { uz: 'Ismingiz',             ru: 'Ваше имя',           en: 'Your name' },
  phone:        { uz: 'Telefon raqam *',      ru: 'Телефон *',          en: 'Phone *' },
  phonePh:      { uz: '+998 __ ___ __ __',   ru: '+998 __ ___ __ __', en: '+998 __ ___ __ __' },
  address:      { uz: 'Manzil (ixtiyoriy)',   ru: 'Адрес (необязательно)', en: 'Address (optional)' },
  addressPh:    { uz: 'Shahar, ko\'cha...',   ru: 'Город, улица...',    en: 'City, street...' },
  payment:      { uz: 'To\'lov usuli',        ru: 'Способ оплаты',      en: 'Payment method' },
  confirm:      { uz: '✓ Buyurtma berish',    ru: '✓ Оформить',         en: '✓ Place Order' },
  success:      { uz: 'Buyurtma qabul qilindi!', ru: 'Заказ принят!',   en: 'Order placed!' },
  successDesc:  { uz: 'Tez orada menejerimiz siz bilan bog\'lanadi.', ru: 'Наш менеджер свяжется с вами.', en: 'Our manager will contact you shortly.' },
  close:        { uz: 'Yopish',              ru: 'Закрыть',             en: 'Close' },
  total:        { uz: 'Jami:',               ru: 'Итого:',              en: 'Total:' },
};

// Spring configs
const sheetSpring   = { type: 'spring', stiffness: 420, damping: 38 };
const overlayFade   = { duration: 0.22 };

export default function CheckoutSheet({ book, lang = 'uz', onClose }) {
  const { items, totalPrice, clearCart, addItem } = useCart();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+998 ');
  const [address, setAddress] = useState('');
  const [payment, setPayment] = useState('payme');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [redirecting, setRedirecting] = useState(false); // true while opening payment gateway
  const [error, setError] = useState(null);
  const [geoCoords, setGeoCoords] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);

  // Pre-fill from Telegram user data
  useEffect(() => {
    const user = tg()?.initDataUnsafe?.user;
    if (user) {
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
      if (fullName) setName(fullName);
    }
  }, []);

  const orderItems = book
    ? (items.find(i => i.id === book.id) ? items : [...items, { ...book, qty: 1 }])
    : items;

  const total = orderItems.reduce((s, i) => s + getEffectivePrice(i.price, i.qty) * i.qty, 0);
  const phoneDigits = maskPhone(phone).digits;
  const canSubmit = phoneDigits.length === 9 && !loading;

  const handlePhoneChange = (e) => {
    const { display } = maskPhone(e.target.value);
    setPhone(display);
  };

  const handleConfirm = async () => {
    if (!canSubmit) return;
    haptic('medium');
    setLoading(true);
    setError(null);

    try {
      const tgUser = tg()?.initDataUnsafe?.user;

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: orderItems.map(i => ({
            book_id: i.id,
            title:   i.title,
            qty:     i.qty,
          })),
          name:              name || tgUser?.first_name || 'Noma\'lum',
          phone:             phone.replace(/\D/g, ''),
          address:           address || null,
          lat:               geoCoords?.lat ?? null,
          lng:               geoCoords?.lng ?? null,
          payment_method:    payment,
          telegram_user_id:  tgUser?.id ?? null,
          telegram_username: tgUser?.username ?? null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');

      clearCart();
      haptic('success');
      setDone(true);

      // ── For online payments: open the gateway then let user return ──────────
      const paymentUrl = data.payme_url || data.click_url;
      if (paymentUrl) {
        setRedirecting(true);
        // Short delay so the user sees the "Redirecting" state
        setTimeout(() => {
          // tg().openLink opens inside TG's in-app browser.
          // Falls back to window.open for desktop / web preview.
          if (tg()?.openLink) {
            tg().openLink(paymentUrl);
          } else {
            window.open(paymentUrl, '_blank');
          }
          setRedirecting(false);
        }, 600);
      } else {
        // Cash — just show confetti celebration
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#38A169', '#00CDFE', '#D5AD36'],
        });
      }

    } catch (err) {
      console.error('[Checkout]', err);
      setError(
        lang === 'ru' ? 'Xatolik yuz berdi. Qayta urining.' :
        lang === 'en' ? 'An error occurred. Please try again.' :
        'Xatolik yuz berdi. Qayta urining.'
      );
    } finally {
      setLoading(false);
    }
  };

  const t = (key) => T[key]?.[lang] ?? T[key]?.uz ?? key;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="sheet-overlay"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={overlayFade}
      />

      {/* Sheet — slides up with spring, drag handle to dismiss */}
      <motion.div
        className="sheet"
        initial={{ y: '100%', x: '-50%' }}
        animate={{ y: 0, x: '-50%' }}
        exit={{ y: '100%', x: '-50%' }}
        transition={sheetSpring}
      >
        {/* Drag handle — ONLY this element handles drag-to-dismiss */}
        <motion.div
          drag="y"
          dragConstraints={{ top: 0 }}
          dragElastic={{ top: 0, bottom: 0.5 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 100 || info.velocity.y > 500) {
              haptic('light');
              onClose();
            }
          }}
          style={{ touchAction: 'none', paddingTop: 12, paddingBottom: 4, cursor: 'grab' }}
        >
          <div className="sheet__handle" style={{ margin: '0 auto' }} />
        </motion.div>

        <div className="sheet__body">
          <AnimatePresence mode="wait">
            {done ? (
              /* ── Success / Redirecting state ── */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 350, damping: 26 }}
                className="success-screen"
                style={{ minHeight: 'auto', padding: '24px 0' }}
              >
                {redirecting ? (
                  /* ── Payment gateway redirect pending ── */
                  <>
                    <div style={{ fontSize: 52, textAlign: 'center', marginBottom: 12 }}>
                      {payment === 'payme' ? '🏦' : '💳'}
                    </div>
                    <h2 style={{ fontSize: 18, textAlign: 'center' }}>
                      {payment === 'payme' ? 'Payme' : 'Click'}
                      {lang === 'ru' ? ' открывается...' : lang === 'en' ? ' opening...' : ' ochilmoqda...'}
                    </h2>
                    <p style={{ color: 'var(--text-2)', fontSize: 13, textAlign: 'center', lineHeight: 1.5 }}>
                      {lang === 'ru'
                        ? 'Вы будете перенаправлены на страницу оплаты.'
                        : lang === 'en'
                        ? "You'll be redirected to the payment page."
                        : "To'lov sahifasiga yo'naltirilasiz."}
                    </p>
                    {/* Animated spinner */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        style={{
                          width: 28, height: 28,
                          border: '3px solid var(--surface-2)',
                          borderTopColor: 'var(--blue-500)',
                          borderRadius: '50%',
                        }}
                      />
                    </div>
                  </>
                ) : (
                  /* ── Order confirmed (cash, or after gateway return) ── */
                  <>
                    <div className="success-screen__icon" style={{ background: 'transparent' }}>
                      {payment === 'cash' ? (
                        <svg width="80" height="80" viewBox="0 0 52 52">
                          <motion.circle
                            cx="26" cy="26" r="25" fill="#EBF8F0"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                          />
                          <motion.path
                            d="M15 27.2l7.1 7.2 15.7-15.8"
                            fill="none" stroke="#38A169" strokeWidth="4" strokeLinecap="round"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
                          />
                        </svg>
                      ) : (
                        <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#F6E05E20', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 8, ease: "linear" }}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D69E2E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"></circle>
                              <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                          </motion.div>
                        </div>
                      )}
                    </div>
                    <h2 style={{ fontSize: 20, textAlign: 'center' }}>
                      {payment === 'cash'
                        ? t('success')
                        : lang === 'ru' ? 'Ожидание оплаты...' : lang === 'en' ? 'Awaiting payment...' : 'To\'lov kutilmoqda...'}
                    </h2>
                    <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.5, textAlign: 'center' }}>
                      {payment === 'cash'
                        ? t('successDesc')
                        : lang === 'ru'
                        ? 'Пожалуйста, завершите оплату на открывшейся странице. Статус заказа обновится автоматически.'
                        : lang === 'en'
                        ? 'Please complete the payment on the opened page. The order status will update automatically.'
                        : "Iltimos, ochilgan sahifada to'lovni amalga oshiring. To'lovdan so'ng buyurtma holati yangilanadi."}
                    </p>
                    <motion.button
                      className="btn-primary"
                      style={{ marginTop: 8 }}
                      onClick={onClose}
                      whileTap={{ scale: 0.96, y: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                      {t('close')}
                    </motion.button>
                  </>
                )}
              </motion.div>
            ) : (
              /* ── Form ── */
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                <h2 style={{ fontSize: 18, marginBottom: 4 }}>{t('title')}</h2>

                {/* Order summary */}
                <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {orderItems.map(item => {
                    const price = getEffectivePrice(item.price, item.qty);
                    return (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                        <span style={{ color: 'var(--text-1)' }}>{item[`title_${lang}`] || item.title} × {item.qty}</span>
                        <span className="price" style={{ fontSize: 13 }}>{formatPrice((price || 0) * item.qty)}</span>
                      </div>
                    );
                  })}
                  {total > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #DDE3EC', fontWeight: 800 }}>
                      <span>{t('total')}</span>
                      <span className="price" style={{ color: 'var(--blue-500)' }}>{formatPrice(total)}</span>
                    </div>
                  )}
                </div>

                {/* Name */}
                <div className="input-group">
                  <label className="input-label">{t('name')}</label>
                  <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Ismoil Karimov" />
                </div>

                {/* Phone */}
                <div className="input-group">
                  <label className="input-label">{t('phone')}</label>
                  <input
                    className="input"
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="+998 (XX) XXX-XX-XX"
                    style={{
                      fontFamily: 'monospace',
                      letterSpacing: '0.04em',
                      borderColor: phoneDigits.length > 0 && phoneDigits.length < 9 ? 'var(--discount)' : undefined,
                    }}
                  />
                  {phoneDigits.length > 0 && phoneDigits.length < 9 && (
                    <p style={{ fontSize: 11, color: 'var(--discount)', marginTop: 4, fontWeight: 600 }}>
                      {9 - phoneDigits.length} ta raqam qoldi
                    </p>
                  )}
                </div>

                {/* Address + Geolocation */}
                <div className="input-group">
                  <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{t('address')}</span>
                    <motion.button
                      type="button"
                      onClick={async () => {
                        if (!navigator.geolocation) return;
                        setGeoLoading(true);
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            const { latitude: lat, longitude: lng } = pos.coords;
                            setGeoCoords({ lat, lng });
                            setAddress(`📍 GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
                            haptic('success');
                            setGeoLoading(false);
                          },
                          () => { setGeoLoading(false); haptic('error'); },
                          { timeout: 8000 }
                        );
                      }}
                      whileTap={{ scale: 0.9 }}
                      style={{
                        background: geoCoords ? '#EBF8F0' : 'var(--surface-2)',
                        border: 'none', borderRadius: 8, padding: '4px 10px',
                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        color: geoCoords ? '#38A169' : 'var(--text-2)',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      {geoLoading ? '⏳' : geoCoords ? '✅ GPS' : '📍 GPS olish'}
                    </motion.button>
                  </label>
                  <input className="input" value={address} onChange={e => { setAddress(e.target.value); if (!e.target.value.startsWith('📍 GPS')) setGeoCoords(null); }} placeholder={t('addressPh')} />
                </div>

                {/* Payment */}
                <div>
                  <p className="input-label" style={{ marginBottom: 8 }}>{t('payment')}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {PAYMENT_OPTIONS.map(opt => (
                      <motion.button
                        key={opt.id}
                        className={`pay-option${payment === opt.id ? ' selected' : ''}`}
                        onClick={() => { setPayment(opt.id); haptic('light'); }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      >
                        <span className="pay-option__icon">{opt.icon}</span>
                        <div>
                          <div className="pay-option__label">{opt.label[lang]}</div>
                          <div className="pay-option__sub">{opt.sub[lang]}</div>
                        </div>
                        {payment === opt.id && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            style={{ marginLeft: 'auto', color: 'var(--blue-500)' }}
                          >✓</motion.span>
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {error && (
                  <p style={{ fontSize: 12, color: 'var(--discount)', textAlign: 'center', fontWeight: 600 }}>
                    ⚠️ {error}
                  </p>
                )}

                <motion.button
                  className="btn-primary"
                  onClick={handleConfirm}
                  disabled={!canSubmit}
                  whileTap={canSubmit ? { scale: 0.97, y: 1 } : {}}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  style={{ opacity: canSubmit ? 1 : 0.5 }}
                >
                  {loading
                    ? (
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
                          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                          <line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
                          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                        </svg>
                        Yuborilmoqda...
                      </span>
                    )
                    : t('confirm')
                  }
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}
