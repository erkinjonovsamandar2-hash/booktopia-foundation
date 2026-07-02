import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { imgUrl } from "@/lib/imageUrl";
import "./MiniCart.css";

// ── Resolve cover URL ─────────────────────────────────────────────────────────
const resolveUrl = (url: string | null | undefined): string => {
  return imgUrl(url) || "";
};

// ── Qty stepper (big touch targets) ──────────────────────────────────────────
function QtyControl({
  qty,
  onMinus,
  onPlus,
}: {
  qty: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div className="mc-qty-ctrl">
      <button className="mc-qty-btn" onClick={onMinus} aria-label="Kamroq">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14" /></svg>
      </button>
      <motion.span
        key={qty}
        initial={{ scale: 1.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 22 }}
        className="mc-qty-num"
      >{qty}</motion.span>
      <button className="mc-qty-btn mc-qty-btn--plus" onClick={onPlus} aria-label="Ko'proq">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MiniCart() {
  const { items, totalCount, totalPrice, miniCartOpen, openMiniCart, closeMiniCart, updateQty, removeItem, clearCart } = useCart();
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside tap
  useEffect(() => {
    if (!miniCartOpen) return;
    const t = setTimeout(() => {
      const handler = (e: MouseEvent) => {
        if (panelRef.current && !panelRef.current.contains(e.target as Node)) closeMiniCart();
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, 80);
    return () => clearTimeout(t);
  }, [miniCartOpen, closeMiniCart]);

  // Escape key
  useEffect(() => {
    if (!miniCartOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closeMiniCart(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [miniCartOpen, closeMiniCart]);

  // Listen for FAB open event
  useEffect(() => {
    const handler = () => openMiniCart();
    document.addEventListener("booktopia:open-cart", handler);
    return () => document.removeEventListener("booktopia:open-cart", handler);
  }, [openMiniCart]);

  const handleOrder = () => {
    closeMiniCart();
    // Encode cart items as compact startapp parameter for Telegram miniapp deep-link
    // Format: cart_<8charID>x<qty>_<8charID>x<qty>  (fits within 256 char limit)
    const cartPayload = items
      .map((item) => `${item.id.replace(/-/g, "").slice(0, 8)}x${item.qty}`)
      .join("_");
    const startapp = cartPayload ? `cart_${cartPayload}` : "";
    window.open(
      `https://t.me/Booktopiapress_bot/app${startapp ? `?startapp=${startapp}` : ""}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleContinue = () => {
    closeMiniCart();
    navigate("/library");
  };

  return (
    <>
      {/* ── Backdrop ── */}
      <AnimatePresence>
        {miniCartOpen && (
          <motion.div
            key="mc-bd"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="mc-backdrop"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* ── Panel ── */}
      <AnimatePresence>
        {miniCartOpen && (
          <motion.div
            key="mc-panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Savatcham"
            id="mini-cart-panel"
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 32, mass: 1 }}
            className="mc-panel"
          >
            {/* Drag handle */}
            <div className="mc-drag-handle" />

            {/* ── Header ── */}
            <div className="mc-header">
              <div className="mc-header-left">
                <div className="mc-header-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                </div>
                <div>
                  <h2 className="mc-title">Savatcham</h2>
                  {totalCount > 0 && (
                    <p className="mc-subtitle">{totalCount} ta kitob tanlangan</p>
                  )}
                </div>
              </div>
              <div className="mc-header-right">
                {items.length > 0 && (
                  <button className="mc-clear-btn" onClick={clearCart} aria-label="Hammani o'chirish">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6M14 11v6M9 6V4h6v2" />
                    </svg>
                    Tozalash
                  </button>
                )}
                <button className="mc-close-btn" onClick={closeMiniCart} aria-label="Yopish">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* ── Empty state ── */}
            {items.length === 0 ? (
              <div className="mc-empty">
                <div className="mc-empty-art" aria-hidden="true">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
                    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                </div>
                <p className="mc-empty-title">Savatcha bo'sh</p>
                <p className="mc-empty-hint">Har bir kitob kartasidagi <strong>+</strong> tugmasini bosing</p>
                <button id="mc-go-library" className="mc-btn-go" onClick={handleContinue}>
                  Kitoblar katalogiga o'tish →
                </button>
              </div>
            ) : (
              <>
                {/* ── Item list ── */}
                <ul className="mc-list" role="list">
                  <AnimatePresence initial={false}>
                    {items.map((item) => (
                      <motion.li
                        key={item.id}
                        layout
                        initial={{ opacity: 0, x: 32 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -32, height: 0, paddingBlock: 0, marginBottom: 0 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        className="mc-item"
                        role="listitem"
                      >
                        {/* Cover */}
                        <div className="mc-cover-wrap">
                          {item.cover_url ? (
                            <img src={resolveUrl(item.cover_url)} alt={item.title} className="mc-cover" loading="lazy" />
                          ) : (
                            <div className="mc-cover-ph" aria-hidden="true">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="mc-info">
                          <p className="mc-item-title">{item.title}</p>
                          <p className="mc-item-author">{item.author}</p>
                          {item.price && (
                            <p className="mc-item-price">{(item.price * item.qty).toLocaleString()} so'm</p>
                          )}
                        </div>

                        {/* Qty + remove */}
                        <div className="mc-controls">
                          <QtyControl
                            qty={item.qty}
                            onMinus={() => item.qty === 1 ? removeItem(item.id) : updateQty(item.id, item.qty - 1)}
                            onPlus={() => updateQty(item.id, item.qty + 1)}
                          />
                          <button
                            className="mc-remove-btn"
                            onClick={() => removeItem(item.id)}
                            aria-label={`${item.title}ni o'chirish`}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 6 6 18M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>

                {/* ── Summary + CTAs ── */}
                <div className="mc-footer">
                  {/* Total */}
                  {totalPrice > 0 && (
                    <div className="mc-total-bar">
                      <span className="mc-total-label">Jami:</span>
                      <motion.span
                        key={totalPrice}
                        initial={{ scale: 1.15 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        className="mc-total-val"
                      >
                        {totalPrice.toLocaleString()} so'm
                      </motion.span>
                    </div>
                  )}

                  {/* Primary CTA — opens Telegram bot miniapp with cart */}
                  <button id="mc-order-btn" className="mc-btn-order" onClick={handleOrder}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />
                    </svg>
                    Buyurtma berish
                  </button>

                  {/* Continue shopping */}
                  <button id="mc-continue-btn" className="mc-btn-more" onClick={handleContinue}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Yana kitob qo'shish
                  </button>

                  {/* Payment logos */}
                  <div className="mc-pay-row">
                    <span className="mc-pay-label">To'lov usullari</span>
                    <div className="mc-pay-logos">
                      <img src="/payme-logo.png" alt="Payme" className="mc-pay-img" loading="lazy" />
                      <img src="/click-logo.png" alt="Click" className="mc-pay-img" loading="lazy" />
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating cart bubble ── */}
      <AnimatePresence>
        {totalCount > 0 && !miniCartOpen && (
          <motion.button
            id="mini-cart-fab"
            key="mc-fab"
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 20 }}
            whileTap={{ scale: 0.93 }}
            transition={{ type: "spring", stiffness: 420, damping: 24 }}
            className="mc-fab"
            onClick={() => document.dispatchEvent(new CustomEvent("booktopia:open-cart"))}
            aria-label={`Savatcha: ${totalCount} ta kitob`}
          >
            {/* Cart icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {/* Animated count badge */}
            <motion.span
              key={totalCount}
              initial={{ scale: 1.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              className="mc-fab-badge"
            >
              {totalCount}
            </motion.span>
            {/* Price preview */}
            {totalPrice > 0 && (
              <span className="mc-fab-price">{totalPrice.toLocaleString()} so'm</span>
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
