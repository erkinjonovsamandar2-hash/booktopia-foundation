import { createContext, useContext, useState, useEffect } from 'react';

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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

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

  const totalPrice = items.reduce((sum, i) => sum + (i.price || 0) * i.qty, 0);
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
