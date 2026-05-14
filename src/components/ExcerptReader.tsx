import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Book } from "@/context/DataContext";

// ── Helpers ───────────────────────────────────────────────────────────────────

const extractPath = (url: string): string | null => {
  const marker = "/storage/v1/object/public/books/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
};

// ── Component ─────────────────────────────────────────────────────────────────

type State = "idle" | "signing" | "fetching" | "ready" | "error";

const ExcerptReader = ({ book }: { book: Book }) => {
  const hasExcerpt = Boolean(book.excerpt_url);

  const [open, setOpen]         = useState(false);
  const [state, setState]       = useState<State>("idle");
  const [blobUrl, setBlobUrl]   = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setTimeout(() => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
      setState("idle");
      setErrorMsg(null);
    }, 280);
  }, [blobUrl]);

  const handleOpen = async () => {
    if (!book.excerpt_url) return;
    setOpen(true);
    setState("signing");

    // 1 — get signed URL
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

    // 2 — fetch as blob → same-origin URL, no CSP/cross-origin issues
    setState("fetching");
    try {
      const res = await fetch(data.signedUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      // #view=FitPage → browser PDF viewer fits full page centered
      const url = URL.createObjectURL(blob) + "#toolbar=1&view=FitPage&zoom=page-fit";
      setBlobUrl(url);
      setState("ready");
      requestAnimationFrame(() => closeRef.current?.focus());
    } catch (e: any) {
      setState("error");
      setErrorMsg("Yuklab olishda xatolik: " + e.message);
    }
  };

  const isReady = state === "ready" && blobUrl;
  const isLoading = state === "signing" || state === "fetching";

  return (
    <>
      {/* ── Trigger ── */}
      <button
        onClick={hasExcerpt ? handleOpen : undefined}
        disabled={!hasExcerpt}
        title={!hasExcerpt ? "Bu kitob uchun parcha hali qo'shilmagan" : undefined}
        className={`btn-glass-ghost px-12 py-5 transition-all duration-300 ${
          hasExcerpt
            ? "opacity-100 cursor-pointer"
            : "opacity-40 cursor-not-allowed pointer-events-none"
        }`}
      >
        Parchani o'qish
      </button>

      {/* ── Modal ── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="bd"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[999] bg-black/85 backdrop-blur-md"
              onClick={handleClose}
            />

            {/* Centering shell (pointer-events-none → backdrop click still works) */}
            <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center pointer-events-none">
              <motion.div
                key="modal"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="
                  pointer-events-auto
                  w-full sm:w-[92vw] sm:max-w-5xl
                  flex flex-col
                  /* Mobile: bottom sheet, full width, tall */
                  rounded-t-3xl sm:rounded-2xl
                  overflow-hidden
                  border border-white/10
                  shadow-[0_-20px_60px_rgba(0,0,0,0.6)] sm:shadow-[0_40px_80px_rgba(0,0,0,0.8)]
                "
                style={{
                  background: "linear-gradient(160deg,#1a1205 0%,#0f0a02 100%)",
                  // Mobile: 92% of viewport height; desktop: up to 90vh / 860px
                  height: "92svh",
                  maxHeight: "min(92vh, 860px)",
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
                      <p className="font-sans text-[10px] uppercase tracking-[0.4em] text-amber-400/80 font-black">
                        Parcha
                      </p>
                      <h2 className="font-heading font-bold text-amber-50 text-sm sm:text-base leading-tight truncate max-w-[180px] sm:max-w-md">
                        {book.title}
                      </h2>
                    </div>
                  </div>
                  <button
                    ref={closeRef}
                    onClick={handleClose}
                    className="flex-shrink-0 ml-4 w-9 h-9 rounded-xl flex items-center justify-center text-amber-50/60 hover:text-amber-50 hover:bg-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                    aria-label="Yopish"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Body */}
                <div className={`flex-1 min-h-0 flex flex-col ${!isReady ? "items-center justify-center" : ""}`}>

                  {/* Loading */}
                  {isLoading && (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 text-amber-400 animate-spin" />
                      <p className="text-sm text-amber-50/60">
                        {state === "signing" ? "Havola tayyorlanmoqda…" : "Parcha yuklanmoqda…"}
                      </p>
                    </div>
                  )}

                  {/* Error */}
                  {state === "error" && (
                    <div className="flex flex-col items-center gap-4 px-8 text-center">
                      <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center">
                        <AlertCircle className="h-6 w-6 text-red-400" />
                      </div>
                      <p className="text-sm text-amber-50/70 max-w-xs">{errorMsg}</p>
                      <button
                        onClick={handleClose}
                        className="px-5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm text-amber-50/80 transition-colors"
                      >
                        Yopish
                      </button>
                    </div>
                  )}

                  {/* PDF — blob URL works on all devices (desktop + mobile Chrome/Safari) */}
                  {isReady && (
                    <iframe
                      src={blobUrl}
                      title={`${book.title} — Parcha`}
                      className="w-full h-full border-0 block flex-1"
                      style={{ minHeight: 0 }}
                    />
                  )}
                </div>

                {/* Footer */}
                {isReady && (
                  <div className="flex items-center justify-between px-5 py-2.5 border-t border-white/10 flex-shrink-0">
                    <p className="font-sans text-[10px] text-amber-50/30 tracking-wide hidden sm:block">
                      Booktopia tomonidan cheklangan ko'rinishda taqdim etiladi.
                    </p>
                    <button
                      onClick={handleClose}
                      className="text-[11px] text-amber-50/40 hover:text-amber-50/70 transition-colors sm:ml-auto"
                    >
                      Yopish
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
