import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, Loader2, ExternalLink, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Book } from "@/context/DataContext";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Extract the storage path inside the bucket from a full public URL. */
const extractPath = (url: string): string | null => {
  const marker = "/storage/v1/object/public/books/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
};

/** Detect mobile/tablet — iframe PDF viewers are unreliable on iOS/Android. */
const isMobileDevice = () =>
  /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// ── Sub-components ────────────────────────────────────────────────────────────

/** Fullscreen modal backdrop */
const Backdrop = ({ onClick }: { onClick: () => void }) => (
  <motion.div
    key="backdrop"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.25 }}
    className="fixed inset-0 z-[999] bg-black/85 backdrop-blur-md"
    onClick={onClick}
  />
);

// ── Main component ────────────────────────────────────────────────────────────

interface ExcerptReaderProps {
  book: Book;
}

type ModalState = "idle" | "loading" | "ready" | "error" | "mobile";

const ExcerptReader = ({ book }: ExcerptReaderProps) => {
  const hasExcerpt = Boolean(book.excerpt_url);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ModalState>("idle");
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // ── Close on Escape ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  // ── Prevent body scroll when modal is open ────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    // Reset for next open
    setTimeout(() => {
      setState("idle");
      setSignedUrl(null);
      setErrorMsg(null);
    }, 300);
  }, []);

  // ── Fetch a fresh signed URL on open ─────────────────────────────────────
  const handleOpen = async () => {
    if (!book.excerpt_url) return;

    if (isMobileDevice()) {
      // On mobile, we'll just open the signed URL in a new tab
      setState("mobile");
      setOpen(true);
      // Still generate the signed URL for the tap
      const path = extractPath(book.excerpt_url);
      if (!path) { setErrorMsg("Parcha topilmadi."); setState("error"); return; }
      const { data, error } = await supabase.storage
        .from("books")
        .createSignedUrl(path, 60 * 60); // 1 hour
      if (error || !data?.signedUrl) {
        setErrorMsg("Havola yaratishda xatolik yuz berdi.");
        setState("error");
        return;
      }
      setSignedUrl(data.signedUrl);
      setState("ready");
      return;
    }

    setOpen(true);
    setState("loading");

    const path = extractPath(book.excerpt_url);
    if (!path) {
      setState("error");
      setErrorMsg("Parcha fayli topilmadi. Admin bilan bog'laning.");
      return;
    }

    const { data, error } = await supabase.storage
      .from("books")
      .createSignedUrl(path, 60 * 60); // 1 hour expiry

    if (error || !data?.signedUrl) {
      setState("error");
      setErrorMsg("Parchani yuklashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
      return;
    }

    // Append PDF viewer params to suppress toolbar + nav panes (Chrome/Edge)
    setSignedUrl(data.signedUrl + "#toolbar=0&navpanes=0&scrollbar=1&view=FitH");
    setState("ready");

    // Focus the close button for keyboard accessibility
    requestAnimationFrame(() => closeRef.current?.focus());
  };

  return (
    <>
      {/* ── Trigger button ── */}
      <button
        onClick={hasExcerpt ? handleOpen : undefined}
        disabled={!hasExcerpt}
        aria-label={hasExcerpt ? "Parchani o'qish" : "Parcha mavjud emas"}
        title={!hasExcerpt ? "Bu kitob uchun parcha hali qo'shilmagan" : undefined}
        className={`
          btn-glass-ghost px-12 py-5 transition-all duration-300
          ${hasExcerpt
            ? "opacity-100 cursor-pointer"
            : "opacity-40 cursor-not-allowed pointer-events-none select-none"
          }
        `}
      >
        Parchani o'qish
      </button>

      {/* ── Modal ── */}
      <AnimatePresence>
        {open && (
          <>
            <Backdrop onClick={close} />

            <motion.div
              key="modal"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="
                fixed inset-x-4 top-[50%] -translate-y-1/2
                sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2
                z-[1000] w-full sm:w-[92vw] max-w-5xl
                flex flex-col
                rounded-2xl overflow-hidden
                border border-white/10
                shadow-[0_40px_80px_rgba(0,0,0,0.7)]
              "
              style={{
                background: "linear-gradient(160deg, #1a1205 0%, #0f0a02 100%)",
                maxHeight: "90vh",
              }}
              role="dialog"
              aria-modal="true"
              aria-label={`Parchani o'qish — ${book.title}`}
            >
              {/* ── Header ── */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-sans text-[10px] uppercase tracking-[0.4em] text-amber-400/80 font-black">
                      Parcha
                    </p>
                    <h2 className="font-heading font-bold text-amber-50 text-sm sm:text-base leading-tight truncate max-w-[240px] sm:max-w-none">
                      {book.title}
                    </h2>
                  </div>
                </div>

                <button
                  ref={closeRef}
                  onClick={close}
                  className="
                    flex-shrink-0 ml-4 w-8 h-8 rounded-lg
                    flex items-center justify-center
                    text-amber-50/60 hover:text-amber-50 hover:bg-white/10
                    transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400/50
                  "
                  aria-label="Yopish"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* ── Body ── */}
              <div className="flex-1 overflow-hidden min-h-0 flex flex-col items-center justify-center">

                {/* Loading state */}
                {state === "loading" && (
                  <div className="flex flex-col items-center gap-4 py-16">
                    <Loader2 className="h-8 w-8 text-amber-400 animate-spin" />
                    <p className="font-sans text-sm text-amber-50/60">Parcha yuklanmoqda…</p>
                  </div>
                )}

                {/* Error state */}
                {state === "error" && (
                  <div className="flex flex-col items-center gap-4 py-16 px-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center">
                      <AlertCircle className="h-6 w-6 text-red-400" />
                    </div>
                    <p className="font-sans text-sm text-amber-50/70 max-w-xs">
                      {errorMsg ?? "Noma'lum xatolik yuz berdi."}
                    </p>
                    <button
                      onClick={close}
                      className="mt-2 px-5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm text-amber-50/80 transition-colors"
                    >
                      Yopish
                    </button>
                  </div>
                )}

                {/* Mobile fallback */}
                {state === "ready" && isMobileDevice() && signedUrl && (
                  <div className="flex flex-col items-center gap-5 py-16 px-8 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/15 flex items-center justify-center">
                      <BookOpen className="h-7 w-7 text-amber-400" />
                    </div>
                    <div>
                      <p className="font-heading font-bold text-amber-50 text-lg mb-1">{book.title}</p>
                      <p className="font-sans text-sm text-amber-50/60 max-w-xs">
                        Qurilmangizda PDF parchani ko'rish uchun quyidagi tugmani bosing.
                      </p>
                    </div>
                    <a
                      href={signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="
                        inline-flex items-center gap-2
                        px-6 py-3 rounded-xl
                        bg-amber-500 hover:bg-amber-400
                        text-black font-semibold text-sm
                        transition-colors duration-200
                      "
                    >
                      <ExternalLink className="h-4 w-4" />
                      Parchani ochish
                    </a>
                    <p className="text-[11px] text-amber-50/30 max-w-xs">
                      Havola 1 soat davomida faol bo'ladi.
                    </p>
                  </div>
                )}

                {/* Desktop iframe reader */}
                {state === "ready" && !isMobileDevice() && signedUrl && (
                  <div className="w-full flex-1 min-h-0" style={{ height: "calc(90vh - 65px)" }}>
                    <iframe
                      src={signedUrl}
                      title={`${book.title} — Parcha`}
                      className="w-full h-full border-0"
                      sandbox="allow-scripts allow-same-origin"
                      loading="lazy"
                    />
                  </div>
                )}
              </div>

              {/* ── Footer hint ── */}
              {state === "ready" && !isMobileDevice() && (
                <div className="flex items-center justify-between px-5 py-2.5 border-t border-white/10 flex-shrink-0">
                  <p className="font-sans text-[10px] text-amber-50/30 tracking-wide">
                    Bu parcha Booktopia tomonidan cheklangan ko'rinishda taqdim etiladi.
                  </p>
                  <button
                    onClick={close}
                    className="font-sans text-[11px] text-amber-50/50 hover:text-amber-50/80 transition-colors"
                  >
                    ESC — yopish
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default ExcerptReader;
