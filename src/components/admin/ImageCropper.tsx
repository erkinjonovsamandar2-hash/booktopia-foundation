import { useState, useRef, useCallback } from "react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Upload, X, Crop as CropIcon, Scissors } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Always use the real Supabase project URL for storage public URLs,
// never the dev proxy (window.location.origin/_sb).
const SUPABASE_PROJECT_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";

const buildPublicUrl = (bucket: string, path: string): string => {
  return `${SUPABASE_PROJECT_URL}/storage/v1/object/public/${bucket}/${path}`;
};

interface ImageCropperProps {
  currentUrl: string;
  onImageSaved: (url: string) => void;
  aspectRatio?: number; // e.g. 2/3 for book covers, 1 for portraits
  label?: string;
  bucket?: string;
}

const ImageCropper = ({
  currentUrl,
  onImageSaved,
  aspectRatio = 2 / 3,
  label = "Rasm",
  bucket = "books",
}: ImageCropperProps) => {
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [uploading, setUploading] = useState(false);
  const [isCrossOrigin, setIsCrossOrigin] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Load a local file from disk ──────────────────────────────────────────────
  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        setIsCrossOrigin(false); // data URLs are same-origin safe
        setSrc(reader.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
    // Reset so picking the same file again still triggers onChange
    e.target.value = "";
  };

  // ── Load the already-uploaded image for re-cropping ──────────────────────────
  const handleReCrop = () => {
    if (!currentUrl) return;
    setIsCrossOrigin(true); // remote URL — need crossOrigin attr on <img>
    setSrc(currentUrl);
  };

  // ── Auto-select crop centred on load ─────────────────────────────────────────
  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      const cropWidth = Math.min(width, height * (aspectRatio || 1));
      const cropHeight = cropWidth / (aspectRatio || 1);
      setCrop({
        unit: "px",
        x: (width - cropWidth) / 2,
        y: (height - cropHeight) / 2,
        width: cropWidth,
        height: cropHeight,
      });
    },
    [aspectRatio],
  );

  // ── Canvas crop → Blob ────────────────────────────────────────────────────────
  // Cap output to MAX_DIM px on the longest side. Covers display at 60-340px
  // on the site, so 800px gives 2× retina sharpness with ~80% smaller files.
  const MAX_DIM = 800;

  const getCroppedBlob = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!imgRef.current || !completedCrop) {
        resolve(null);
        return;
      }
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

      // Full-resolution crop dimensions
      let outW = completedCrop.width * scaleX;
      let outH = completedCrop.height * scaleY;

      // Downscale if either dimension exceeds MAX_DIM
      if (outW > MAX_DIM || outH > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / outW, MAX_DIM / outH);
        outW = Math.round(outW * ratio);
        outH = Math.round(outH * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      // High-quality downscale
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        imgRef.current,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        outW,
        outH,
      );
      canvas.toBlob((blob) => resolve(blob), "image/webp", 0.82);
    });
  };

  // ── Upload cropped blob to Supabase Storage ───────────────────────────────────
  const handleUpload = async () => {
    setUploading(true);
    try {
      const blob = await getCroppedBlob();
      if (!blob) return;

      const fileName = `${Date.now()}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}.webp`;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, blob, {
          contentType: "image/webp",
          cacheControl: "31536000, public, immutable",
          upsert: false,
        });

      if (error) {
        alert("Rasm yuklashda xatolik: " + error.message);
        throw new Error(error.message);
      }

      // Use the real Supabase project URL, not the dev proxy
      const publicUrl = buildPublicUrl(bucket, data.path);
      onImageSaved(publicUrl);
      setSrc(null);
    } catch (err: any) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-foreground/80 mb-2">
        {label}
      </label>

      {/* ── Current image preview + action buttons ── */}
      {currentUrl && !src && (
        <div className="mb-3 flex items-start gap-3">
          {/* Preview thumbnail — shaped to match the actual card aspect */}
          <div
            className="relative flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
            style={{ width: 72, height: Math.round(72 / aspectRatio) }}
          >
            <img
              src={currentUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>

          {/* Buttons stacked vertically */}
          <div className="flex flex-col gap-1.5 pt-0.5">
            {/* Re-crop existing image */}
            <button
              type="button"
              onClick={handleReCrop}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
            >
              <Scissors className="h-3.5 w-3.5" />
              Rasmni qayta kesish
            </button>

            {/* Replace with a different file */}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              Boshqa rasm tanlash
            </button>

            {/* Remove image */}
            <button
              type="button"
              onClick={() => onImageSaved("")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Rasmni o'chirish
            </button>
          </div>
        </div>
      )}

      {/* ── File picker (no current image) ── */}
      {!src && !currentUrl && (
        <div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2.5 text-sm text-muted-foreground hover:border-amber-400 hover:text-primary transition-colors"
          >
            <Upload className="h-4 w-4" />
            Rasm yuklash
          </button>
        </div>
      )}

      {/* Hidden file input — always rendered so refs work */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onSelectFile}
        className="hidden"
      />

      {/* ── Crop UI ── */}
      {src && (
        <div className="space-y-3">
          {/* Instruction banner */}
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
            <CropIcon className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-800 font-medium">
              Ramkani suring yoki kenglashtiring — ko'rinishni to'g'rilang,
              keyin «Kesib saqlash» tugmasini bosing.
            </p>
          </div>

          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspectRatio}
            className="rounded-lg overflow-hidden"
          >
            <img
              ref={imgRef}
              src={src}
              onLoad={onImageLoad}
              className="max-h-72 w-full object-contain rounded-lg"
              alt="Kesish uchun rasm"
              /* crossOrigin needed when re-cropping a remote URL so the
                 canvas.drawImage call doesn't taint the canvas. */
              crossOrigin={isCrossOrigin ? "anonymous" : undefined}
            />
          </ReactCrop>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <CropIcon className="h-4 w-4" />
              {uploading ? "Yuklanmoqda..." : "Kesib saqlash"}
            </button>
            <button
              type="button"
              onClick={() => setSrc(null)}
              className="px-4 py-2 text-sm text-muted-foreground hover:bg-gray-100 rounded-lg transition-colors"
            >
              Bekor qilish
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageCropper;
