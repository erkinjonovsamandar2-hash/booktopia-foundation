import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
