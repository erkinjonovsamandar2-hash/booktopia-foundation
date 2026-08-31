import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useLocation, useNavigate, Link } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { CartProvider } from './context/CartContext';
import { LangProvider, useLang } from './context/LangContext';
import { ToastProvider } from './context/ToastContext';
import { WishlistProvider } from './context/WishlistContext';
import BottomNav from './components/BottomNav';
import ErrorBoundary from './components/ErrorBoundary';
import ShelfLoader from './components/ShelfLoader';

// Home is the entry screen — keep it in the main chunk.
import Home from './pages/Home';

// Everything else is split out so a first visit does not download the whole app.
const Catalog       = lazy(() => import('./pages/Catalog'));
const BookDetail    = lazy(() => import('./pages/BookDetail'));
const Cart          = lazy(() => import('./pages/Cart'));
const Profile       = lazy(() => import('./pages/Profile'));
const Wishlist      = lazy(() => import('./pages/Wishlist'));
const Orders        = lazy(() => import('./pages/Orders'));
const Discover      = lazy(() => import('./pages/Discover'));
const PaymentReturn = lazy(() => import('./pages/PaymentReturn'));

import './index.css';

// Initialize Telegram WebApp
if (window.Telegram?.WebApp) {
  window.Telegram.WebApp.ready();
  window.Telegram.WebApp.expand();
  document.body.style.background = 'var(--bg)';
}

const NOT_FOUND_T = {
  title: { uz: 'Sahifa topilmadi', ru: 'Страница не найдена', en: 'Page not found' },
  desc: {
    uz: 'Siz izlagan sahifa mavjud emas yoki ko\'chirilgan.',
    ru: 'Запрошенная страница не существует или была перемещена.',
    en: 'The page you were looking for does not exist or has moved.',
  },
  home: { uz: 'Bosh sahifaga', ru: 'На главную', en: 'Go home' },
};

function NotFound() {
  const { lang } = useLang();
  const t = (k) => NOT_FOUND_T[k]?.[lang] ?? NOT_FOUND_T[k]?.uz;
  return (
    <div className="page" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '70dvh', textAlign: 'center', padding: '32px 24px', gap: 10,
    }}>
      <div style={{ fontSize: 48, lineHeight: 1 }}>🔍</div>
      <h2 style={{ fontSize: 20 }}>{t('title')}</h2>
      <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.5, maxWidth: 320 }}>{t('desc')}</p>
      <Link to="/" style={{ textDecoration: 'none', marginTop: 8 }}>
        <button className="btn-primary" style={{ width: 'auto', padding: '10px 22px' }}>{t('home')}</button>
      </Link>
    </div>
  );
}

function RouteFallback() {
  // Route chunks resolve in milliseconds on a warm connection, so this stays
  // invisible unless the network is genuinely slow.
  return <div className="page"><ShelfLoader /></div>;
}

function AppRoutes() {
  const { lang } = useLang();
  const location = useLocation();
  const navigate = useNavigate();

  // Keep the document language in sync with the chosen UI language.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // ── Payment return & cart deep-link handler ─────────────────────────────
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.slice(1));

    if (urlParams.get('payment') === 'success') {
      const orderId = urlParams.get('order_id') ?? '';
      navigate(`/payment-return?order_id=${orderId}`, { replace: true });
      return;
    }

    const startParam = tg?.initDataUnsafe?.start_param 
      || urlParams.get('startapp') 
      || urlParams.get('tgWebAppStartParam')
      || hashParams.get('startapp')
      || hashParams.get('tgWebAppStartParam')
      || '';

    if (startParam.startsWith('cart_')) {
      navigate('/cart', { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hideNav = location.pathname.startsWith('/payment-return');

  return (
    <>
      <ErrorBoundary lang={lang} key={location.pathname}>
        <Suspense fallback={<RouteFallback />}>
          <AnimatePresence mode="wait" initial={false}>
            <Routes location={location} key={location.pathname}>
              <Route path="/"            element={<Home />} />
              <Route path="/catalog"     element={<Catalog />} />
              <Route path="/book/:id"    element={<BookDetail />} />
              <Route path="/cart"        element={<Cart />} />
              <Route path="/discover"    element={<Discover />} />
              <Route path="/profile"     element={<Profile />} />
              <Route path="/wishlist"    element={<Wishlist />} />
              <Route path="/orders"      element={<Orders />} />
              <Route path="/payment-return" element={<PaymentReturn />} />
              <Route path="*"            element={<NotFound />} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </ErrorBoundary>
      {!hideNav && <BottomNav lang={lang} />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LangProvider>
        <CartProvider>
          <WishlistProvider>
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
          </WishlistProvider>
        </CartProvider>
      </LangProvider>
    </BrowserRouter>
  );
}
