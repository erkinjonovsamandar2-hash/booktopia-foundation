import { Routes, Route, Navigate } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { LangProvider, useLang } from './context/LangContext';
import BottomNav from './components/BottomNav';

import Home from './pages/Home';
import Catalog from './pages/Catalog';
import BookDetail from './pages/BookDetail';
import Cart from './pages/Cart';
import Profile from './pages/Profile';

import './index.css';

// Initialize Telegram WebApp
if (window.Telegram?.WebApp) {
  window.Telegram.WebApp.ready();
  window.Telegram.WebApp.expand();
  // Match app background to Telegram
  document.body.style.background = 'var(--bg)';
}

function AppRoutes() {
  const { lang } = useLang();

  return (
    <>
      <Routes>
        <Route path="/"            element={<Home />} />
        <Route path="/catalog"     element={<Catalog />} />
        <Route path="/book/:id"    element={<BookDetail />} />
        <Route path="/cart"        element={<Cart />} />
        <Route path="/profile"     element={<Profile />} />
        <Route path="*"            element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav lang={lang} />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LangProvider>
        <CartProvider>
          <AppRoutes />
        </CartProvider>
      </LangProvider>
    </BrowserRouter>
  );
}
