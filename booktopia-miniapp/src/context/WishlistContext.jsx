import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const WishlistContext = createContext(null);

const STORAGE_KEY = 'booktopia_wish';

const read = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter(id => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

/**
 * Single source of truth for the wishlist.
 *
 * Previously each heart button held its own useState seeded once from
 * localStorage, so un-hearting a book on /wishlist updated storage but left the
 * card on screen, and the same book rendered twice would drift out of sync.
 */
export const WishlistProvider = ({ children }) => {
  const [ids, setIds] = useState(read);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch (e) {
      console.error('[Wishlist] Could not persist:', e);
    }
  }, [ids]);

  // Keep multiple tabs / webviews consistent.
  useEffect(() => {
    const onStorage = (e) => { if (e.key === STORAGE_KEY) setIds(read()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const isSaved = useCallback((id) => ids.includes(id), [ids]);

  const toggle = useCallback((id) => {
    setIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }, []);

  const remove = useCallback((id) => setIds(prev => prev.filter(x => x !== id)), []);

  return (
    <WishlistContext.Provider value={{ ids, isSaved, toggle, remove }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
};
