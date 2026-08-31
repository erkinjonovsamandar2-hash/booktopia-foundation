import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useLang } from '../context/LangContext';
import { formatPrice, tg, haptic } from '../lib/utils';
import PageTransition from '../components/PageTransition';
import LoadError from '../components/LoadError';
import { Package, ClockCounterClockwise, CheckCircle, Truck, XCircle, ArrowLeft, MapPin, CreditCard } from '@phosphor-icons/react';

// ── Status pipeline (matches miniapp_orders schema) ───────────────────────────
const ORDER_STEPS = [
  { key: 'pending',    label: { uz: 'Qabul',      ru: 'Принят',     en: 'Received' } },
  { key: 'approved',   label: { uz: 'Tasdiqlandi', ru: 'Подтверждён', en: 'Confirmed' } },
  { key: 'delivering', label: { uz: 'Yolda',       ru: 'В пути',     en: 'On the way' } },
  { key: 'delivered',  label: { uz: 'Yetdi',       ru: 'Доставлен',  en: 'Delivered' } },
];

const STATUS_META = {
  pending:    { color: '#D5AD36', bg: '#D5AD3618', Icon: ClockCounterClockwise, label: { uz: 'Kutilmoqda',     ru: 'Ожидается',    en: 'Pending'    } },
  approved:   { color: '#3182CE', bg: '#3182CE18', Icon: CheckCircle,           label: { uz: 'Qabul qilindi',  ru: 'Принят',       en: 'Approved'   } },
  delivering: { color: '#805AD5', bg: '#805AD518', Icon: Truck,                 label: { uz: 'Yetkazilmoqda',  ru: 'Доставляется', en: 'Delivering' } },
  delivered:  { color: '#38A169', bg: '#38A16918', Icon: CheckCircle,           label: { uz: 'Yetkazib berildi', ru: 'Доставлен',  en: 'Delivered'  } },
  cancelled:  { color: '#E53E3E', bg: '#E53E3E18', Icon: XCircle,               label: { uz: 'Bekor qilindi',  ru: 'Отменён',      en: 'Cancelled'  } },
};

const T = {
  title:       { uz: 'Buyurtmalarim',        ru: 'Мои заказы',          en: 'My Orders' },
  empty:       { uz: 'Buyurtmalar yo\'q',     ru: 'Нет заказов',          en: 'No orders yet' },
  emptyDesc:   { uz: 'Katalogdan kitob tanlang va buyurtma bering', ru: 'Выберите книгу из каталога', en: 'Choose a book from the catalog' },
  catalogBtn:  { uz: 'Katalogga o\'tish',     ru: 'В каталог',            en: 'Go to catalog' },
  orderNum:    { uz: 'Buyurtma',              ru: 'Заказ',                en: 'Order' },
  total:       { uz: 'Jami',                 ru: 'Итого',                en: 'Total' },
  items:       { uz: 'kitob',                ru: 'кн.',                  en: 'book(s)' },
  noTg:        { uz: 'Telegram orqali kiring', ru: 'Войдите через Telegram', en: 'Open via Telegram' },
  noTgDesc:    { uz: 'Buyurtmalarni ko\'rish uchun Telegram Mini App orqali oching', ru: 'Откройте через Telegram Mini App', en: 'Open via Telegram to see orders' },
  collapse:    { uz: 'Yopish',               ru: 'Свернуть',             en: 'Collapse' },
};

const formatDate = (iso, lang) => {
  if (!iso) return '';
  const d = new Date(iso);
  const locale = lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-GB' : 'uz-UZ';
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
};

