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
      className={`btn-glass-ghost px-12 py-5 transition-all duration-300 inline-flex items-center gap-3 ${
        hasExcerpt && !loading
          ? "opacity-100 cursor-pointer"
          : "opacity-40 cursor-not-allowed pointer-events-none"
      }`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      Parchani o'qish
    </button>
  );
};

export default ExcerptReader;
