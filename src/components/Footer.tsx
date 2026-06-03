import React from "react";
import { Link } from "react-router-dom";
import logoImg from "@/assets/Logo-blue.png";
import { MapPin, Phone, Mail, Send, Instagram } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useLang } from "@/context/LanguageContext";

const Footer = () => {
  const { siteSettings } = useData();
  const { t } = useLang();
  const { footer } = siteSettings;
  const currentYear = new Date().getFullYear();

  return (
    <footer id="footer" className="w-full bg-[#0A1128] border-t border-[rgba(10,17,40,0.15)]">
      <style>{`
        .footer-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2.5rem 2rem;
        }
        .footer-links-wrapper {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2.5rem 2rem;
        }
        @media (min-width: 640px) { /* sm */
          .footer-links-wrapper {
            grid-template-columns: 1fr 1fr;
          }
          .footer-link-col:nth-child(3) {
            grid-column: 1 / -1;
          }
        }
        @media (min-width: 768px) { /* md */
          .footer-links-wrapper {
            grid-template-columns: 1fr 1fr 1fr;
          }
          .footer-link-col:nth-child(3) {
            grid-column: auto;
          }
        }
        @media (min-width: 1024px) { /* lg */
          .footer-grid {
            grid-template-columns: 1.6fr 1fr 1fr 1fr;
          }
          .footer-links-wrapper {
            display: contents;
          }
        }
      `}</style>

      {/* ZONE 1 - Main body */}
      <div className="w-full pt-[4rem] px-[2.25rem] pb-0">
        <div className="footer-grid pb-[3rem] border-b border-[rgba(255,255,255,0.08)]">

          {/* COLUMN 1 - Brand column */}
          <div className="flex flex-col">
            <Link to="/" className="inline-block mb-4">
              <img
                src={logoImg}
                alt="Booktopia Logo"
                className="h-10 w-auto object-contain"
              />
            </Link>

            <p className="font-serif text-[1.05rem] leading-[1.8] text-[rgba(255,255,255,0.6)] max-w-[280px] mb-6">
              {t.footer.brandDesc}
            </p>

            <div className="flex flex-col gap-4">
              {footer.address && (
                <div className="flex items-center gap-3 font-sans text-[0.95rem] font-medium text-[rgba(255,255,255,0.45)]">
                  <MapPin className="w-5 h-5 text-[#00A3FF] shrink-0" />
                  <span>{footer.address}</span>
                </div>
              )}
              {footer.phone && (
                <a href={`tel:${footer.phone}`} className="flex items-center gap-3 font-sans text-[0.95rem] font-medium text-[rgba(255,255,255,0.45)] hover:text-white transition-colors">
                  <Phone className="w-5 h-5 text-[#00A3FF] shrink-0" />
                  <span>{footer.phone}</span>
                </a>
              )}
              {footer.email && (
                <a href={`mailto:${footer.email}`} className="flex items-center gap-3 font-sans text-[0.95rem] font-medium text-[rgba(255,255,255,0.45)] hover:text-white transition-colors">
                  <Mail className="w-5 h-5 text-[#00A3FF] shrink-0" />
                  <span>{footer.email}</span>
                </a>
              )}
              {(footer.telegram || footer.instagram) && (
                <div className="flex items-center gap-3 mt-1">
                  {footer.telegram && (
                    <a href={footer.telegram} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-[#00A3FF]/20 transition-colors" aria-label="Telegram">
                      <Send className="w-4 h-4 text-[#00A3FF]" />
                    </a>
                  )}
                  {footer.instagram && (
                    <a href={footer.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-pink-500/20 transition-colors" aria-label="Instagram">
                      <Instagram className="w-4 h-4 text-pink-400" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* COLUMNS 2, 3, 4 - Link columns wrapper */}
          <div className="footer-links-wrapper">

            {/* Activity */}
            <div className="footer-link-col flex flex-col">
              <h4 className="font-sans text-[0.9rem] font-bold tracking-[0.15em] uppercase text-[#00A3FF] mb-6">
                {t.footer.activityHeading}
              </h4>
              <Link to="/library" className="block font-sans text-[0.95rem] font-medium text-[rgba(255,255,255,0.55)] mb-4 transition-colors duration-200 hover:text-white outline-none">
                {t.footer.allBooks}
              </Link>
              <a href="/#yangi-nashrlar" className="block font-sans text-[0.95rem] font-medium text-[rgba(255,255,255,0.55)] mb-4 transition-colors duration-200 hover:text-white outline-none">
                {t.footer.newReleases}
              </a>
              <Link to="/team" className="block font-sans text-[0.95rem] font-medium text-[rgba(255,255,255,0.55)] mb-4 transition-colors duration-200 hover:text-white outline-none">
                {t.footer.authorsTranslators}
              </Link>
            </div>

            {/* Publisher */}
            <div className="footer-link-col flex flex-col">
              <h4 className="font-sans text-[0.9rem] font-bold tracking-[0.15em] uppercase text-[#00A3FF] mb-6">
                {t.footer.publisherHeading}
              </h4>
              <Link to="/biz-haqimizda" className="block font-sans text-[0.95rem] font-medium text-[rgba(255,255,255,0.55)] mb-4 transition-colors duration-200 hover:text-white outline-none">
                {t.footer.aboutUs}
              </Link>
              <Link to="/blog" className="block font-sans text-[0.95rem] font-medium text-[rgba(255,255,255,0.55)] mb-4 transition-colors duration-200 hover:text-white outline-none">
                {t.footer.diary}
              </Link>
              <Link to="/hamkorlar" className="block font-sans text-[0.95rem] font-medium text-[rgba(255,255,255,0.55)] mb-4 transition-colors duration-200 hover:text-white outline-none">
                {t.footer.partners}
              </Link>
              <Link to="/team" className="block font-sans text-[0.95rem] font-medium text-[rgba(255,255,255,0.55)] mb-4 transition-colors duration-200 hover:text-white outline-none">
                {t.footer.team}
              </Link>
            </div>

            {/* Legal */}
            <div className="footer-link-col flex flex-col">
              <h4 className="font-sans text-[0.9rem] font-bold tracking-[0.15em] uppercase text-[#00A3FF] mb-6">
                {t.footer.legalHeading}
              </h4>
              <Link to="/oferta" className="block font-sans text-[0.95rem] font-medium text-[rgba(255,255,255,0.55)] mb-4 transition-colors duration-200 hover:text-white outline-none">
                {t.footer.publicOffer}
              </Link>
              <Link to="/maxfiylik" className="block font-sans text-[0.95rem] font-medium text-[rgba(255,255,255,0.55)] mb-4 transition-colors duration-200 hover:text-white outline-none">
                {t.footer.privacyPolicy}
              </Link>
              <Link to="/shartlar" className="block font-sans text-[0.95rem] font-medium text-[rgba(255,255,255,0.55)] mb-4 transition-colors duration-200 hover:text-white outline-none">
                {t.footer.termsOfUse}
              </Link>
            </div>

          </div>
        </div>
      </div>

      {/* ZONE 1.5 - Payment methods bar */}
      <div className="w-full px-[2.25rem] py-[1.25rem] border-t border-[rgba(255,255,255,0.06)] flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="font-sans text-[0.65rem] font-bold tracking-[0.18em] text-[rgba(255,255,255,0.28)] uppercase select-none">
          To‘lov usullari
        </span>
        <div className="flex items-center gap-3">
          {/* Payme */}
          <a
            href="https://payme.uz"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Payme orqali to'lash"
            className="flex items-center h-8 px-3 rounded-[6px] bg-white/[0.07] hover:bg-white/[0.13] transition-all duration-200 border border-white/[0.08]"
          >
            <img
              src="/payme-logo.png"
              alt="Payme"
              className="h-[18px] w-auto object-contain brightness-[1.15] saturate-[0.9]"
              loading="lazy"
              decoding="async"
            />
          </a>
          {/* Click */}
          <a
            href="https://click.uz"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Click orqali to'lash"
            className="flex items-center h-8 px-3 rounded-[6px] bg-white/[0.07] hover:bg-white/[0.13] transition-all duration-200 border border-white/[0.08]"
          >
            <img
              src="/click-logo.png"
              alt="Click"
              className="h-[18px] w-auto object-contain brightness-[1.1]"
              loading="lazy"
              decoding="async"
            />
          </a>
        </div>
      </div>

      {/* ZONE 2 - Copyright bar */}
      <div className="w-full bg-[#050B1A] py-[1rem] px-[2.25rem] flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="font-sans text-[0.7rem] font-semibold tracking-[0.08em] text-[rgba(255,255,255,0.4)] uppercase text-center md:text-left">
          © {currentYear} BOOKTOPIA. {t?.footer?.rights || "BARCHA HUQUQLAR HIMOYALANGAN."}
        </div>
        <div className="font-sans text-[0.7rem] font-semibold tracking-[0.05em] text-[rgba(255,255,255,0.3)] flex items-center justify-center gap-1.5 uppercase">
          <span>{t.footer.madeWithLove}</span>
          <span style={{ color: '#E24B4A' }} className="text-[0.85rem] translate-y-[-1px]">♥</span>
          <span className="opacity-50">·</span>
          <a
            href="https://t.me/white_crow_8"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-white/80 hover:text-white transition-colors"
          >SAMANDAR ERKINJONOV</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;