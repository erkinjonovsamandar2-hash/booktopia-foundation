import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, Loader2, ExternalLink, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Book } from "@/context/DataContext";

// ── Helpers ───────────────────────────────────────────────────────────────────

const extractPath = (url: string): string | null => {
  const marker = "/storage/v1/object/public/books/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
};

const isMobile = () => /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// ── Types ─────────────────────────────────────────────────────────────────────

type ModalState = "idle" | "signing" | "fetching" | "ready" | "error";

// ── Component ─────────────────────────────────────────────────────────────────

const ExcerptReader = ({ book }: { book: Book }) => {
  const hasExcerpt = Boolean(book.excerpt_url);

  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ModalState>("idle");
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null); // mobile signed URL
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open]);

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setTimeout(() => {
      setState("idle");
      if (blobUrl) { URL.revokeObjectURL(blobUrl); setBlobUrl(null); }
      setFallbackUrl(null);
      setErrorMsg(null);
    }, 300);
  }, [blobUrl]);

  const handleOpen = async () => {
    if (!book.excerpt_url) return;
    setOpen(true);
    setState("signing");

    // 1. Get signed URL
    const path = extractPath(book.excerpt_url);
    if (!path) {
      setState("error");
      setErrorMsg("Parcha fayli topilmadi.");
      return;
    }

    const { data, error } = await supabase.storage
      .from("books")
      .createSignedUrl(path, 3600);

    if (error || !data?.signedUrl) {
      setState("error");
      setErrorMsg("Havola yaratishda xatolik yuz berdi.");
      return;
    }

    const signed = data.signedUrl;

    // Mobile: just show a link, don't try to embed
    if (isMobile()) {
      setFallbackUrl(signed);
      setState("ready");
      return;
    }

    // 2. Desktop: fetch PDF as blob → same-origin blob URL (no CSP/cross-origin issue)
    setState("fetching");
    try {
      const res = await fetch(signed);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
      setState("ready");
      requestAnimationFrame(() => closeRef.current?.focus());
    } catch (e: any) {
      setState("error");
      setErrorMsg("Parchani yuklab olishda xatolik: " + e.message);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={hasExcerpt ? handleOpen : undefined}
        disabled={!hasExcerpt}
        title={!hasExcerpt ? "Bu kitob uchun parcha hali qo'shilmagan" : undefined}
        className={`btn-glass-ghost px-12 py-5 transition-all duration-300 ${
          hasExcerpt ? "opacity-100 cursor-pointer" : "opacity-40 cursor-not-allowed pointer-events-none"
        }`}
      >
        Parchani o'qish
      </button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[999] bg-black/85 backdrop-blur-md"
              onClick={handleClose}
            />

            {/* Centering shell — flex centers modal, pointer-events-none so backdrop click passes through */}
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                key="modal"
                initial={{ opacity: 0, scale: 0.96, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 12 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-auto w-full max-w-5xl flex flex-col rounded-2xl overflow-hidden border border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.8)]"
                style={{
                  background: "linear-gradient(160deg, #1a1205 0%, #0f0a02 100%)",
                  height: "min(90vh, 860px)",
                }}
                role="dialog"
                aria-modal="true"
                aria-label={`Parchani o'qish — ${book.title}`}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="h-4 w-4 text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-sans text-[10px] uppercase tracking-[0.4em] text-amber-400/80 font-black">Parcha</p>
                      <h2 className="font-heading font-bold text-amber-50 text-sm sm:text-base leading-tight truncate max-w-[200px] sm:max-w-md">
                        {book.title}
                      </h2>
                    </div>
                  </div>
                  <button
                    ref={closeRef}
                    onClick={handleClose}
                    className="flex-shrink-0 ml-4 w-8 h-8 rounded-lg flex items-center justify-center text-amber-50/60 hover:text-amber-50 hover:bg-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                    aria-label="Yopish"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Body */}
                <div className={`flex-1 min-h-0 flex flex-col ${state !== "ready" ? "items-center justify-center" : ""}`}>

                  {/* Signing */}
                  {state === "signing" && (
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="h-7 w-7 text-amber-400 animate-spin" />
                      <p className="text-sm text-amber-50/60">Havola tayyorlanmoqda…</p>
                    </div>
                  )}

                  {/* Fetching blob */}
                  {state === "fetching" && (
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="h-7 w-7 text-amber-400 animate-spin" />
                      <p className="text-sm text-amber-50/60">Parcha yuklanmoqda…</p>
                    </div>
                  )}

                  {/* Error */}
                  {state === "error" && (
                    <div className="flex flex-col items-center gap-4 px-8 text-center">
                      <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center">
                        <AlertCircle className="h-6 w-6 text-red-400" />
                      </div>
                      <p className="text-sm text-amber-50/70 max-w-xs">{errorMsg ?? "Noma'lum xatolik."}</p>
                      <button
                        onClick={handleClose}
                        className="px-5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm text-amber-50/80 transition-colors"
                      >
                        Yopish
                      </button>
                    </div>
                  )}

                  {/* Mobile fallback */}
                  {state === "ready" && isMobile() && fallbackUrl && (
                    <div className="flex flex-col items-center gap-5 px-8 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-amber-500/15 flex items-center justify-center">
                        <BookOpen className="h-7 w-7 text-amber-400" />
                      </div>
                      <div>
                        <p className="font-heading font-bold text-amber-50 text-lg mb-1">{book.title}</p>
                        <p className="text-sm text-amber-50/60 max-w-xs">PDF parchani ko'rish uchun:</p>
                      </div>
                      <a
                        href={fallbackUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Parchani ochish
                      </a>
                      <p className="text-[11px] text-amber-50/30">Havola 1 soat davomida faol.</p>
                    </div>
                  )}

                  {/* Desktop — blob URL, fully same-origin, no CSP issues */}
                  {state === "ready" && !isMobile() && blobUrl && (
                    <div className="w-full flex-1 min-h-0">
                      <iframe
                        src={blobUrl}
                        title={`${book.title} — Parcha`}
                        className="w-full h-full border-0 block"
                        style={{ minHeight: 0 }}
                      />
                    </div>
                  )}
                </div>

                {/* Footer */}
                {state === "ready" && !isMobile() && blobUrl && (
                  <div className="flex items-center justify-between px-5 py-2.5 border-t border-white/10 flex-shrink-0">
                    <p className="font-sans text-[10px] text-amber-50/30 tracking-wide">
                      Booktopia tomonidan cheklangan ko'rinishda taqdim etiladi.
                    </p>
                    <button
                      onClick={handleClose}
                      className="text-[11px] text-amber-50/40 hover:text-amber-50/70 transition-colors"
                    >
                      ESC — yopish
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default ExcerptReader;
