import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { formatPrice, haptic, tg, getEffectivePrice } from '../lib/utils';

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

// Brand marks — the same files the main site serves from /public.
const PaymeLogo = () => (
  <img src="/payme-logo.png" alt="" style={{ maxWidth: 34, maxHeight: 20, objectFit: 'contain', display: 'block' }} />
);

const ClickLogo = () => (
  <img src="/click-logo.png" alt="" style={{ maxWidth: 40, maxHeight: 18, objectFit: 'contain', display: 'block' }} />
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
    sub: { uz: 'Tez kunda', ru: 'Скоро', en: 'Coming soon' },
    // Click has no payment-confirmation webhook yet, so an order paid through
    // it could never be marked paid. Shown but not selectable until that lands.
    comingSoon: true,
  },
];

const T = {
  title:        { uz: 'Buyurtma berish',      ru: 'Оформить заказ',     en: 'Place Order' },
  name:         { uz: 'Ismingiz',             ru: 'Ваше имя',           en: 'Your name' },
  phone:        { uz: 'Telefon raqam *',      ru: 'Телефон *',          en: 'Phone *' },
  phonePh:      { uz: '+998 __ ___ __ __',   ru: '+998 __ ___ __ __', en: '+998 __ ___ __ __' },
  address:      { uz: 'Pochta manzilingiz *', ru: 'Ваш почтовый адрес *', en: 'Your postal address *' },
  addressHint:  { uz: 'Viloyat, tuman va pochta boʻlimingizni yozing — kitobni oʻsha boʻlimdan olasiz.',
                  ru: 'Укажите область, район и ваше почтовое отделение — книгу заберёте там.',
                  en: 'Give your region, district and post office — you collect the books there.' },
  gpsBtn:       { uz: 'Joylashuvni yuborish', ru: 'Отправить геолокацию', en: 'Share location' },
  gpsAttached:  { uz: 'Joylashuv biriktirildi — eng yaqin pochta boʻlimini aniqlashga yordam beradi',
                  ru: 'Геолокация прикреплена — поможет определить ближайшее отделение',
                  en: 'Location attached — helps us pick your nearest post office' },
  gpsCheck:     { uz: 'Xaritada tekshirish', ru: 'Проверить на карте', en: 'Check on map' },
  gpsRemove:    { uz: 'Olib tashlash',      ru: 'Убрать',            en: 'Remove' },
  gpsBusy:      { uz: 'Aniqlanmoqda...',      ru: 'Определяем...',        en: 'Locating...' },
  gpsDone:      { uz: 'Joylashuv qoʻshildi', ru: 'Геолокация добавлена', en: 'Location added' },
  addressPh:    { uz: 'Masalan: Fargʻona sh., 12-pochta boʻlimi', ru: 'Например: г. Фергана, отделение №12', en: 'e.g. Fergana, post office 12' },
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
  const { items, markAwaitingPayment } = useCart();
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
  const [geoError, setGeoError] = useState(null);
  // One key per mounted sheet, regenerated after a failure so a genuine retry
  // is allowed but a double-tap is not.
  // Generated on first submit rather than during render (render must stay pure).
  const idempotencyKeyRef = useRef(null);

  const sheetRef = useRef(null);

  // The sheet is a modal: Escape closes it, and the hardware / Telegram back
  // gesture closes it instead of navigating the page away mid-order.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose?.(); } };
    document.addEventListener('keydown', onKey);

    window.history.pushState({ sheet: true }, '');
    const onPop = () => onClose?.();
    window.addEventListener('popstate', onPop);

    sheetRef.current?.focus?.();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('popstate', onPop);
      document.body.style.overflow = prevOverflow;
      // If the sheet closed by any route other than back, drop our history entry.
      if (window.history.state?.sheet) window.history.back();
    };
  }, [onClose]);

  // Pre-fill from Telegram user data
  // Telegram profile data is an external input; hydrate the form on mount.
  useEffect(() => {
    const user = tg()?.initDataUnsafe?.user;
    if (user) {
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (fullName) setName(fullName);
    }
  }, []);

  const orderItems = book
    ? (items.find(i => i.id === book.id) ? items : [...items, { ...book, qty: 1 }])
    : items;

  const hasOutOfStockItems = orderItems.some(i => i.stock === 0 || (i.stock != null && i.stock <= 0));
  const total = orderItems.reduce((s, i) => s + getEffectivePrice(i.price, i.qty) * i.qty, 0);
  const phoneDigits = maskPhone(phone).digits;
  // The server now requires a deliverable destination: a typed address or GPS.
  const hasDestination = Boolean(address.trim()) || Boolean(geoCoords);
  const canSubmit = phoneDigits.length === 9 && hasDestination && !loading && !hasOutOfStockItems;

  const handlePhoneChange = (e) => {
    const { display } = maskPhone(e.target.value);
    setPhone(display);
  };

  const handleConfirm = async () => {
    if (!canSubmit) return;
    if (hasOutOfStockItems) {
      setError(
        lang === 'ru' ? 'В вашем заказе есть закончившиеся книги.' :
        lang === 'en' ? 'Some items in your order are out of stock.' :
        'Buyurtmangizda zaxirada tugagan kitoblar bor.'
      );
      return;
    }
    haptic('medium');
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current =
        crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
    setLoading(true);
    setError(null);

    try {
      const tgUser = tg()?.initDataUnsafe?.user;

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Raw initData lets the server verify who is ordering instead of
          // trusting a client-supplied id. Absent outside Telegram.
          init_data:         tg()?.initData ?? null,
          // Stable per-attempt key so a retry cannot create a second order.
          idempotency_key:   idempotencyKeyRef.current,
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

      haptic('success');
      // Payment completes in another browser context; remember the order so the
      // miniapp can clear the cart when it regains focus.
      if (data.order_id) markAwaitingPayment(data.order_id);
      setDone(true);

      // ── Open the payment gateway, keep cart until paid ─────────────────
      const paymentUrl = data.payme_url || data.click_url;
      if (paymentUrl) {
        setRedirecting(true);
        // Open the payment page after a brief delay so user sees the state
        setTimeout(() => {
          if (tg()?.openLink) {
            tg().openLink(paymentUrl);
          } else {
            window.open(paymentUrl, '_blank');
          }
        }, 600);

        // Use visibilitychange to detect when user returns from payment page
        const handleReturn = () => {
          if (!document.hidden) {
            setRedirecting(false);
            document.removeEventListener('visibilitychange', handleReturn);
          }
        };
        document.addEventListener('visibilitychange', handleReturn);
        // Don't clear cart — it stays until PaymentReturn confirms payment
      }

    } catch (err) {
      console.error('[Checkout]', err);
      idempotencyKeyRef.current = null; // let a genuine retry mint a fresh key
      setError(
        lang === 'ru' ? 'Произошла ошибка. Попробуйте ещё раз.' :
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
        role="dialog"
        aria-modal="true"
        aria-label={t('title')}
        ref={sheetRef}
        tabIndex={-1}
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
                  /* ── Awaiting payment confirmation ── */
                  <>
                    <div className="success-screen__icon" style={{ background: 'transparent' }}>
                      <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#F6E05E20', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 8, ease: "linear" }}>
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D69E2E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>
                        </motion.div>
                      </div>
                    </div>
                    <h2 style={{ fontSize: 20, textAlign: 'center' }}>
                      {lang === 'ru' ? 'Ожидание оплаты...' : lang === 'en' ? 'Awaiting payment...' : 'To\'lov kutilmoqda...'}
                    </h2>
                    <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.5, textAlign: 'center' }}>
                      {lang === 'ru'
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
                style={{ display: 'flex', flexDirection: 'column', gap: 16, pointerEvents: loading ? 'none' : 'auto', opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s' }}
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
                  <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span>{t('address')}</span>
                    <motion.button
                      type="button"
                      onClick={async () => {
                        if (!navigator.geolocation) {
                          setGeoError(
                            lang === 'ru' ? 'Геолокация недоступна в этом браузере.'
                            : lang === 'en' ? 'Geolocation is not available in this browser.'
                            : 'Bu brauzerda joylashuv mavjud emas.'
                          );
                          return;
                        }
                        setGeoLoading(true);
                        setGeoError(null);
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            const { latitude: lat, longitude: lng } = pos.coords;
                            setGeoCoords({ lat, lng });
                            setGeoError(null);
                            // The address field stays human-readable: a courier
                            // needs a street and a landmark, not coordinates.
                            // The point is attached separately.
                            haptic('success');
                            setGeoLoading(false);
                          },
                          (err) => {
                            setGeoLoading(false);
                            haptic('error');
                            // Denial used to be a silent no-op with only a haptic.
                            setGeoError(
                              err?.code === 1
                                ? (lang === 'ru' ? 'Доступ к геолокации запрещён. Введите адрес вручную.'
                                  : lang === 'en' ? 'Location permission denied. Please type your address.'
                                  : 'Joylashuvga ruxsat berilmadi. Manzilni qo\'lda kiriting.')
                                : (lang === 'ru' ? 'Не удалось определить местоположение.'
                                  : lang === 'en' ? 'Could not determine your location.'
                                  : 'Joylashuvni aniqlab bo\'lmadi.')
                            );
                          },
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
                      {geoLoading ? t('gpsBusy') : geoCoords ? `✓ ${t('gpsDone')}` : `📍 ${t('gpsBtn')}`}
                    </motion.button>
                  </label>
                  <input className="input" value={address} onChange={e => setAddress(e.target.value)} placeholder={t('addressPh')} />
                  {geoCoords && (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                      marginTop: 6, padding: '8px 10px', borderRadius: 10,
                      background: '#EBF8F0', border: '1px solid #C6F6D5',
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#276749' }}>
                        ✓ {t('gpsAttached')}
                      </span>
                      <span style={{ display: 'flex', gap: 10 }}>
                        <a
                          href={`https://maps.google.com/?q=${geoCoords.lat},${geoCoords.lng}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 12, fontWeight: 700, color: '#276749' }}
                        >
                          {t('gpsCheck')}
                        </a>
                        <button
                          type="button"
                          onClick={() => setGeoCoords(null)}
                          style={{ border: 'none', background: 'none', fontSize: 12, fontWeight: 700, color: 'var(--text-2)', cursor: 'pointer' }}
                        >
                          {t('gpsRemove')}
                        </button>
                      </span>
                    </div>
                  )}
                  <p style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.4 }}>{t('addressHint')}</p>
                  {geoError && (
                    <p role="alert" style={{ fontSize: 11, color: 'var(--discount)', marginTop: 4, fontWeight: 600 }}>{geoError}</p>
                  )}
                </div>

                {/* Payment */}
                <div>
                  <p className="input-label" style={{ marginBottom: 8 }}>{t('payment')}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {PAYMENT_OPTIONS.map(opt => (
                      <motion.button
                        key={opt.id}
                        type="button"
                        className={`pay-option${payment === opt.id ? ' selected' : ''}`}
                        onClick={() => { if (opt.comingSoon) return; setPayment(opt.id); haptic('light'); }}
                        disabled={opt.comingSoon}
                        aria-disabled={opt.comingSoon || undefined}
                        whileTap={opt.comingSoon ? {} : { scale: 0.97 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        style={opt.comingSoon ? { opacity: 0.45, cursor: 'not-allowed', filter: 'grayscale(1)' } : undefined}
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
