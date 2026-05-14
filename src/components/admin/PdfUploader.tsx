import { useRef, useState } from "react";
import { Upload, FileText, X, RefreshCw, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_PROJECT_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";

const MAX_FILE_MB = 20;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

interface PdfUploaderProps {
  /** Currently saved excerpt URL (public storage URL). Null means no excerpt. */
  currentUrl: string | null;
  /** Book ID used to build a deterministic storage path. */
  bookId?: string | null;
  /** Called when a PDF is successfully uploaded or removed. */
  onPdfSaved: (url: string | null) => void;
}

const PdfUploader = ({ currentUrl, bookId, onPdfSaved }: PdfUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Validate the chosen file before uploading
  const validate = (file: File): string | null => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return "Faqat PDF fayl qabul qilinadi.";
    }
    if (file.size > MAX_FILE_BYTES) {
      return `Fayl hajmi ${MAX_FILE_MB} MB dan oshmasligi kerak.`;
    }
    return null;
  };

  const upload = async (file: File) => {
    const err = validate(file);
    if (err) { setLocalError(err); return; }
    setLocalError(null);
    setUploading(true);
    setProgress(10);

    try {
      // Build a deterministic path that preserves the original filename
      const prefix = bookId ? bookId : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      // Sanitize filename: replace spaces with underscores and remove problematic chars
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const path = `excerpts/${prefix}-${sanitizedName}`;

      setProgress(30);

      const { data, error } = await supabase.storage
        .from("books")
        .upload(path, file, {
          contentType: "application/pdf",
          cacheControl: "3600",
          upsert: true, // overwrite if a previous PDF exists for this book
        });

      setProgress(80);

      if (error) {
        setLocalError("Yuklashda xatolik: " + error.message);
        return;
      }

      const publicUrl = `${SUPABASE_PROJECT_URL}/storage/v1/object/public/books/${data.path}`;
      setProgress(100);
      onPdfSaved(publicUrl);
    } catch (e: any) {
      setLocalError("Kutilmagan xato: " + e.message);
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 800);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = ""; // allow re-picking the same file
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  };

  const handleRemove = () => {
    // We don't delete from Storage here — DataContext.deleteBook handles that.
    // But if the admin wants to remove just the excerpt while keeping the book,
    // we pass null to trigger a DB update via BookManager's save flow.
    onPdfSaved(null);
  };

  // Extract a readable filename from the URL for display
  const displayName = currentUrl
    ? decodeURIComponent(currentUrl.split("/").pop() ?? "parcha.pdf")
    : null;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground/80">
        Parcha (PDF)
      </label>

      {/* ── Existing excerpt status ── */}
      {currentUrl && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-green-800">Parcha yuklangan</p>
            <p className="text-xs text-green-700 truncate max-w-[220px]">{displayName}</p>
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              title="Almashtirish"
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Almashtirish
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              title="O'chirish"
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
              O'chirish
            </button>
          </div>
        </div>
      )}

      {/* ── Drop zone (shown when no excerpt OR when uploading a replacement) ── */}
      {!currentUrl && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`
            relative flex flex-col items-center justify-center gap-2.5 rounded-xl
            border-2 border-dashed px-4 py-7 text-center cursor-pointer
            transition-all duration-200
            ${dragOver
              ? "border-amber-400 bg-amber-50 scale-[1.01]"
              : "border-gray-300 bg-gray-50 hover:border-amber-400 hover:bg-amber-50/40"
            }
            ${uploading ? "pointer-events-none" : ""}
          `}
        >
          {uploading ? (
            <>
              <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
              <p className="text-sm font-medium text-foreground/70">Yuklanmoqda...</p>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground/80">
                  PDF faylni shu yerga tashlang
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  yoki <span className="text-amber-600 font-semibold">tanlash</span> uchun bosing · Maks. {MAX_FILE_MB} MB
                </p>
              </div>
              <Upload className="h-4 w-4 text-muted-foreground/50 absolute bottom-3 right-3" />
            </>
          )}
        </div>
      )}

      {/* ── Progress bar ── */}
      {uploading && progress > 0 && (
        <div className="w-full h-1.5 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full bg-amber-400 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* ── Error message ── */}
      {localError && (
        <p className="text-xs text-red-600 font-medium flex items-center gap-1.5">
          <X className="h-3.5 w-3.5" /> {localError}
        </p>
      )}

      {/* ── Hidden file input ── */}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      <p className="text-[11px] text-muted-foreground/60 leading-snug">
        Parcha faqat tanlangan foydalanuvchilarga vaqtinchalik havolalar orqali ko'rsatiladi.
        To'g'ridan-to'g'ri yuklab olish imkoni cheklanadi.
      </p>
    </div>
  );
};

export default PdfUploader;
