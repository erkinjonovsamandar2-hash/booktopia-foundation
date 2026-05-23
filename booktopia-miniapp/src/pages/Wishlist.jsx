import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLang } from '../context/LangContext';
import BookCard from '../components/BookCard';
import { haptic, tg } from '../lib/utils';
import PageTransition from '../components/PageTransition';

const T = {
  title:      { uz: 'Saqlanganlar',    ru: 'Избранное',       en: 'Wishlist' },
  empty:      { uz: 'Hali hech narsa yo\'q', ru: 'Пока ничего нет', en: 'Nothing here yet' },
  emptyDesc:  { uz: 'Yoqtirgan kitoblaringizni saqlang', ru: 'Сохраняйте понравившиеся книги', en: 'Save your favorite books' },
  share:      { uz: 'Ulashish',        ru: 'Поделиться',      en: 'Share' },
  shareMsg:   { uz: 'Men Booktopia\'da ushbu kitobni o\'qimoqchiman:', ru: 'Я хочу прочитать эту книгу в Booktopia:', en: 'I want to read this book on Booktopia:' },
};

export default function Wishlist() {
  const navigate = useNavigate();
  const { lang } = useLang();
  
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWishlist = async () => {
      try {
        const savedIds = JSON.parse(localStorage.getItem('booktopia_wish') || '[]');
        if (savedIds.length === 0) {
          setLoading(false);
          return;
        }

        const { data } = await supabase
          .from('books')
          .select('*')
          .in('id', savedIds);
          
        if (data) setBooks(data);
      } catch (err) {
        console.error('Wishlist error', err);
      } finally {
        setLoading(false);
      }
    };
    loadWishlist();
  }, []);

  const handleShare = (book) => {
    haptic('light');
    const title = book[`title_${lang}`] || book.title || '';
    const text = `${T.shareMsg[lang]} "${title}"`;
    // We assume the bot username is booktopia_bot. You can change this if the real bot is different.
    const url = `https://t.me/share/url?url=https://t.me/booktopia_uz_bot&text=${encodeURIComponent(text)}`;
    if (tg()?.openTelegramLink) {
      tg().openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const t = (k) => T[k]?.[lang] ?? T[k]?.uz;

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
        <div style={{ padding: '0 16px' }}><div className="skeleton" style={{ height: 200, width: '100%', borderRadius: 12 }} /></div>
      ) : books.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <span className="empty-state__icon">❤️</span>
          <h3 className="empty-state__title">{t('empty')}</h3>
          <p className="empty-state__desc">{t('emptyDesc')}</p>
        </div>
      ) : (
        <div className="books-grid">
          {books.map((book, i) => (
            <div key={book.id} style={{ display: 'flex', flexDirection: 'column' }}>
              <BookCard book={book} lang={lang} onNavigate={navigate} index={i} />
              
              {/* Viral Sharing Feature */}
              <button 
                onClick={() => handleShare(book)}
                className="btn-secondary"
                style={{ marginTop: 8, padding: '8px', fontSize: 13, gap: 4 }}
              >
                <span>↗️</span> {t('share')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
    </PageTransition>
  );
}
