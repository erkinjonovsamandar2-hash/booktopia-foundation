import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { CartProvider } from './context/CartContext';
import { LangProvider, useLang } from './context/LangContext';
import { ToastProvider } from './context/ToastContext';
import BottomNav from './components/BottomNav';

import Home from './pages/Home';
import Catalog from './pages/Catalog';
import BookDetail from './pages/BookDetail';
import Cart from './pages/Cart';
import Profile from './pages/Profile';
import Wishlist from './pages/Wishlist';
import Orders from './pages/Orders';
import Discover from './pages/Discover';
import PaymentReturn from './pages/PaymentReturn';

import './index.css';

// Initialize Telegram WebApp
if (window.Telegram?.WebApp) {
  window.Telegram.WebApp.ready();
  window.Telegram.WebApp.expand();
  document.body.style.background = 'var(--bg)';
}

function AppRoutes() {
  const { lang } = useLang();
  const location = useLocation();
  const navigate = useNavigate();

  // ── Payment return URL handler ──────────────────────────────────────────────
  // When Payme / Click redirect back to the miniapp they append:
  //   ?payment=success&order_id=<uuid>
  // We navigate to the dedicated PaymentReturn screen to handle both internal/external browsers
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      const orderId = params.get('order_id') ?? '';
      navigate(`/payment-return?order_id=${orderId}`, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
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
          <Route path="*"            element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
      {!location.pathname.startsWith('/book/') && !location.pathname.startsWith('/payment-return') && <BottomNav lang={lang} />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LangProvider>
        <CartProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </CartProvider>
      </LangProvider>
    </BrowserRouter>
  );
}
