import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { tg, haptic } from '../lib/utils';
import { CheckCircle, ClockCounterClockwise } from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useLang } from '../context/LangContext';

export default function PaymentReturn() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const navigate = useNavigate();
  const { lang } = useLang();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const inTelegram = !!tg()?.initDataUnsafe?.user;

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    
    // Check order status from Supabase
    const checkStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('miniapp_orders')
          .select('payment_status, status')
          .eq('id', orderId)
          .single();
          
        if (data) {
          setOrder(data);
          if (data.payment_status === 'paid') {
            confetti({ particleCount: 120, spread: 80, colors: ['#38A169', '#00CDFE', '#D5AD36'] });
            haptic('success');
          }
        }
      } catch (err) {
        console.error('Error fetching order status:', err);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, [orderId]);

  return (
    <div className="page" style={{ padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
      {loading ? (
        <div className="spinner" style={{ width: 40, height: 40, border: '4px solid var(--surface-2)', borderTopColor: 'var(--blue-500)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      ) : order?.payment_status === 'paid' ? (
        <>
          <CheckCircle size={80} color="#38A169" weight="fill" style={{ marginBottom: 20 }} />
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 10 }}>
            {lang === 'ru' ? 'Оплата успешна!' : lang === 'en' ? 'Payment Successful!' : 'To\'lov muvaffaqiyatli!'}
          </h1>
          <p style={{ color: 'var(--text-2)', marginBottom: 30, lineHeight: 1.5 }}>
            {lang === 'ru' ? 'Ваш заказ принят и скоро будет доставлен.' : 
             lang === 'en' ? 'Your order is confirmed and will be delivered soon.' : 
             'Buyurtmangiz qabul qilindi va tez orada yetkazib beriladi.'}
          </p>
        </>
      ) : (
        <>
          <ClockCounterClockwise size={80} color="#D5AD36" weight="duotone" style={{ marginBottom: 20 }} />
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 10 }}>
            {lang === 'ru' ? 'Ожидание оплаты' : lang === 'en' ? 'Payment Pending' : 'To\'lov kutilmoqda'}
          </h1>
          <p style={{ color: 'var(--text-2)', marginBottom: 30, lineHeight: 1.5 }}>
            {lang === 'ru' ? 'Вы вернулись со страницы оплаты. Если вы совершили платеж, статус скоро обновится.' : 
             lang === 'en' ? 'You returned from the payment page. If you paid, the status will update shortly.' : 
             'Siz to\'lov sahifasidan qaytdingiz. Agar to\'lovni amalga oshirgan bo\'lsangiz, holat tez orada yangilanadi.'}
          </p>
        </>
      )}

      {inTelegram ? (
        <button className="btn-primary" onClick={() => { haptic('light'); navigate('/orders'); }}>
          {lang === 'ru' ? 'Мои заказы' : lang === 'en' ? 'My Orders' : 'Buyurtmalarimga o\'tish'}
        </button>
      ) : (
        <a href="https://t.me/Booktopiapress_bot" onClick={() => haptic('light')} className="btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {lang === 'ru' ? 'Вернуться в Telegram' : lang === 'en' ? 'Return to Telegram' : 'Telegramga qaytish'}
        </a>
      )}
    </div>
  );
}
