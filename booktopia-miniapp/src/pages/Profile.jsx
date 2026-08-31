import { useLang } from '../context/LangContext';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';
import { tg } from '../lib/utils';
import PageTransition from '../components/PageTransition';
import {
  ShieldCheck,
  FileText,
  Package,
  Heart,
  ShoppingCart,
  Globe,
  MessageCircle,
  Info,
  User,
  ChevronRight,
} from 'lucide-react';

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
  privacy:     { uz: 'Maxfiylik siyosati',  ru: 'Политика конфиденциальности', en: 'Privacy Policy' },
  privacyDesc: { uz: 'Ma\'lumotlaringiz qanday ishlatiladi', ru: 'Как используются ваши данные', en: 'How your data is used' },
  terms:       { uz: 'Foydalanish shartlari', ru: 'Условия использования', en: 'Terms of Use' },
  termsDesc:   { uz: 'Xizmatdan foydalanish qoidalari', ru: 'Правила пользования сервисом', en: 'Rules for using the service' },
};

// Icon wrapper — consistent size + color
function Icon({ component: Comp, color = 'var(--blue-500)' }) {
  return <Comp size={20} strokeWidth={1.75} color={color} />;
}

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
    <PageTransition>
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
          flexShrink: 0,
        }}>
          <User size={30} strokeWidth={1.5} color="rgba(255,255,255,0.85)" />
        </div>
        <div>
          <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 2 }}>{userName}</h2>
          {userHandle && (
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 600 }}>{userHandle}</p>
          )}
          {totalCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
              <ShoppingCart size={13} color="#00CDFE" />
              <p style={{ color: '#00CDFE', fontSize: 13, fontWeight: 700 }}>
                {totalCount} {t('items')}
              </p>
            </div>
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
        <MenuItem
          icon={<Icon component={Package} color="#D5AD36" />}
          iconBg="#FBF6E3"
          label={t('orders')} sub={t('ordersDesc')} href="/orders"
        />
        <MenuItem
          icon={<Icon component={Heart} color="#E53E3E" />}
          iconBg="#FFF5F5"
          label={t('wishlist')} sub={t('wishDesc')} href="/wishlist"
        />
        <MenuItem
          icon={<Icon component={ShoppingCart} color="#265999" />}
          iconBg="#E8F4FD"
          label={t('cart')} sub={`${totalCount} ${t('items')}`} href="/cart"
        />
      </div>

      <div style={{ height: 8 }} />

      <div style={{ background: 'var(--surface)', overflow: 'hidden' }}>
        <MenuItem
          icon={<Icon component={Globe} color="#38A169" />}
          iconBg="#EBF8F0"
          label={t('website')} sub="booktopia.uz" href="https://booktopia.uz" external
        />
        <MenuItem
          icon={<Icon component={MessageCircle} color="#805AD5" />}
          iconBg="#F5F0FF"
          label={t('contact')} sub="Telegram orqali" href="https://t.me/white_crow_8" external
        />
        <MenuItem
          icon={<Icon component={Info} color="#3182CE" />}
          iconBg="#EBF8FF"
          label={t('about')} sub="Booktopia Publishing House" href="https://booktopia.uz/about" external
        />
      </div>

      <div style={{ height: 8 }} />

      {/* Legal — required: the app collects name, phone, address and location */}
      <div style={{ background: 'var(--surface)', overflow: 'hidden' }}>
        <MenuItem
          icon={<Icon component={ShieldCheck} color="#3182CE" />}
          iconBg="#EBF8FF"
          label={t('privacy')} sub={t('privacyDesc')}
          href="https://booktopia.uz/privacy-policy" external
        />
        <MenuItem
          icon={<Icon component={FileText} color="#718096" />}
          iconBg="#EDF2F7"
          label={t('terms')} sub={t('termsDesc')}
          href="https://booktopia.uz/terms-of-use" external
        />
      </div>

      {/* Version */}
      <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 12, fontWeight: 600, padding: '20px 0 8px' }}>
        Booktopia Miniapp v1.0
      </p>
    </div>
    </PageTransition>
  );
}

function MenuItem({ icon, iconBg, label, sub, href, external }) {
  const Tag = href ? (external ? 'a' : Link) : 'div';
  const openExternal = (e) => {
    const tgApi = tg();
    if (tgApi?.openLink) {
      e.preventDefault();
      tgApi.openLink(href);
    }
    // Otherwise fall through to the anchor's default behaviour.
  };
  const props = href
    ? (external
        ? { href, target: '_blank', rel: 'noopener noreferrer', onClick: openExternal }
        : { to: href })
    : {};

  return (
    <Tag className="list-item" {...props}>
      <div style={{
        width: 38, height: 38, borderRadius: 11, flexShrink: 0,
        background: iconBg ?? 'var(--surface-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div className="list-item__label">{label}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, marginTop: 1 }}>{sub}</div>}
      </div>
      <ChevronRight size={16} strokeWidth={2} color="var(--text-3)" />
    </Tag>
  );
}
