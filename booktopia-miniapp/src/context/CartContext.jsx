import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getEffectivePrice } from '../lib/utils';
import { supabase } from '../lib/supabase';

const CartContext = createContext(null);

const STORAGE_KEY = 'booktopia_cart';

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
    } catch {
      return [];
    }
  });
  const deepLinkProcessed = useRef(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  // ── Deep-link: import cart from website via Telegram startapp param ────────
  useEffect(() => {
    if (deepLinkProcessed.current) return;
    deepLinkProcessed.current = true;

    const tg = window.Telegram?.WebApp;
    const startParam = tg?.initDataUnsafe?.start_param || '';
    if (!startParam.startsWith('cart_')) return;

    // Parse: cart_<8charID>x<qty>_<8charID>x<qty>
    const payload = startParam.slice(5); // remove "cart_"
    const entries = payload.split('_').map(part => {
      const [idPrefix, qtyStr] = part.split('x');
      return { idPrefix, qty: parseInt(qtyStr, 10) || 1 };
    }).filter(e => e.idPrefix && e.idPrefix.length >= 6);

    if (entries.length === 0) return;

    // Fetch books matching the ID prefixes
    const importCart = async () => {
      const { data: books } = await supabase
        .from('books')
        .select('id, title, author, cover_url, price, category')
        .eq('shop_visible', true);

      if (!books || books.length === 0) return;

      // Match books by first 8 chars of UUID (without dashes)
      const newItems = [];
      for (const entry of entries) {
        const match = books.find(b => b.id.replace(/-/g, '').startsWith(entry.idPrefix));
        if (match) {
          newItems.push({
            id: match.id,
            title: match.title,
            author: match.author,
            cover_url: match.cover_url,
            price: match.price,
            category: match.category,
            qty: entry.qty,
          });
        }
      }

      if (newItems.length > 0) {
        setItems(newItems);
        // Navigate to cart page after a short delay to let the app mount
        setTimeout(() => {
          window.location.hash = '';
          window.history.replaceState(null, '', '/cart');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }, 300);
      }
    };

    importCart();
  }, []);

  const addItem = (book) => {
    setItems(prev => {
      const exists = prev.find(i => i.id === book.id);
      if (exists) {
        return prev.map(i => i.id === book.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...book, qty: 1 }];
    });
  };

  const removeItem = (id) => setItems(prev => prev.filter(i => i.id !== id));

  const incrementQty = (id) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, qty: i.qty + 1 } : i));
  };

  const decrementQty = (id) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === id);
      if (existing && existing.qty <= 1) {
        return prev.filter(i => i.id !== id);
      }
      return prev.map(i => i.id === id ? { ...i, qty: i.qty - 1 } : i);
    });
  };

  const clearCart = () => setItems([]);

  const totalPrice = items.reduce((sum, i) => sum + getEffectivePrice(i.price, i.qty) * i.qty, 0);
  const totalCount = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, incrementQty, decrementQty, clearCart, totalPrice, totalCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};

