import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLang } from '../context/LangContext';
import { useWishlist } from '../context/WishlistContext';
import BookCard from '../components/BookCard';
import PageTransition from '../components/PageTransition';
import LoadError from '../components/LoadError';
import { haptic, tg, formatPrice } from '../lib/utils';
import { Heart, Export } from '@phosphor-icons/react';

const T = {
  title:      { uz: 'Saqlanganlar',    ru: 'Избранное',       en: 'Wishlist' },
  empty:      { uz: 'Hali hech narsa yo\'q', ru: 'Пока ничего нет', en: 'Nothing here yet' },
  emptyDesc:  { uz: 'Yoqtirgan kitoblaringizni saqlang', ru: 'Сохраняйте понравившиеся книги', en: 'Save your favorite books' },
  share:      { uz: 'Ulashish',        ru: 'Поделиться',      en: 'Share' },
  shareMsg:   { uz: 'Booktopia\'da ko\'rdim — senga ham yoqishi mumkin 👇',
                ru: 'Нашёл(ла) в Booktopia — тебе тоже может понравиться 👇',
                en: 'Found this on Booktopia — you might like it 👇' },
  back:       { uz: 'Orqaga',          ru: 'Назад',           en: 'Back' },
};

// Bot username lives in one place — Profile and Wishlist used to disagree.
const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || 'Booktopiapress_bot';

export default function Wishlist() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const { ids } = useWishlist();

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Snapshot the ids we fetched for, so removing one does not refetch everything.
  const [fetchedIds] = useState(() => ids);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
    try {
      if (fetchedIds.length === 0) { if (!cancelled) setBooks([]); return; }
      const { data, error: err } = await supabase
        .from('books')
        .select('id, title, title_ru, title_en, author, author_ru, author_en, cover_url, price, stock, category, featured, is_new, coming_soon, img_focus_x, img_focus_y, shop_visible')
        .in('id', fetchedIds);
      if (err) throw err;
      if (!cancelled) setBooks((data ?? []).filter(b => b.shop_visible !== false));
    } catch (err) {
      console.error('Wishlist error', err);
      if (!cancelled) setError(err);
    } finally {
      if (!cancelled) setLoading(false);
    }
    })();
    return () => { cancelled = true; };
  }, [fetchedIds, reloadKey]);

  // Retry runs from a click, so setting state here is safe.
  const load = () => { setLoading(true); setError(null); setReloadKey(k => k + 1); };

  // Render straight from the wishlist context, so un-hearting a book removes its
  // card immediately instead of leaving it on screen until a reload.
  const visible = useMemo(() => books.filter(b => ids.includes(b.id)), [books, ids]);

  const handleShare = (book) => {
    haptic('light');
    const title  = book[`title_${lang}`]  || book.title  || '';
    const author = book[`author_${lang}`] || book.author || '';

    // The old share was a bare bot deep-link with a one-line sentence, so the
    // recipient saw a naked URL and the bot's logo card. Lead with the book:
    // title, author and price, then the link.
    const lines = [
      `📚 ${title}`,
      author ? `✍️ ${author}` : null,
      book.price ? `💰 ${formatPrice(book.price)}` : null,
      '',
      T.shareMsg[lang] ?? T.shareMsg.uz,
    ].filter((l) => l !== null);
    const text = lines.join('\n');

    const deepLink = `https://t.me/${BOT_USERNAME}?startapp=book_${book.id.replace(/-/g, '').slice(0, 8)}`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(deepLink)}&text=${encodeURIComponent(text)}`;
    if (tg()?.openTelegramLink) {
      tg().openTelegramLink(url);
    } else {
      const win = window.open(url, '_blank', 'noopener');
      if (!win) window.location.href = url;
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
          aria-label={t('back')}
          style={{ border: 'none', background: 'none', color: 'var(--blue-500)', fontSize: 20, marginRight: 12, cursor: 'pointer' }}
        >
          ←
        </button>
        <h1 style={{ fontSize: 22 }}>{t('title')}</h1>
      </div>

      <div style={{ height: 16 }} />

      {loading ? (
        <div style={{ padding: '0 16px' }}><div className="skeleton" style={{ height: 200, width: '100%', borderRadius: 12 }} /></div>
      ) : error ? (
        <LoadError lang={lang} onRetry={load} />
      ) : visible.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <div className="empty-state__icon"><Heart size={56} weight="thin" color="var(--text-3)" /></div>
          <h3 className="empty-state__title">{t('empty')}</h3>
          <p className="empty-state__desc">{t('emptyDesc')}</p>
        </div>
      ) : (
        <div className="books-grid">
          {visible.map((book, i) => (
            <div key={book.id} style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <BookCard book={book} lang={lang} onNavigate={navigate} index={i} />

              <button
                onClick={() => handleShare(book)}
                className="btn-secondary"
                style={{ marginTop: 8, padding: '10px', fontSize: 13, gap: 4 }}
              >
                <Export size={14} weight="bold" aria-hidden="true" /> {t('share')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
    </PageTransition>
  );
}
