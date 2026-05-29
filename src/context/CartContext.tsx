import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import type { Book, NewBook } from "@/types/database";

// ── Cart item type ────────────────────────────────────────────────────────────
export interface CartItem {
  id: string;
  slug: string;
  title: string;
  author: string;
  cover_url: string | null;
  price: number | null;
  qty: number;
}

// ── Context shape ─────────────────────────────────────────────────────────────
interface CartContextType {
  items: CartItem[];
  totalCount: number;
  totalPrice: number;
  miniCartOpen: boolean;
  addItem: (book: Book | NewBook) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  openMiniCart: () => void;
  closeMiniCart: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};

// ── localStorage helpers ───────────────────────────────────────────────────────
const STORAGE_KEY = "booktopia_cart";

const loadFromStorage = (): CartItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
};

const saveToStorage = (items: CartItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // storage quota exceeded — silently ignore
  }
};

// ── Provider ──────────────────────────────────────────────────────────────────
export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(loadFromStorage);
  const [miniCartOpen, setMiniCartOpen] = useState(false);

  // Persist to localStorage on every change
  useEffect(() => {
    saveToStorage(items);
  }, [items]);

  const totalCount = items.reduce((s, i) => s + i.qty, 0);
  const totalPrice = items.reduce((s, i) => s + (i.price ?? 0) * i.qty, 0);

  const addItem = useCallback((book: Book | NewBook) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === book.id);
      if (existing) {
        return prev.map((i) =>
          i.id === book.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      const newItem: CartItem = {
        id: book.id,
        slug: book.slug ?? book.id,
        title: book.title,
        author: book.author,
        cover_url: book.cover_url ?? null,
        price: book.price ?? null,
        qty: 1,
      };
      return [...prev, newItem];
    });
    setMiniCartOpen(true);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQty = useCallback((id: string, qty: number) => {
    if (qty < 1) return;
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, qty } : i))
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const openMiniCart = useCallback(() => setMiniCartOpen(true), []);
  const closeMiniCart = useCallback(() => setMiniCartOpen(false), []);

  return (
    <CartContext.Provider
      value={{
        items,
        totalCount,
        totalPrice,
        miniCartOpen,
        addItem,
        removeItem,
        updateQty,
        clearCart,
        openMiniCart,
        closeMiniCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
