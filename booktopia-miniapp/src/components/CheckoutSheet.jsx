import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useCart } from '../context/CartContext';
import { formatPrice, haptic, tg } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { CreditCard, DeviceMobile, Money } from '@phosphor-icons/react';

const PAYMENT_OPTIONS = [
  {
    id: 'payme',
    icon: <CreditCard size={22} weight="duotone" color="#265999" />,
    label: { uz: 'Payme', ru: 'Payme', en: 'Payme' },
    sub: { uz: 'Onlayn to\'lov', ru: 'Онлайн оплата', en: 'Online payment' },
  },
  {
    id: 'click',
    icon: <DeviceMobile size={22} weight="duotone" color="#38A169" />,
    label: { uz: 'Click', ru: 'Click', en: 'Click' },
    sub: { uz: 'Onlayn to\'lov', ru: 'Онлайн оплата', en: 'Online payment' },
  },
  {
    id: 'cash',
    icon: <Money size={22} weight="duotone" color="#D5AD36" />,
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
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [payment, setPayment] = useState('payme');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

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

  const total = orderItems.reduce((s, i) => s + (i.price || 0) * i.qty, 0);
  const canSubmit = phone.trim().length >= 9 && !loading;

  const handleConfirm = async () => {
    if (!canSubmit) return;
    haptic('medium');
    setLoading(true);

    try {
      const tgUser = tg()?.initDataUnsafe?.user;

      await supabase.from('miniapp_orders').insert({
        telegram_user_id: tgUser?.id ?? null,
        telegram_username: tgUser?.username ?? null,
        full_name: name || tgUser?.first_name || 'Noma\'lum',
        phone: phone.trim(),
        items: orderItems.map(i => ({
          book_id: i.id,
          title: i.title,
          price: i.price,
          qty: i.qty,
        })),
        total_uzs: total,
        payment_method: payment,
        delivery_address: address || null,
        status: 'pending',
      });

      clearCart();
      haptic('success');
      setDone(true);
      
      // Fire confetti celebration
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#38A169', '#00CDFE', '#D5AD36']
      });
      
    } catch (err) {
      console.error('[Checkout]', err);
      setDone(true);
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
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
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
              /* ── Success state ── */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 350, damping: 26 }}
                className="success-screen"
                style={{ minHeight: 'auto', padding: '24px 0' }}
              >
                <div className="success-screen__icon" style={{ background: 'transparent' }}>
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
                </div>
                <h2 style={{ fontSize: 20 }}>{t('success')}</h2>
                <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.5 }}>{t('successDesc')}</p>
                <motion.button
                  className="btn-primary"
                  style={{ marginTop: 8 }}
                  onClick={onClose}
                  whileTap={{ scale: 0.96, y: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                >
                  {t('close')}
                </motion.button>
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
                  {orderItems.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                      <span style={{ color: 'var(--text-1)' }}>{item[`title_${lang}`] || item.title} × {item.qty}</span>
                      <span className="price" style={{ fontSize: 13 }}>{formatPrice((item.price || 0) * item.qty)}</span>
                    </div>
                  ))}
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
                  <input className="input" type="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder={t('phonePh')} autoFocus />
                </div>

                {/* Address */}
                <div className="input-group">
                  <label className="input-label">{t('address')}</label>
                  <input className="input" value={address} onChange={e => setAddress(e.target.value)} placeholder={t('addressPh')} />
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

                <motion.button
                  className="btn-primary"
                  onClick={handleConfirm}
                  disabled={!canSubmit}
                  whileTap={canSubmit ? { scale: 0.97, y: 1 } : {}}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                >
                  {loading ? '...' : t('confirm')}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}
