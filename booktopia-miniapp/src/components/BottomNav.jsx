import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCart } from '../context/CartContext';

const NAV = [
  {
    path: '/',
    label: { uz: 'Asosiy', ru: 'Главная', en: 'Home' },
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={active ? '#265999' : '#9BAAB8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill={active ? '#265999' : 'none'} stroke={active ? '#265999' : '#9BAAB8'} />
        <polyline points="9 22 9 12 15 12 15 22" stroke="white" strokeWidth="2" />
      </svg>
    ),
  },
  {
    path: '/catalog',
    label: { uz: 'Katalog', ru: 'Каталог', en: 'Catalog' },
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={active ? '#265999' : '#9BAAB8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    path: '/cart',
    label: { uz: 'Savat', ru: 'Корзина', en: 'Cart' },
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={active ? '#265999' : '#9BAAB8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
    hasCart: true,
  },
  {
    path: '/discover',
    label: { uz: 'Kashfiyot', ru: 'Открытия', en: 'Discover' },
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={active ? '#265999' : '#9BAAB8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill={active ? '#265999' : 'none'} stroke={active ? '#265999' : '#9BAAB8'} />
      </svg>
    ),
  },
  {
    path: '/profile',
    label: { uz: 'Profil', ru: 'Профиль', en: 'Profile' },
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={active ? '#265999' : '#9BAAB8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export default function BottomNav({ lang = 'uz' }) {
  const { pathname } = useLocation();
  const { totalCount } = useCart();

  return (
    <nav className="bottom-nav">
      {NAV.map(item => {
        const active = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item${active ? ' active' : ''}`}
          >
          <motion.div
            whileTap={{ scale: 0.82 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}
          >
            {item.icon(active)}
            <span>{item.label[lang] ?? item.label.uz}</span>
            {item.hasCart && totalCount > 0 && (
              <span className="nav-badge">{totalCount > 9 ? '9+' : totalCount}</span>
            )}
          </motion.div>
          </Link>
        );
      })}
    </nav>
  );
}
