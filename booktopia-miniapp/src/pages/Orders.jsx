import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLang } from '../context/LangContext';
import { formatPrice, tg } from '../lib/utils';
import PageTransition from '../components/PageTransition';

const T = {
  title:      { uz: 'Mening Kutubxonam', ru: 'Моя библиотека', en: 'My Library' },
  empty:      { uz: 'Sizda hali xaridlar yo\'q', ru: 'У вас пока нет покупок', en: 'You have no purchases yet' },
  emptyDesc:  { uz: 'Katalogdan o\'zingizga yoqqan kitobni tanlang', ru: 'Выберите книгу по душе из каталога', en: 'Choose a book you like from the catalog' },
  status:     {
    pending:   { uz: 'Kutilmoqda',    ru: 'Ожидается',     en: 'Pending' },
    approved:  { uz: 'Qabul qilindi', ru: 'Принят',        en: 'Approved' },
    delivering:{ uz: 'Yetkazilmoqda', ru: 'Доставляется',  en: 'Delivering' },
    delivered: { uz: 'Yetkazib berildi', ru: 'Доставлен',   en: 'Delivered' },
    cancelled: { uz: 'Bekor qilindi', ru: 'Отменен',       en: 'Cancelled' }
  },
  readExcerpt: { uz: '📄 Namuna o\'qish', ru: '📄 Читать фрагмент', en: '📄 Read Excerpt' },
};

export default function Orders() {
  const navigate = useNavigate();
  const { lang } = useLang();
  
  const [orders, setOrders] = useState([]);
  const [purchasedBooks, setPurchasedBooks] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const userId = tg()?.initDataUnsafe?.user?.id;
        
        // For testing outside telegram, you can comment this out or mock it
        if (!userId) {
          setLoading(false);
          return;
        }

        const { data: ordersData } = await supabase
          .from('miniapp_orders')
          .select('*')
          .eq('telegram_user_id', userId)
          .order('created_at', { ascending: false });

        if (ordersData && ordersData.length > 0) {
          setOrders(ordersData);
          
          // Collect all book IDs from all orders to fetch their covers and excerpts (The "Library" experience)
          const bookIds = [];
          ordersData.forEach(order => {
            (order.items || []).forEach(item => {
              if (item.book_id && !bookIds.includes(item.book_id)) {
                bookIds.push(item.book_id);
              }
            });
          });

          if (bookIds.length > 0) {
            const { data: booksData } = await supabase
              .from('books')
              .select('id, cover_url, excerpt_url')
              .in('id', bookIds);
              
            if (booksData) {
              const bookMap = {};
              booksData.forEach(b => { bookMap[b.id] = b; });
              setPurchasedBooks(bookMap);
            }
          }
        }
      } catch (err) {
        console.error('Orders error', err);
      } finally {
        setLoading(false);
      }
    };
    loadOrders();
  }, []);

  const t = (k) => T[k]?.[lang] ?? T[k]?.uz;

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#D5AD36';
      case 'approved': return '#3182CE';
      case 'delivering': return '#805AD5';
      case 'delivered': return '#38A169';
      case 'cancelled': return '#E53E3E';
      default: return 'var(--text-3)';
    }
  };

  return (
    <PageTransition>
    <div className="page" style={{ paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'center' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ border: 'none', background: 'none', color: 'var(--blue-500)', fontSize: 20, marginRight: 12, cursor: 'pointer' }}
        >
          ←
        </button>
        <h1 style={{ fontSize: 22 }}>{t('title')}</h1>
      </div>

      <div style={{ height: 16 }} />

      {loading ? (
        <div style={{ padding: '0 16px' }}><div className="skeleton" style={{ height: 150, width: '100%', borderRadius: 12 }} /></div>
      ) : orders.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <span className="empty-state__icon">📦</span>
          <h3 className="empty-state__title">{t('empty')}</h3>
          <p className="empty-state__desc">{t('emptyDesc')}</p>
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/catalog')}>
            Katalogga o'tish
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '0 16px' }}>
          {orders.map(order => {
            const statusLabel = T.status[order.status || 'pending']?.[lang] || order.status;
            const statusColor = getStatusColor(order.status || 'pending');
            
            return (
              <div key={order.id} style={{
                background: 'var(--surface)',
                borderRadius: 12,
                padding: 16,
                boxShadow: 'var(--shadow-card)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid var(--surface-2)', paddingBottom: 12 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 700 }}>
                    Buyurtma #{order.id.toString().slice(0, 8)}
                  </span>
                  <span style={{ 
                    fontSize: 11, fontWeight: 800, textTransform: 'uppercase', 
                    color: statusColor, background: `${statusColor}15`, 
                    padding: '4px 10px', borderRadius: 20 
                  }}>
                    {statusLabel}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(order.items || []).map((item, idx) => {
                    const bookInfo = purchasedBooks[item.book_id];
                    return (
                      <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        {bookInfo?.cover_url ? (
                           <img src={bookInfo.cover_url} alt={item.title} style={{ width: 48, height: 68, objectFit: 'cover', borderRadius: 6, flexShrink: 0, boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }} />
                        ) : (
                          <div style={{ width: 48, height: 68, background: 'var(--surface-2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📚</div>
                        )}
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3, marginBottom: 4 }}>{item.title}</p>
                          <p style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>{item.qty} x {formatPrice(item.price)}</p>
                          
                          {/* "My Library" Digital Experience */}
                          {bookInfo?.excerpt_url && (
                             <a
                               href={bookInfo.excerpt_url}
                               target="_blank"
                               rel="noopener noreferrer"
                               style={{ 
                                 display: 'inline-block', marginTop: 8, padding: '6px 12px', 
                                 background: 'var(--blue-100)', color: 'var(--blue-500)', 
                                 fontSize: 11, fontWeight: 800, borderRadius: 20, textDecoration: 'none' 
                               }}
                             >
                               {t('readExcerpt')}
                             </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--surface-2)' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>Jami</span>
                  <span className="price" style={{ fontSize: 16, color: 'var(--blue-500)' }}>{formatPrice(order.total_uzs)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
    </PageTransition>
  );
}
