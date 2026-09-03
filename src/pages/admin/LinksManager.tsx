import React, { useState, useRef } from "react";
import { useData, SocialLinkItem, LinksPageSettings } from "@/context/DataContext";
import { DEFAULT_SITE_SETTINGS } from "@/lib/mockData";
import LinksPage from "@/pages/LinksPage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Save,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  ImageIcon,
  Loader2,
  Sparkles,
  Link as LinkIcon,
  Smartphone,
  Instagram,
  Send,
  Facebook,
  Youtube,
  Globe,
  Phone,
  Bot,
} from "lucide-react";

const ICON_OPTIONS = [
  { value: "instagram", label: "Instagram", icon: Instagram },
  { value: "telegram", label: "Telegram", icon: Send },
  { value: "facebook", label: "Facebook", icon: Facebook },
  { value: "youtube", label: "YouTube", icon: Youtube },
  { value: "bot", label: "Telegram Bot", icon: Bot },
  { value: "contact", label: "Bog'lanish (Telefon)", icon: Phone },
  { value: "website", label: "Veb-sayt", icon: Globe },
  { value: "link", label: "Boshqa havola", icon: LinkIcon },
];

const LinksManager: React.FC = () => {
  const { siteSettings, updateSiteSettings } = useData();

  const initialData: LinksPageSettings =
    siteSettings?.linksPage || DEFAULT_SITE_SETTINGS.linksPage!;

  const [settings, setSettings] = useState<LinksPageSettings>({
    logo_url: initialData.logo_url || "",
    title: initialData.title || "Booktopia Books",
    subtitle: initialData.subtitle || "NASHRIYOT · PUBLISHER",
    section_title: initialData.section_title || "IJTIMOIY TARMOQLAR",
    links: initialData.links || [],
  });

  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resize and convert logo to WebP before uploading
  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true);
    try {
      const path = `links/logo-${Date.now()}.webp`;
      const { error: upErr } = await supabase.storage
        .from("books")
        .upload(path, file, {
          contentType: file.type || "image/webp",
          upsert: true,
        });

      if (upErr) throw upErr;

      const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/books/${path}`;
      setSettings((prev) => ({ ...prev, logo_url: url }));
      toast.success("Logo rasm yuklandi!");
    } catch (err: any) {
      toast.error("Logo yuklashda xato: " + (err.message || err));
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const nextSiteSettings = {
        ...siteSettings,
        linksPage: settings,
      };
      await updateSiteSettings(nextSiteSettings);
      toast.success("Links sahifasi muvaffaqiyatli saqlandi!");
    } catch (err: any) {
      toast.error("Saqlashda xato yuz berdi: " + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleAddLink = () => {
    const newLink: SocialLinkItem = {
      id: Date.now().toString(),
      title: "Yangi Havola",
      subtitle: "",
      url: "https://",
      icon: "link",
      is_visible: true,
    };
    setSettings((prev) => ({
      ...prev,
      links: [...prev.links, newLink],
    }));
  };

  const handleUpdateLink = (id: string, field: keyof SocialLinkItem, value: any) => {
    setSettings((prev) => ({
      ...prev,
      links: prev.links.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleToggleVisibility = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      links: prev.links.map((item) =>
        item.id === id ? { ...item, is_visible: !item.is_visible } : item
      ),
    }));
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const newLinks = [...settings.links];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newLinks.length) return;

    const [moved] = newLinks.splice(index, 1);
    newLinks.splice(targetIndex, 0, moved);

    setSettings((prev) => ({ ...prev, links: newLinks }));
  };

  const handleDelete = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      links: prev.links.filter((item) => item.id !== id),
    }));
    toast.info("Havola o'chirildi");
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <LinkIcon className="h-6 w-6 text-emerald-600" />
            <h1 className="text-2xl font-bold text-foreground">Links Sahifasi</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Linktree o'rniga ishlatiladigan ijtimoiy tarmoqlar sahifasini shu yerdan boshqaring
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/links"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <ExternalLink className="h-4 w-4" /> Live Sahifani ko'rish
          </a>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>
      </div>

      {/* Grid Layout: Editor on left, Mobile Live Preview on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Page Header Metadata */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-foreground">Sahifa ma'lumotlari</h2>
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Logo rasm</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {settings.logo_url ? (
                    <img src={settings.logo_url} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-gray-400" />
                  )}
                </div>

                <div className="space-y-1.5 flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoUpload(file);
                    }}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={logoUploading}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
                    >
                      {logoUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                      Fayl tanlang
                    </button>
                    {settings.logo_url && (
                      <button
                        type="button"
                        onClick={() => setSettings((p) => ({ ...p, logo_url: "" }))}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Logoni olib tashlash
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">PNG, JPG, SVG yoki WebP (maks 5MB)</p>
                </div>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Sarlavha (title)
              </label>
              <input
                type="text"
                value={settings.title}
                onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                placeholder="Booktopia Books"
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Tavsif (subtitle)
              </label>
              <input
                type="text"
                value={settings.subtitle}
                onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
                placeholder="NASHRIYOT · PUBLISHER"
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>

            {/* Section Title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Bo'lim belgisi (section title)
              </label>
              <input
                type="text"
                value={settings.section_title}
                onChange={(e) => setSettings({ ...settings, section_title: e.target.value })}
                placeholder="IJTIMOIY TARMOQLAR"
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Section 2: Links List Editor */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-semibold text-foreground">
                  Havolalar ({settings.links.length})
                </h2>
              </div>

              <button
                type="button"
                onClick={handleAddLink}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Yangi havola
              </button>
            </div>

            {/* List */}
            <div className="space-y-4">
              {settings.links.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed border-gray-200 rounded-xl">
                  Hozircha havolalar mavjud emas. "Yangi havola" tugmasini bosing.
                </div>
              ) : (
                settings.links.map((link, index) => (
                  <div
                    key={link.id}
                    className={`p-4 rounded-xl border transition-all ${
                      link.is_visible
                        ? "border-gray-200 bg-gray-50/50 hover:border-gray-300"
                        : "border-amber-200 bg-amber-50/30 opacity-75"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        {/* Icon selector */}
                        <select
                          value={link.icon}
                          onChange={(e) =>
                            handleUpdateLink(link.id, "icon", e.target.value)
                          }
                          className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          {ICON_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => handleToggleVisibility(link.id)}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors ${
                            link.is_visible
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                          }`}
                        >
                          {link.is_visible ? (
                            <>
                              <Eye className="h-3 w-3" /> Ko'rinadigan
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3" /> Yashiringan
                            </>
                          )}
                        </button>
                      </div>

                      {/* Reorder and Delete controls */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMove(index, "up")}
                          disabled={index === 0}
                          className="p-1 rounded text-gray-500 hover:bg-white disabled:opacity-30"
                          title="Yuqoriga surish"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMove(index, "down")}
                          disabled={index === settings.links.length - 1}
                          className="p-1 rounded text-gray-500 hover:bg-white disabled:opacity-30"
                          title="Pastga surish"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(link.id)}
                          className="p-1 rounded text-red-500 hover:bg-red-50 ml-1"
                          title="O'chirish"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Nomi (Title)
                        </label>
                        <input
                          type="text"
                          value={link.title}
                          onChange={(e) =>
                            handleUpdateLink(link.id, "title", e.target.value)
                          }
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Izoh / Subtitle
                        </label>
                        <input
                          type="text"
                          value={link.subtitle || ""}
                          onChange={(e) =>
                            handleUpdateLink(link.id, "subtitle", e.target.value)
                          }
                          placeholder="@booktopia"
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Havola URL (Link)
                        </label>
                        <input
                          type="text"
                          value={link.url}
                          onChange={(e) =>
                            handleUpdateLink(link.id, "url", e.target.value)
                          }
                          placeholder="https://..."
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Smartphone Preview Frame */}
        <div className="lg:col-span-5 sticky top-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-emerald-600" />
                <h2 className="text-base font-semibold text-foreground">Ko'rinishi (Live Preview)</h2>
              </div>
              <a
                href="/links"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-600 hover:underline flex items-center gap-1 font-medium"
              >
                Yangi tabda ochish <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Phone Shell */}
            <div className="relative mx-auto w-full max-w-[340px] rounded-[36px] bg-gray-900 p-3 shadow-2xl border-4 border-gray-800">
              {/* Notch */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-4 bg-gray-800 rounded-full z-30 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-black/60 mr-2" />
                <div className="w-2 h-2 rounded-full bg-blue-900/50" />
              </div>

              {/* Phone Screen Container */}
              <div className="relative w-full h-[580px] rounded-[28px] overflow-y-auto overflow-x-hidden custom-scrollbar bg-[#071317]">
                <LinksPage previewMode={true} customSettings={settings} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LinksManager;