export default function Orders() {
  const navigate = useNavigate();
  const { lang } = useLang();

  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [noTg, setNoTg]       = useState(false);
  const [error, setError]     = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const t = (k) => T[k]?.[lang] ?? T[k]?.uz ?? k;

  useEffect(() => {
    const load = async () => {
      const userId = tg()?.initDataUnsafe?.user?.id;
      if (!userId) {
        setNoTg(true);
        setLoading(false);
        return;
      }

      try {
        // Reads go through a SECURITY DEFINER RPC. Direct table access is
        // closed by RLS, so the anon key can no longer enumerate every order.
        const { data, error: err } = await supabase.rpc('get_my_orders', {
          p_telegram_user_id: userId,
        });
        if (err) throw err;
        setOrders(data ?? []);
      } catch (err) {
        // A failed request must not render as "you have no orders".
        console.error('[Orders]', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [reloadKey]);

  // Order status is changed by an admin elsewhere; refresh when the user
  // returns to the screen instead of showing whatever was true at mount.
  useEffect(() => {
    const onFocus = () => setReloadKey(k => k + 1);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, []);

  return (
    <PageTransition>
      <div className="page" style={{ paddingBottom: 100 }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '16px 16px 12px',
          borderBottom: '1px solid var(--surface-2)',
        }}>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => navigate(-1)}
            style={{ border: 'none', background: 'none', color: 'var(--blue-500)', cursor: 'pointer', padding: 4, display: 'flex' }}
          >
            <ArrowLeft size={22} weight="bold" />
          </motion.button>
          <h1 style={{ fontSize: 20, fontWeight: 900 }}>{t('title')}</h1>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[1, 2].map(i => (
              <div key={i} className="skeleton" style={{ height: 180, borderRadius: 16 }} />
            ))}
          </div>

        ) : error ? (
          <LoadError lang={lang} onRetry={() => { setError(null); setLoading(true); setReloadKey(k => k + 1); }} />

        ) : noTg ? (
          /* Not in Telegram */
          <div className="empty-state" style={{ marginTop: 60 }}>
            <div className="empty-state__icon"><Package size={56} weight="thin" color="var(--text-3)" /></div>
            <h3 className="empty-state__title">{t('noTg')}</h3>
            <p className="empty-state__desc">{t('noTgDesc')}</p>
          </div>

        ) : orders.length === 0 ? (
          /* Empty */
          <div className="empty-state" style={{ marginTop: 60 }}>
            <div className="empty-state__icon"><Package size={56} weight="thin" color="var(--text-3)" /></div>
            <h3 className="empty-state__title">{t('empty')}</h3>
            <p className="empty-state__desc">{t('emptyDesc')}</p>
            <motion.button
              className="btn-primary"
              whileTap={{ scale: 0.96, y: 1 }}
              style={{ marginTop: 20 }}
              onClick={() => { haptic('light'); navigate('/catalog'); }}
            >
              {t('catalogBtn')}
            </motion.button>
          </div>

        ) : (
          /* Order list */
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {orders.map((order, idx) => (
              <OrderCard key={order.id} order={order} lang={lang} t={t} index={idx} />
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}

// ── Order Card with Status Stepper ─────────────────────────────────────────────
function OrderCard({ order, lang, t, index }) {
  const [open, setOpen] = useState(index === 0); // first order expanded by default
  const status      = order.status || 'pending';
  const meta        = STATUS_META[status] ?? STATUS_META.pending;
  const stepIdx     = ORDER_STEPS.findIndex(s => s.key === status);
  const isCancelled = status === 'cancelled';
  const items       = order.items || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, type: 'spring', stiffness: 320, damping: 28 }}
      style={{
        background: 'var(--surface)',
        borderRadius: 16,
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
        borderTop: `3px solid ${meta.color}`,
      }}
    >
      {/* ── Header row (always visible) ── */}
      <div
        onClick={() => { haptic('light'); setOpen(v => !v); }}
        style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        {/* Top: order id + status badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
              {t('orderNum')} <span style={{ fontFamily: 'monospace' }}>#{order.id?.toString().slice(0, 8).toUpperCase()}</span>
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
              {formatDate(order.created_at, lang)}
            </p>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
            color: meta.color, background: meta.bg,
            padding: '5px 12px', borderRadius: 20,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <meta.Icon size={12} weight="bold" />
            {meta.label[lang] ?? meta.label.uz}
          </span>
        </div>

        {/* Progress stepper (hidden for cancelled) */}
        {!isCancelled && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {ORDER_STEPS.map((step, i) => {
              const done   = i <= stepIdx;
              const active = i === stepIdx;
              const isLast = i === ORDER_STEPS.length - 1;
              return (
                <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: isLast ? 0 : 1 }}>
                  {/* Node */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <motion.div
                      animate={{
                        scale: active ? 1.2 : 1,
                        background: done ? meta.color : 'var(--surface-2)',
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      style={{
                        width: active ? 12 : 10, height: active ? 12 : 10,
                        borderRadius: '50%',
                        boxShadow: active ? `0 0 0 4px ${meta.color}28` : 'none',
                        flexShrink: 0,
                      }}
                    />
                    {/* Step label */}
                    <span style={{
                      fontSize: 9, fontWeight: active ? 800 : 600,
                      color: done ? meta.color : 'var(--text-3)',
                      whiteSpace: 'nowrap',
                      lineHeight: 1,
                    }}>
                      {step.label[lang] ?? step.label.uz}
                    </span>
                  </div>
                  {/* Connector line */}
                  {!isLast && (
                    <motion.div
                      animate={{ background: i < stepIdx ? meta.color : 'var(--surface-2)' }}
                      transition={{ duration: 0.4, delay: i * 0.08 }}
                      style={{ flex: 1, height: 2, marginBottom: 14 }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Cancelled ribbon */}
        {isCancelled && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 12px', borderRadius: 10,
            background: '#E53E3E10', border: '1px solid #E53E3E20',
          }}>
            <XCircle size={16} weight="duotone" color="#E53E3E" />
            <span style={{ fontSize: 12, color: '#E53E3E', fontWeight: 700 }}>
              {meta.label[lang] ?? meta.label.uz}
            </span>
          </div>
        )}
      </div>

      {/* ── Expandable items + total ── */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ borderTop: '1px solid var(--surface-2)', padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Items */}
              {items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.3 }}>{item.title}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                      {item.qty} × {formatPrice(item.price)}
                    </p>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)', flexShrink: 0 }}>
                    {formatPrice((item.price || 0) * item.qty)}
                  </span>
                </div>
              ))}

              {/* Total */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderTop: '1px solid var(--surface-2)', paddingTop: 12, marginTop: 4,
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>{t('total')}</span>
                <span style={{ fontSize: 17, fontWeight: 900, color: meta.color }}>
                  {formatPrice(order.total_uzs)}
                </span>
              </div>

              {/* Payment + address meta */}
              {(order.payment_method || order.delivery_address) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                  {order.payment_method && (
                    <p style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>
                      <CreditCard size={12} weight="duotone" style={{ verticalAlign: '-1px' }} /> {order.payment_method}
                    </p>
                  )}
                  {order.delivery_address && (
                    <p style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>
                      <MapPin size={12} weight="duotone" style={{ verticalAlign: '-1px' }} /> {order.delivery_address}
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle hint */}
      <motion.div
        onClick={() => { haptic('light'); setOpen(v => !v); }}
        style={{
          textAlign: 'center', padding: '8px 0',
          fontSize: 11, fontWeight: 700, color: 'var(--text-3)',
          cursor: 'pointer', borderTop: '1px solid var(--surface-2)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4,
        }}
        whileTap={{ opacity: 0.6 }}
      >
        {open ? `▴ ${t('collapse')}` : `▾ ${items.length} ${t('items')}`}
      </motion.div>
    </motion.div>
  );
}
