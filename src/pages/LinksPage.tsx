import React, { useState, useEffect } from "react";
import { useData } from "@/context/DataContext";
import { DEFAULT_SITE_SETTINGS } from "@/lib/mockData";
import {
  Instagram,
  Send,
  Facebook,
  Youtube,
  Globe,
  Phone,
  Bot,
  Link as LinkIcon,
  ChevronRight,
  Share2,
  Check,
  Sparkles,
  BookOpen,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";

interface LinksPageProps {
  previewMode?: boolean; // When rendered inside admin live preview frame
  customSettings?: any;
}

export const renderSocialIcon = (iconType: string) => {
  switch (iconType) {
    case "instagram":
      return (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20 group-hover:scale-105 transition-transform duration-300">
          <Instagram className="h-5 w-5" />
        </div>
      );
    case "telegram":
      return (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform duration-300">
          <Send className="h-5 w-5 -translate-x-0.5 translate-y-0.5" />
        </div>
      );
    case "facebook":
      return (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
          <Facebook className="h-5 w-5" />
        </div>
      );
    case "youtube":
      return (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white shadow-md shadow-red-500/20 group-hover:scale-105 transition-transform duration-300">
          <Youtube className="h-5 w-5" />
        </div>
      );
    case "bot":
      return (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/25 group-hover:scale-105 transition-transform duration-300">
          <Bot className="h-5 w-5" />
        </div>
      );
    case "contact":
      return (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
          <Phone className="h-5 w-5" />
        </div>
      );
    case "website":
      return (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform duration-300">
          <Globe className="h-5 w-5" />
        </div>
      );
    default:
      return (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform duration-300">
          <LinkIcon className="h-5 w-5" />
        </div>
      );
  }
};

const DefaultBooktopiaEmblem = () => (
  <div className="relative w-full h-full flex flex-col items-center justify-center text-[#4488BF]">
    <div className="relative">
      <BookOpen className="h-9 w-9 text-[#4488BF] drop-shadow-[0_0_15px_rgba(68,136,191,0.6)]" />
      <Sparkles className="h-4 w-4 text-[#D5AD36] absolute -top-1 -right-1 animate-pulse" />
    </div>
    <span className="text-[9px] font-black tracking-widest uppercase text-[#F4F2C9] mt-0.5">
      BOOKTOPIA
    </span>
  </div>
);

const LinksPage: React.FC<LinksPageProps> = ({ previewMode = false, customSettings }) => {
  const { siteSettings, refreshSiteSettings } = useData();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!previewMode && refreshSiteSettings) {
      refreshSiteSettings();
    }
  }, [previewMode, refreshSiteSettings]);

  const linksData =
    customSettings ||
    siteSettings?.linksPage ||
    DEFAULT_SITE_SETTINGS.linksPage;

  const visibleLinks = (linksData?.links || []).filter(
    (item: any) => previewMode || item.is_visible !== false
  );

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Sahifa havolasi nusxalandi!");
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      className={`min-h-screen bg-[#070f1e] text-white selection:bg-[#4488BF] selection:text-white flex flex-col items-center justify-between font-sans relative overflow-hidden ${
        previewMode ? "p-4 min-h-[580px] rounded-3xl" : "p-6 py-12 sm:py-16"
      }`}
    >
      {/* Ambient Booktopia Navy & Gold Radial Glow Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[650px] h-[650px] bg-[#265999]/20 rounded-full blur-[150px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#4488BF]/10 rounded-full blur-[130px]" />
        <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#D5AD36]/10 rounded-full blur-[140px]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(#4488BF 1px, transparent 1px)`,
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      {!previewMode && (
        <button
          onClick={handleShare}
          title="Nusxalash"
          className="absolute top-5 right-5 z-20 p-2.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-sky-300 backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
        </button>
      )}

      {/* Center Container */}
      <div className="w-full max-w-md z-10 flex flex-col items-center">
        {/* Brand Avatar / Emblem */}
        <div className="relative mb-5 group">
          <div className="absolute -inset-2 bg-gradient-to-r from-[#4488BF]/50 via-[#265999]/50 to-[#D5AD36]/40 rounded-full blur-md opacity-80 group-hover:opacity-100 transition duration-500" />
          <div className="relative w-24 h-24 rounded-full bg-[#0a182e] border-2 border-[#4488BF]/40 p-2 flex items-center justify-center overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
            {linksData?.logo_url ? (
              <img
                src={linksData.logo_url}
                alt="Logo"
                className="w-full h-full object-contain rounded-full"
              />
            ) : (
              <DefaultBooktopiaEmblem />
            )}
          </div>
        </div>

        {/* Page Title & Subtitle */}
        <div className="text-center mb-7 px-4">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-1.5">
            <span>
              {linksData?.title?.split(" ")[0] || "Booktopia"}{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-300 to-amber-300">
                {linksData?.title?.split(" ").slice(1).join(" ") || "Books"}
              </span>
            </span>
          </h1>
          <p className="text-xs font-bold tracking-[0.25em] text-[#D5AD36] uppercase">
            {linksData?.subtitle || "NASHRIYOT · PUBLISHER"}
          </p>
        </div>

        {/* ── FEATURED ACTION CARDS (Top Priority Interactive Actions) ── */}
        <div className="w-full space-y-3.5 mb-6 px-1">
          {/* Card 1: Telegram MiniApp for Sales */}
          <a
            href="https://t.me/booktopia_bot"
            target={previewMode ? "_self" : "_blank"}
            rel="noopener noreferrer"
            onClick={(e) => {
              if (previewMode) e.preventDefault();
            }}
            className="group relative flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-[#0e2445] via-[#122e58] to-[#0a1b35] border border-sky-400/35 hover:border-sky-400/70 shadow-[0_6px_25px_rgba(68,136,191,0.25)] transition-all duration-300 hover:-translate-y-1 overflow-hidden"
          >
            {/* Subtle animated border sheen overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-sky-400/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

            {/* Floating Top Badge */}
            <div className="absolute top-2.5 right-3.5 z-10 flex items-center gap-1.5 bg-sky-500/15 border border-sky-400/30 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider text-sky-300 whitespace-nowrap pointer-events-none">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sky-400" />
              </span>
              <span>Tezkor Xarid</span>
            </div>

            <div className="flex items-center gap-3.5 min-w-0 z-10 pt-1">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/30 group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
                <Bot className="h-6 w-6" />
              </div>

              <div className="min-w-0 text-left">
                <h2 className="text-sm sm:text-base font-black text-white group-hover:text-sky-300 transition-colors truncate pr-20">
                  Telegram MiniApp
                </h2>
                <p className="text-xs text-slate-300 font-medium truncate mt-0.5">
                  Kitob do'koni va katalog (Bot)
                </p>
              </div>
            </div>

            <div className="z-10 pl-2 pt-5 sm:pt-0">
              <div className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md shadow-sky-500/25 group-hover:from-sky-300 group-hover:to-blue-400 transition-all whitespace-nowrap">
                <span>Ochish</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </a>

          {/* Card 2: Main Website */}
          <a
            href="/"
            target={previewMode ? "_self" : "_blank"}
            rel="noopener noreferrer"
            onClick={(e) => {
              if (previewMode) e.preventDefault();
            }}
            className="group relative flex items-center justify-between p-4 rounded-2xl bg-[#0d203b]/90 hover:bg-[#122a4d] border border-amber-400/25 hover:border-amber-400/50 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 overflow-hidden"
          >
            {/* Top Badge */}
            <div className="absolute top-2.5 right-3.5 z-10 bg-amber-500/15 border border-amber-400/30 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider text-amber-300 whitespace-nowrap pointer-events-none">
              Veb-sayt
            </div>

            <div className="flex items-center gap-3.5 min-w-0 z-10 pt-1">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
                <Globe className="h-5 w-5" />
              </div>
              <div className="min-w-0 text-left">
                <h2 className="text-sm sm:text-base font-bold text-white group-hover:text-amber-300 transition-colors truncate pr-16">
                  Booktopia Portal
                </h2>
                <p className="text-xs text-slate-300/80 font-normal truncate mt-0.5">
                  Asosiy rasmiy saytga o'tish
                </p>
              </div>
            </div>

            <div className="z-10 pl-2 pt-5 sm:pt-0">
              <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-amber-500/20 flex items-center justify-center text-white/40 group-hover:text-amber-300 transition-all duration-300">
                <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </a>
        </div>

        {/* Section Divider */}
        {linksData?.section_title && (
          <div className="w-full flex items-center justify-center gap-4 mb-5">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#4488BF]/30 to-transparent" />
            <span className="text-[11px] font-bold tracking-[0.2em] text-[#D5AD36]/80 uppercase px-2">
              {linksData.section_title}
            </span>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#4488BF]/30 to-transparent" />
          </div>
        )}

        {/* Standard Links Stack */}
        <div className="w-full space-y-3 px-1">
          {visibleLinks.length === 0 ? (
            <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/10 text-white/60 text-sm">
              Hozircha hech qanday havola qo'shilmagan.
            </div>
          ) : (
            visibleLinks.map((link: any) => (
              <a
                key={link.id}
                href={previewMode ? "#" : link.url}
                target={previewMode || link.url?.startsWith("tel:") ? "_self" : "_blank"}
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (previewMode) e.preventDefault();
                }}
                className={`group relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[#0b1c33]/80 hover:bg-[#102747] border border-sky-500/15 hover:border-sky-400/40 backdrop-blur-xl transition-all duration-300 shadow-md hover:shadow-sky-500/10 hover:-translate-y-0.5 ${
                  link.is_visible === false ? "opacity-40" : ""
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {renderSocialIcon(link.icon)}
                  <div className="min-w-0 text-left">
                    <h2 className="text-sm sm:text-base font-bold text-white group-hover:text-sky-300 transition-colors truncate">
                      {link.title}
                    </h2>
                    {link.subtitle && (
                      <p className="text-xs text-slate-300/70 truncate font-normal">
                        {link.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pl-2">
                  {link.is_visible === false && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-medium">
                      Yashiringan
                    </span>
                  )}
                  <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-sky-500/20 flex items-center justify-center text-white/40 group-hover:text-sky-300 transition-all duration-300">
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </a>
            ))
          )}
        </div>
      </div>

      {/* Footer Branding */}
      <div className="z-10 mt-10 text-center">
        <a
          href="/"
          target={previewMode ? "_self" : "_blank"}
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-white/40 hover:text-sky-300 transition-colors font-medium"
        >
          <Sparkles className="h-3.5 w-3.5 text-[#D5AD36]" />
          <span>Booktopia Foundation</span>
        </a>
      </div>
    </div>
  );
};

export default LinksPage;
