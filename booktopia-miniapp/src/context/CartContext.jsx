import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getEffectivePrice } from '../lib/utils';
import { supabase } from '../lib/supabase';

const CartContext = createContext(null);

const STORAGE_KEY = 'booktopia_cart';
const SCHEMA_VERSION = 2;
const VERSION_KEY = 'booktopia_cart_v';

// Stock helper — NULL means "not tracked", not "out of stock".
export const isOutOfStock = (b) => b?.stock === 0 || (b?.stock != null && b.stock <= 0);
const stockCeiling = (item) => (item?.stock == null ? Infinity : Math.max(0, item.stock));

const loadCart = () => {
  try {
    const version = Number(localStorage.getItem(VERSION_KEY) || 0);
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    // A cart written by an older release may not match the current shape.
    // Rather than trust it blind, keep only entries we can still understand.
    const cleaned = raw.filter(i => i && typeof i.id === 'string' && Number.isFinite(i.qty) && i.qty > 0);
    if (version !== SCHEMA_VERSION) localStorage.setItem(VERSION_KEY, String(SCHEMA_VERSION));
    return cleaned;
  } catch {
    return [];
  }
};

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(loadCart);
  const [importNotice, setImportNotice] = useState(null);
  const deepLinkProcessed = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      localStorage.setItem(VERSION_KEY, String(SCHEMA_VERSION));
    } catch (e) {
      console.error('[Cart] Could not persist:', e);
    }
  }, [items]);

  // ── Deep-link: import cart from website via Telegram startapp param ────────
  useEffect(() => {
    if (deepLinkProcessed.current) return;
    deepLinkProcessed.current = true;

    const tg = window.Telegram?.WebApp;
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const startParam = tg?.initDataUnsafe?.start_param 
      || urlParams.get('startapp') 
      || urlParams.get('tgWebAppStartParam')
      || hashParams.get('startapp')
      || hashParams.get('tgWebAppStartParam')
      || '';

    if (!startParam.startsWith('cart_')) return;

    // Parse: cart_<8charID>x<qty>_<8charID>x<qty>
    const payload = startParam.slice(5); // remove "cart_"
    const entries = payload.split('_').map(part => {
      const [idPrefix, qtyStr] = part.split('x');
      return { idPrefix: (idPrefix || '').trim(), qty: parseInt(qtyStr, 10) || 1 };
    }).filter(e => e.idPrefix && e.idPrefix.length >= 6);

    if (entries.length === 0) return;

    const importCart = async () => {
      // Query both 'books' and 'new_books' to guarantee that books added from any
      // page (catalog, details, or homepage new_books showcase) are matched correctly.
      const [booksRes, newBooksRes] = await Promise.all([
        supabase
          .from('books')
          .select('id, title, author, cover_url, price, stock, category'),
        supabase
          .from('new_books')
          .select('id, title, author, cover_url, price, stock, category')
      ]);

      const allBooks = [];
      const seenIds = new Set();
      for (const b of [...(booksRes.data || []), ...(newBooksRes.data || [])]) {
        if (b && !seenIds.has(b.id)) {
          seenIds.add(b.id);
          allBooks.push(b);
        }
      }

      if (allBooks.length === 0) {
        setImportNotice({ added: 0, skipped: entries.length, failed: true });
        return;
      }

      const incoming = [];
      let skipped = 0;
      for (const entry of entries) {
        const prefix = entry.idPrefix.toLowerCase();
        // 1. Primary match: by ID prefix (case-insensitive)
        let match = allBooks.find(b => String(b.id).replace(/-/g, '').toLowerCase().startsWith(prefix));

        // 2. Secondary match: if added from new_books with a new_books ID, match by title
        if (!match) {
          const rawMatch = (newBooksRes.data || []).find(nb => String(nb.id).replace(/-/g, '').toLowerCase().startsWith(prefix));
          if (rawMatch?.title) {
            const normTitle = rawMatch.title.trim().toLowerCase();
            match = allBooks.find(b => b.title && b.title.trim().toLowerCase() === normTitle);
          }
        }

        if (!match) { skipped++; continue; }
        incoming.push({ ...match, qty: entry.qty });
      }

      if (incoming.length === 0) {
        setImportNotice({ added: 0, skipped, failed: false });
        return;
      }

      // Merge into the existing cart rather than replacing it
      setItems(prev => {
        const merged = [...prev];
        for (const inc of incoming) {
          const at = merged.findIndex(i => i.id === inc.id);
          if (at >= 0) {
            const ceiling = stockCeiling(inc);
            merged[at] = { ...merged[at], qty: Math.min(ceiling, merged[at].qty + inc.qty) };
          } else {
            merged.push(inc);
          }
        }
        return merged;
      });
      setImportNotice({ added: incoming.length, skipped, failed: false });
    };

    importCart();
  }, []);

  const addItem = useCallback((book) => {
    if (isOutOfStock(book)) return;
    setItems(prev => {
      const exists = prev.find(i => i.id === book.id);
      if (exists) {
        const ceiling = stockCeiling(book);
        if (exists.qty >= ceiling) return prev;
        return prev.map(i => i.id === book.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...book, qty: 1 }];
    });
  }, []);

  const removeItem = useCallback((id) => setItems(prev => prev.filter(i => i.id !== id)), []);

  const incrementQty = useCallback((id) => {
    setItems(prev => prev.map(i => {
      if (i.id !== id) return i;
      // Never let the cart exceed what is actually in stock.
      if (i.qty >= stockCeiling(i)) return i;
      return { ...i, qty: i.qty + 1 };
    }));
  }, []);

  const decrementQty = useCallback((id) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === id);
      if (existing && existing.qty <= 1) {
        return prev.filter(i => i.id !== id);
      }
      return prev.map(i => i.id === id ? { ...i, qty: i.qty - 1 } : i);
    });
  }, []);

  // clearCart returns the removed items so the caller can offer an undo.
  const clearCart = useCallback(() => {
    let removed = [];
    setItems(prev => { removed = prev; return []; });
    return removed;
  }, []);

  const restoreCart = useCallback((snapshot) => {
    if (Array.isArray(snapshot) && snapshot.length) setItems(snapshot);
  }, []);

  const atStockCeiling = useCallback((id) => {
    const item = items.find(i => i.id === id);
    return item ? item.qty >= stockCeiling(item) : false;
  }, [items]);

  /**
   * Re-read price and stock from the database for everything in the cart.
   * The cart is a localStorage snapshot taken at add-time, so without this a
   * book that sold out or was repriced keeps showing stale data until checkout
   * rejects it. Returns a summary of what changed.
   */
  const revalidate = useCallback(async () => {
    if (items.length === 0) return null;
    const ids = items.map(i => i.id);
    const { data, error } = await supabase
      .from('books')
      .select('id, title, price, stock, shop_visible, cover_url, author, category')
      .in('id', ids);
    if (error || !data) return null;

    const byId = Object.fromEntries(data.map(b => [b.id, b]));
    const changes = { repriced: [], nowOutOfStock: [], removed: [], reduced: [] };

    setItems(prev => prev.flatMap(item => {
      const fresh = byId[item.id];
      if (!fresh || fresh.shop_visible === false) {
        changes.removed.push(item.title);
        return [];
      }
      const next = { ...item, price: fresh.price, stock: fresh.stock, cover_url: fresh.cover_url ?? item.cover_url };
      if (fresh.price !== item.price) changes.repriced.push(item.title);
      if (isOutOfStock(fresh)) changes.nowOutOfStock.push(item.title);
      const ceiling = stockCeiling(fresh);
      if (next.qty > ceiling) { next.qty = Math.max(1, ceiling); changes.reduced.push(item.title); }
      return [next];
    }));

    const touched = changes.repriced.length + changes.nowOutOfStock.length + changes.removed.length + changes.reduced.length;
    return touched ? changes : null;
  }, [items]);

  const totalPrice = useMemo(
    () => items.reduce((sum, i) => sum + getEffectivePrice(i.price, i.qty) * i.qty, 0),
    [items],
  );
  const totalCount = useMemo(() => items.reduce((sum, i) => sum + i.qty, 0), [items]);

  const value = useMemo(() => ({
    items, addItem, removeItem, incrementQty, decrementQty, clearCart, restoreCart,
    revalidate, atStockCeiling, totalPrice, totalCount,
    importNotice, dismissImportNotice: () => setImportNotice(null),
  }), [items, addItem, removeItem, incrementQty, decrementQty, clearCart, restoreCart,
       revalidate, atStockCeiling, totalPrice, totalCount, importNotice]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
