import { useLang } from '../context/LangContext';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';
import { tg } from '../lib/utils';

const T = {
  title:       { uz: 'Profil',              ru: 'Профиль',         en: 'Profile' },
  guest:       { uz: 'Mehmon',              ru: 'Гость',            en: 'Guest' },
  orders:      { uz: 'Buyurtmalarim',       ru: 'Мои заказы',      en: 'My Orders' },
  ordersDesc:  { uz: 'Buyurtmalar tarixi',  ru: 'История заказов', en: 'Order history' },
  wishlist:    { uz: 'Saqlanganlar',        ru: 'Избранное',        en: 'Wishlist' },
  wishDesc:    { uz: 'Yoqtirgan kitoblaringiz', ru: 'Понравившиеся книги', en: 'Liked books' },
  lang:        { uz: 'Til',                 ru: 'Язык',             en: 'Language' },
  about:       { uz: 'Booktopia haqida',    ru: 'О Booktopia',      en: 'About Booktopia' },
  website:     { uz: 'Veb-sayt',            ru: 'Сайт',             en: 'Website' },
  contact:     { uz: 'Bog\'lanish',         ru: 'Контакты',         en: 'Contact' },
  cart:        { uz: 'Savat',               ru: 'Корзина',          en: 'Cart' },
  items:       { uz: 'ta kitob',            ru: 'книг',             en: 'books' },
};

export default function Profile() {
  const { lang, changeLang, langs, langLabels } = useLang();
  const { totalCount } = useCart();
  const user = tg()?.initDataUnsafe?.user;

  const t = (k) => T[k]?.[lang] ?? T[k]?.uz;

  const userName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ')
    : t('guest');
  const userHandle = user?.username ? `@${user.username}` : null;

  return (
    <div className="page">
      {/* Profile header */}
      <div style={{
        background: 'linear-gradient(135deg, #0A192F 0%, #265999 100%)',
        padding: '32px 20px 28px',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{
          width: 64, height: 64,
          background: 'rgba(255,255,255,0.15)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, flexShrink: 0,
        }}>
          {user ? '👤' : '🔍'}
        </div>
        <div>
          <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 2 }}>{userName}</h2>
          {userHandle && (
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 600 }}>{userHandle}</p>
          )}
          {totalCount > 0 && (
            <p style={{ color: '#00CDFE', fontSize: 13, fontWeight: 700, marginTop: 4 }}>
              🛒 {totalCount} {t('items')}
            </p>
          )}
        </div>
        {/* Language switcher in header */}
        <div className="lang-switcher" style={{ marginLeft: 'auto' }}>
          {langs.map(l => (
            <button
              key={l}
              className={`lang-btn ${lang === l ? 'active' : 'idle'}`}
              onClick={() => changeLang(l)}
            >
              {langLabels[l]}
            </button>
          ))}
        </div>
      </div>

      {/* Menu items */}
      <div style={{ background: 'var(--surface)', marginTop: 12, borderRadius: '12px 12px 0 0', overflow: 'hidden' }}>
        <MenuItem icon="📦" label={t('orders')} sub={t('ordersDesc')} href="/orders" />
        <MenuItem icon="❤️" label={t('wishlist')} sub={t('wishDesc')} href="/wishlist" />
        <MenuItem icon="🛒" label={t('cart')} sub={`${totalCount} ${t('items')}`} href="/cart" />
      </div>

      <div style={{ height: 8 }} />

      <div style={{ background: 'var(--surface)', overflow: 'hidden' }}>
        <MenuItem icon="🌐" label={t('website')} sub="booktopia.uz" href="https://booktopia.uz" external />
        <MenuItem icon="💬" label={t('contact')} sub="Telegram orqali" href="https://t.me/booktopia_uz" external />
        <MenuItem icon="ℹ️" label={t('about')} sub="Booktopia Publishing House" />
      </div>

      {/* Version */}
      <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 12, fontWeight: 600, padding: '20px 0 8px' }}>
        Booktopia Miniapp v1.0
      </p>
    </div>
  );
}

function MenuItem({ icon, label, sub, href, external }) {
  const Tag = href ? (external ? 'a' : Link) : 'div';
  const props = href
    ? (external ? { href, target: '_blank', rel: 'noopener noreferrer' } : { to: href })
    : {};

  return (
    <Tag className="list-item" {...props}>
      <div className="list-item__icon">{icon}</div>
      <div style={{ flex: 1 }}>
        <div className="list-item__label">{label}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, marginTop: 1 }}>{sub}</div>}
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Tag>
  );
}
