import { useState, useRef } from "react";
import { useData, SiteSettings } from "@/context/DataContext";
import { Save, Globe, MapPin, MessageSquare, BookMarked, Palette, ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PRIMARY_COLORS: { value: "blue" | "sky" | "gold"; label: string; hex: string; desc: string }[] = [
  { value: "blue", label: "Moviy",       hex: "#007FFF", desc: "Asosiy (hozirgi)" },
  { value: "sky",  label: "Qorong'u ko'k", hex: "#0F2842", desc: '"Bizning" rangi' },
  { value: "gold", label: "Oltin",       hex: "#D5AD36", desc: "Brend oltin" },
];

const SiteSettingsManager = () => {
  const { siteSettings, updateSiteSettings } = useData();
  const [settings, setSettings] = useState<SiteSettings>({
    ...siteSettings,
    yangiNashrlar: siteSettings.yangiNashrlar ?? { bg_image_url: "" },
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bgUploading, setBgUploading] = useState(false);
  const bgInputRef = useRef<HTMLInputElement>(null);

  // Resize a File to max MAX_BG_DIM px on longest side, output as WebP blob.
  // Background images are blurred anyway — 1920px is more than enough.
  const MAX_BG_DIM = 1920;
  const resizeImage = (file: File): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > MAX_BG_DIM || h > MAX_BG_DIM) {
          const ratio = Math.min(MAX_BG_DIM / w, MAX_BG_DIM / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
          "image/webp",
          0.80,
        );
      };
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = URL.createObjectURL(file);
    });

  const handleBgUpload = async (file: File) => {
    setBgUploading(true);
    try {
      // Resize + convert to WebP before uploading (2.6MB PNG → ~200KB WebP)
      const resizedBlob = await resizeImage(file);
      const path = `site/yangi-nashrlar-bg-${Date.now()}.webp`;
      const { error: upErr } = await supabase.storage.from("books").upload(path, resizedBlob, {
        contentType: "image/webp",
        cacheControl: "31536000, public, immutable",
        upsert: true,
      });
      if (upErr) throw upErr;
      // Use the real Supabase URL (not the dev proxy) so the stored URL
      // works in both dev and production environments.
      const url = `${import.meta.env.VITE_SUPABASE_URL as string}/storage/v1/object/public/books/${path}`;
      // Build updated settings and auto-save — no separate button press needed
      const next = { ...settings, yangiNashrlar: { bg_image_url: url } };
      setSettings(next);
      await updateSiteSettings(next);
      toast.success("Fon rasm saqlandi va saytda yangilandi!");
    } catch (err: any) {
      toast.error("Yuklashda xato: " + err.message);
    } finally {
      setBgUploading(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    try {
      await updateSiteSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Saqlashda xato yuz berdi.");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Sayt Sozlamalari</h1>
        <button onClick={handleSave} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">
          <Save className="h-4 w-4" /> {saved ? "Saqlandi ✓" : "Saqlash"}
        </button>
      </div>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Hero */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-foreground/90">Bosh sahifa (Hero)</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Shior (motto)</label>
            <input value={settings.hero.motto} onChange={(e) => setSettings({ ...settings, hero: { ...settings.hero, motto: e.target.value } })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Qo'shimcha matn</label>
            <textarea value={settings.hero.subtitle} onChange={(e) => setSettings({ ...settings, hero: { ...settings.hero, subtitle: e.target.value } })} rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Tugma matni</label>
            <input value={settings.hero.cta_text} onChange={(e) => setSettings({ ...settings, hero: { ...settings.hero, cta_text: e.target.value } })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-foreground/90">Footer (pastki qism)</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Telefon</label>
            <input value={settings.footer.phone} onChange={(e) => setSettings({ ...settings, footer: { ...settings.footer, phone: e.target.value } })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Email</label>
            <input value={settings.footer.email} onChange={(e) => setSettings({ ...settings, footer: { ...settings.footer, email: e.target.value } })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Manzil</label>
            <input value={settings.footer.address} onChange={(e) => setSettings({ ...settings, footer: { ...settings.footer, address: e.target.value } })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Telegram link</label>
            <input value={settings.footer.telegram} onChange={(e) => setSettings({ ...settings, footer: { ...settings.footer, telegram: e.target.value } })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-foreground/80 mb-1">Instagram link</label>
            <input value={settings.footer.instagram} onChange={(e) => setSettings({ ...settings, footer: { ...settings.footer, instagram: e.target.value } })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none" />
          </div>
        </div>
      </div>

      {/* Book of the Month */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BookMarked className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-foreground/90">Oy Kitobi — Iqtibos va nishon</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Iqtibos (katta matn)</label>
            <textarea
              value={settings.bookOfMonth.quote}
              onChange={(e) => setSettings({ ...settings, bookOfMonth: { ...settings.bookOfMonth, quote: e.target.value } })}
              rows={4}
              placeholder="Kitobdan yoki muallif haqidagi iqtibos..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Iqtibos muallifi (ixtiyoriy)</label>
            <input
              value={settings.bookOfMonth.quote_author}
              onChange={(e) => setSettings({ ...settings, bookOfMonth: { ...settings.bookOfMonth, quote_author: e.target.value } })}
              placeholder="Masalan: Dostoevsky"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Nishon matni</label>
            <input
              value={settings.bookOfMonth.badge}
              onChange={(e) => setSettings({ ...settings, bookOfMonth: { ...settings.bookOfMonth, badge: e.target.value } })}
              placeholder="Masalan: Jahon durdonasi"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
            />
          </div>
          <p className="text-xs text-muted-foreground/70">Kitob nomi, muallif va muqova — Kitoblar bo'limida "Featured" belgisi qo'yilgan kitobdan olinadi.</p>
        </div>
      </div>

      {/* Theme Color */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-foreground/90">Asosiy rang (Primary color)</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Tugmalar, faol havolalar, pill-larning rangi. Saqlash bilan zudlik bilan barcha sahifalarda o'zgaradi.
        </p>
        <div className="flex flex-wrap gap-3">
          {PRIMARY_COLORS.map((opt) => {
            const isActive = (settings.theme?.primary_color ?? "blue") === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  setSettings({ ...settings, theme: { ...settings.theme, primary_color: opt.value } });
                  document.documentElement.dataset.primary = opt.value;
                }}
                className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 transition-all ${
                  isActive ? "border-gray-800 shadow-md" : "border-gray-200 hover:border-gray-400"
                }`}
              >
                <span
                  className="w-6 h-6 rounded-full border border-black/10 shadow-sm flex-shrink-0"
                  style={{ background: opt.hex }}
                />
                <span className="text-left">
                  <span className="block text-sm font-semibold text-foreground">{opt.label}</span>
                  <span className="block text-xs text-muted-foreground">{opt.desc}</span>
                </span>
                {isActive && (
                  <span className="ml-auto text-xs font-bold text-gray-600 bg-gray-100 rounded-full px-2 py-0.5">Faol</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Yangi Nashrlar background painting */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-foreground/90">Tez Orada — Fon rasm</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Rasm xira ko'rsatiladi (blur + overlay) — faqat jozibali fon sifatida ishlatiladi. AI rasm generatsiya qiling, so'ng bu yerga yuklang.
        </p>
        <div className="space-y-3">
          {settings.yangiNashrlar?.bg_image_url && (
            <div className="relative rounded-lg overflow-hidden border border-gray-200 h-32">
              <img
                src={settings.yangiNashrlar.bg_image_url}
                alt="Fon rasm"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setSettings((s) => ({ ...s, yangiNashrlar: { bg_image_url: "" } }))}
                  className="text-xs font-semibold text-white bg-red-600/80 px-3 py-1.5 rounded-lg"
                >
                  O'chirish
                </button>
              </div>
            </div>
          )}
          <input
            ref={bgInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBgUpload(f); }}
          />
          <button
            onClick={() => bgInputRef.current?.click()}
            disabled={bgUploading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {bgUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            {bgUploading ? "Yuklanmoqda..." : settings.yangiNashrlar?.bg_image_url ? "Boshqa rasm yuklash" : "Rasm yuklash"}
          </button>
          {settings.yangiNashrlar?.bg_image_url && (
            <p className="text-xs text-muted-foreground/70 font-mono break-all">{settings.yangiNashrlar.bg_image_url}</p>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-foreground/90">Google Maps</h2>
        </div>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-foreground/80 cursor-pointer">
            <input type="checkbox" checked={settings.map.enabled} onChange={(e) => setSettings({ ...settings, map: { ...settings.map, enabled: e.target.checked } })} className="rounded border-gray-300 text-accent focus:ring-amber-200" />
            Xaritani ko'rsatish
          </label>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Sarlavha</label>
            <input value={settings.map.title} onChange={(e) => setSettings({ ...settings, map: { ...settings.map, title: e.target.value } })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Google Maps Embed URL</label>
            <input value={settings.map.embed_url} onChange={(e) => setSettings({ ...settings, map: { ...settings.map, embed_url: e.target.value } })} placeholder="https://www.google.com/maps/embed?pb=..." className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none" />
            <p className="text-xs text-muted-foreground/80 mt-1">Google Maps → Share → Embed a map → src="..." ichidagi URL ni nusxalang</p>
          </div>
          {settings.map.embed_url && (
            <div className="rounded-lg overflow-hidden border border-gray-200">
              <iframe src={settings.map.embed_url} width="100%" height="200" style={{ border: 0 }} loading="lazy" allowFullScreen />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SiteSettingsManager;
