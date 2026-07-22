// @refresh reset
import { useState, useEffect } from "react";
import { Menu, X, Sun, Moon, Search } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/context/LanguageContext";
import LanguageSwitcher from "./LanguageSwitcher";
import SearchModal from "./SearchModal";

// ── Asset Imports ──────────────────────────────────────────────────────────
// ADDED: logo image import from src/assets
import logoImg from "@/assets/Logo-blue.png";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);


  const { t } = useLang();
  const location = useLocation();

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("booktopia-theme") as "dark" | "light") || "light";
    }
    return "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }
    localStorage.setItem("booktopia-theme", theme);
  }, [theme]);

  const navLinks = [
    { label: t.nav.home, href: "/" },
    { label: t.nav.spotlight, href: "/spotlight" },
    { label: t.nav.library, href: "/library" },
    { label: t.nav.blog, href: "/blog" },
    { label: "Jamoa", href: "/team" }, // <-- ADDED HERE
    { label: "Hamkorlar", href: "/hamkorlar" },
    { label: t.nav.quiz, href: "/quiz" }, // Quiz acts as CTA typically, placed near the end
    { label: t.nav.contact, href: "#contact" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    if (href.startsWith("/#"))
      return location.pathname === "/" && location.hash === href.slice(1);
    return location.pathname === href;
  };

  // ── Hide Navbar on Admin Dashboard ──
  if (location.pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <>
      {/* CSS-only scroll progress bar — see index.css .scroll-progress-bar */}
      <div className="scroll-progress-bar" aria-hidden="true" />
      {/* NOTE: no backdrop-blur here on purpose. This nav is `fixed`, so a
          backdrop-filter would re-blur the whole viewport width behind it on
          every scroll frame — the single biggest cause of scroll jank. A near-
          opaque solid background gives the same premium look with zero per-frame
          paint cost. */}
      <nav className="fixed top-0 left-0 right-0 z-[999] bg-white/95 dark:bg-black/90 border-b border-white/60 dark:border-white/10 shadow-[0_8px_30px_rgba(38,89,153,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-colors duration-500 ease-out">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">

          {/* ── Logo ── */}
          <Link
            to="/"
            className="flex items-center drop-shadow-sm flex-shrink-0"
          >
            <img
              src={logoImg}
              alt="Booktopia Logo"
              className="h-8 md:h-10 w-auto object-contain transition-opacity hover:opacity-90 duration-300"
            />
          </Link>

          {/* ── Desktop Links (centered) ── */}
          <ul className="hidden md:flex items-center gap-5 flex-1 justify-center">
            {navLinks.filter((l) => l.href !== "/spotlight").map((link) => (
              <li key={link.href}>

                {link.href === "/quiz" ? (
                  <Link
                    to={link.href}
                    className={`
                      group relative inline-flex items-center gap-1.5
                      font-sans font-bold text-[11px] uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg transition-colors duration-300
                      ${isActive(link.href) ? "bg-primary/10 text-primary" : "text-foreground/80 hover:text-foreground"}
                    `}
                  >
                    <span className="text-primary hover:text-accent transition-colors">
                      {link.label}
                    </span>
                  </Link>

                ) : link.href === "#contact" ? (
                  <button
                    onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}
                    className={`
                      relative inline-flex items-center gap-1.5
                      font-sans font-bold text-[11px] uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg transition-colors duration-300
                      text-foreground/80 hover:text-foreground
                    `}
                  >
                    {link.label}
                  </button>

                ) : (
                  <Link
                    to={link.href}
                    className={`
                      relative inline-flex items-center gap-1.5
                      font-sans font-bold text-[11px] uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg transition-colors duration-300
                      ${isActive(link.href) ? "bg-primary/10 text-primary" : "text-foreground/80 hover:text-foreground"}
                    `}
                  >
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>

          {/* ── Desktop Controls (right, flex-shrink-0) ── */}
          <div className="hidden md:flex items-center gap-3 flex-shrink-0 pl-4 border-l border-border">
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 text-foreground/70 hover:text-accent hover:bg-primary/5 rounded-full transition-all"
              aria-label="Qidiruv"
            >
              <Search className="w-5 h-5" />
            </button>

            <LanguageSwitcher />

            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 text-foreground transition-colors hover:text-accent focus:outline-none drop-shadow-sm"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>

          {/* ── Mobile Controls ── */}
          <div className="flex items-center gap-3 md:hidden">
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 text-foreground hover:text-accent transition-colors"
              aria-label="Qidiruv"
            >
              <Search className="w-6 h-6" />
            </button>

            <LanguageSwitcher />

            <button
              onClick={() => setOpen(!open)}
              className="text-foreground drop-shadow-sm p-1"
              aria-label="Toggle menu"
            >
              {open ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
            </button>
          </div>
        </div>


        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-md shadow-xl overflow-hidden"
            >
              <ul className="flex flex-col gap-1 px-6 py-6">
                {navLinks.filter((l) => l.href !== "/spotlight").map((link) => (
                  <li key={link.href}>
                    {link.href === "/quiz" ? (
                      /* Mobile highlighted link */
                      <Link
                        to={link.href}
                        onClick={() => setOpen(false)}
                        className={`
                          block py-2.5 px-4 mb-1 rounded-lg
                          font-sans font-bold text-[11px] uppercase tracking-[0.2em] transition-colors duration-300 active:bg-primary/10
                          ${isActive(link.href) ? "bg-primary/10 text-primary" : "text-foreground/80 hover:text-foreground"}
                        `}
                      >
                        <span className="text-primary transition-colors">
                          {link.label}
                        </span>
                      </Link>
                    ) : link.href === "#contact" ? (
                      <button
                        onClick={() => {
                          setOpen(false);
                          window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
                        }}
                        className={`
                          block py-2.5 px-4 mb-1 rounded-lg w-full text-left
                          font-sans font-bold text-[11px] uppercase tracking-[0.2em] transition-colors duration-300 active:bg-primary/10
                          text-foreground/80 hover:text-foreground
                        `}
                      >
                        {link.label}
                      </button>
                    ) : (
                      <Link
                        to={link.href}
                        onClick={() => setOpen(false)}
                        className={`
                          block py-2.5 px-4 mb-1 rounded-lg
                          font-sans font-bold text-[11px] uppercase tracking-[0.2em] transition-colors duration-300 active:bg-primary/10
                          ${isActive(link.href) ? "bg-primary/10 text-primary" : "text-foreground/80 hover:text-foreground"}
                        `}
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}

                <li className="mt-4 pt-4 border-t border-border">
                  <button
                    onClick={() => {
                      setTheme(theme === "dark" ? "light" : "dark");
                      setOpen(false);
                    }}
                    className="flex items-center gap-3 w-full py-3 px-2 text-base font-bold text-foreground transition-colors active:bg-primary/10 rounded-lg"
                  >
                    {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    {theme === "dark" ? "Yorug' ko'rinish" : "Tungi ko'rinish"}
                  </button>
                </li>
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </nav >

      {/* ── Global Search Modal ── */}
      < SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};

export default Navbar;
