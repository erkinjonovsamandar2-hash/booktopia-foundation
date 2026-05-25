import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { House, SquaresFour, ShoppingBag, Compass, UserCircle } from '@phosphor-icons/react';

const ACTIVE_COLOR  = '#265999';
const IDLE_COLOR    = '#9BAAB8';
const ICON_SIZE     = 24;

const NAV = [
  {
    path: '/',
    label: { uz: 'Asosiy', ru: 'Главная', en: 'Home' },
    Icon: House,
  },
  {
    path: '/catalog',
    label: { uz: 'Katalog', ru: 'Каталог', en: 'Catalog' },
    Icon: SquaresFour,
  },
  {
    path: '/cart',
    label: { uz: 'Savat', ru: 'Корзина', en: 'Cart' },
    Icon: ShoppingBag,
    hasCart: true,
  },
  {
    path: '/discover',
    label: { uz: 'Kashfiyot', ru: 'Открытия', en: 'Discover' },
    Icon: Compass,
  },
  {
    path: '/profile',
    label: { uz: 'Profil', ru: 'Профиль', en: 'Profile' },
    Icon: UserCircle,
  },
];

export default function BottomNav({ lang = 'uz' }) {
  const { pathname } = useLocation();
  const { totalCount } = useCart();

  return (
    <nav className="bottom-nav">
      {NAV.map(item => {
        const active = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);
        const color  = active ? ACTIVE_COLOR : IDLE_COLOR;
        const weight = active ? 'fill' : 'regular';

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
              <item.Icon size={ICON_SIZE} weight={weight} color={color} />
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
