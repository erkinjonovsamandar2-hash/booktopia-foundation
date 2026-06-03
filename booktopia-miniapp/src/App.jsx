import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
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

  // ── Payment return URL handler ──────────────────────────────────────────────
  // When Payme / Click redirect back to the miniapp they append:
  //   ?payment=success&order_id=<uuid>
  // We detect this on mount, show a confirmation banner, then clean the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      const orderId = params.get('order_id') ?? '';
      // Fire confetti to celebrate the completed payment
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.55 },
        colors: ['#38A169', '#00CDFE', '#D5AD36'],
      });

      // Clean up the URL so the banner won't re-trigger on back-nav
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);

      // Show a Telegram popup if available, otherwise alert
      const msg =
        lang === 'ru' ? 'Оплата прошла успешно! Ваш заказ подтверждён.' :
        lang === 'en' ? 'Payment successful! Your order is confirmed.' :
                        "To'lov muvaffaqiyatli! Buyurtmangiz tasdiqlandi.";

      if (window.Telegram?.WebApp?.showPopup) {
        window.Telegram.WebApp.showPopup({
          title: lang === 'ru' ? 'Оплата подтверждена' : lang === 'en' ? 'Payment Confirmed' : "To'lov tasdiqlandi",
          message: msg,
          buttons: [{ type: 'ok' }],
        });
      }
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
          <Route path="*"            element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
      {!location.pathname.startsWith('/book/') && <BottomNav lang={lang} />}
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
