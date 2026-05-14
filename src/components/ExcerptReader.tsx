import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Book } from "@/context/DataContext";

const extractPath = (url: string): string | null => {
  const marker = "/storage/v1/object/public/books/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
};

const ExcerptReader = ({ book }: { book: Book }) => {
  const hasExcerpt = Boolean(book.excerpt_url);
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    if (!book.excerpt_url || loading) return;
    setLoading(true);

    try {
      const path = extractPath(book.excerpt_url);
      if (!path) throw new Error("Parcha topilmadi.");

      const { data, error } = await supabase.storage
        .from("books")
        .createSignedUrl(path, 3600);

      if (error || !data?.signedUrl) throw new Error("Havola yaratishda xatolik.");

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={hasExcerpt ? handleOpen : undefined}
      disabled={!hasExcerpt || loading}
      title={!hasExcerpt ? "Bu kitob uchun parcha hali qo'shilmagan" : undefined}
      className={`group relative inline-flex items-center justify-center gap-3 px-10 py-4 sm:px-12 sm:py-5 rounded-lg overflow-hidden border border-white/20 bg-white/95 text-[#0A192F] hover:bg-white hover:-translate-y-0.5 transition-all duration-300 shadow-[0_8px_30px_rgba(255,255,255,0.12)] hover:shadow-[0_10px_40px_rgba(255,255,255,0.25)] w-full sm:w-auto ${
        hasExcerpt && !loading
          ? "opacity-100 cursor-pointer"
          : "opacity-40 cursor-not-allowed pointer-events-none"
      }`}
    >
      {/* Subtle shine effect on hover */}
      <span className="absolute inset-0 -translate-x-[150%] bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
      <span className="relative flex items-center gap-3 font-sans text-[0.6875rem] font-bold tracking-[0.18em] uppercase">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Parchani o'qish
      </span>
    </button>
  );
};

export default ExcerptReader;
