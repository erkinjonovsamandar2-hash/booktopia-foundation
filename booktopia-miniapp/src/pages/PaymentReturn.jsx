import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { tg, haptic } from '../lib/utils';
import { useCart } from '../context/CartContext';
import { CheckCircle, ClockCounterClockwise, WarningCircle } from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useLang } from '../context/LangContext';

const MAX_POLLS = 20;     // 20 × 3s = 60s max polling
const POLL_INTERVAL = 3000;

export default function PaymentReturn() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const navigate = useNavigate();
  const { lang } = useLang();
  const { clearCart } = useCart();
  const [status, setStatus] = useState('loading'); // loading | paid | pending | error
  const [pollCount, setPollCount] = useState(0);
  const pollRef = useRef(null);
  const celebratedRef = useRef(false);

  const inTelegram = !!tg()?.initDataUnsafe?.user;

  const checkStatus = useCallback(async () => {
    if (!orderId) { setStatus('error'); return; }

    try {
      const { data, error } = await supabase
        .from('miniapp_orders')
        .select('payment_status, status')
        .eq('id', orderId)
        .single();

      if (error || !data) {
        setStatus('error');
        return;
      }

      if (data.payment_status === 'paid') {
        setStatus('paid');
        // Clear cart now that payment is confirmed
        clearCart();
        // Celebrate only once
        if (!celebratedRef.current) {
          celebratedRef.current = true;
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors: ['#38A169', '#00CDFE', '#D5AD36'] });
          haptic('success');
        }
        // Stop polling
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        return;
      }

      setStatus('pending');
    } catch (err) {
      console.error('Error fetching order status:', err);
      setStatus('pending');
    }
  }, [orderId, clearCart]);

  // Initial check + start polling
  useEffect(() => {
    checkStatus();

    pollRef.current = setInterval(() => {
      setPollCount(prev => {
        if (prev >= MAX_POLLS) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          return prev;
        }
        checkStatus();
        return prev + 1;
      });
    }, POLL_INTERVAL);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [checkStatus]);

  const t = {
    loading: {
      uz: 'Tekshirilmoqda...',
      ru: 'Проверяем...',
      en: 'Checking...',
    },
    paidTitle: {
      uz: 'To\'lov muvaffaqiyatli!',
      ru: 'Оплата успешна!',
      en: 'Payment Successful!',
    },
    paidDesc: {
      uz: 'Buyurtmangiz qabul qilindi va tez orada yetkazib beriladi.',
      ru: 'Ваш заказ принят и скоро будет доставлен.',
      en: 'Your order is confirmed and will be delivered soon.',
    },
    pendingTitle: {
      uz: 'To\'lov tekshirilmoqda',
      ru: 'Проверяем оплату',
      en: 'Checking Payment',
    },
    pendingDesc: {
      uz: 'Agar to\'lovni amalga oshirgan bo\'lsangiz, holat tez orada yangilanadi.',
      ru: 'Если вы совершили платёж, статус обновится автоматически.',
      en: 'If you completed the payment, the status will update automatically.',
    },
    errorTitle: {
      uz: 'Buyurtma topilmadi',
      ru: 'Заказ не найден',
      en: 'Order not found',
    },
    errorDesc: {
      uz: 'Buyurtma ma\'lumotlarini tekshirib bo\'lmadi.',
      ru: 'Не удалось проверить данные заказа.',
      en: 'Could not verify order details.',
    },
    ordersBtn: {
      uz: 'Buyurtmalarimga o\'tish',
      ru: 'Мои заказы',
      en: 'My Orders',
    },
    tgBtn: {
      uz: 'Telegramga qaytish',
      ru: 'Вернуться в Telegram',
      en: 'Return to Telegram',
    },
    retryBtn: {
      uz: 'Qayta tekshirish',
      ru: 'Проверить снова',
      en: 'Check again',
    },
  };

  const l = (key) => t[key]?.[lang] ?? t[key]?.uz ?? key;

  return (
    <div className="page" style={{
      padding: '40px 20px',
      textAlign: 'center',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--bg)',
    }}>
      {status === 'loading' ? (
        /* ── Loading ── */
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            style={{
              width: 48, height: 48, marginBottom: 20,
              border: '4px solid var(--surface-2)',
              borderTopColor: 'var(--blue-500)',
              borderRadius: '50%',
            }}
          />
          <p style={{ color: 'var(--text-2)', fontSize: 16, fontWeight: 600 }}>{l('loading')}</p>
        </>

      ) : status === 'paid' ? (
        /* ── Paid ── */
        <>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <CheckCircle size={80} color="#38A169" weight="fill" />
          </motion.div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginTop: 20, marginBottom: 10 }}>
            {l('paidTitle')}
          </h1>
          <p style={{ color: 'var(--text-2)', marginBottom: 30, lineHeight: 1.5, maxWidth: 320 }}>
            {l('paidDesc')}
          </p>
        </>

      ) : status === 'error' ? (
        /* ── Error ── */
        <>
          <WarningCircle size={80} color="#E53E3E" weight="duotone" style={{ marginBottom: 20 }} />
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 10 }}>{l('errorTitle')}</h1>
          <p style={{ color: 'var(--text-2)', marginBottom: 30, lineHeight: 1.5 }}>{l('errorDesc')}</p>
        </>

      ) : (
        /* ── Pending ── */
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
          >
            <ClockCounterClockwise size={80} color="#D5AD36" weight="duotone" />
          </motion.div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginTop: 20, marginBottom: 10 }}>
            {l('pendingTitle')}
          </h1>
          <p style={{ color: 'var(--text-2)', marginBottom: 20, lineHeight: 1.5, maxWidth: 320 }}>
            {l('pendingDesc')}
          </p>

          {/* Polling indicator */}
          {pollCount < MAX_POLLS ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                style={{
                  width: 16, height: 16,
                  border: '2px solid var(--surface-2)',
                  borderTopColor: '#D5AD36',
                  borderRadius: '50%',
                }}
              />
              <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>
                {lang === 'ru' ? 'Автоматическая проверка...' : lang === 'en' ? 'Auto-checking...' : 'Avtomatik tekshirilmoqda...'}
              </span>
            </div>
          ) : (
            <button
              className="btn-secondary"
              style={{ marginBottom: 24, fontSize: 14 }}
              onClick={() => { setPollCount(0); checkStatus(); }}
            >
              {l('retryBtn')}
            </button>
          )}
        </>
      )}

      {/* Navigation buttons */}
      {status !== 'loading' && (
        inTelegram ? (
          <button className="btn-primary" onClick={() => { haptic('light'); navigate('/orders'); }}>
            {l('ordersBtn')}
          </button>
        ) : (
          <a
            href="https://t.me/Booktopiapress_bot"
            onClick={() => haptic('light')}
            className="btn-primary"
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {l('tgBtn')}
          </a>
        )
      )}
    </div>
  );
}
