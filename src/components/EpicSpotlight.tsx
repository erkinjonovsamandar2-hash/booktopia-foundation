import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/context/LanguageContext";
import { HOTSPOT_IDS, HOTSPOT_POSITIONS } from "@/lib/mockData";

const hotspotIds = HOTSPOT_IDS;
const hotspotPositions = HOTSPOT_POSITIONS;

const EpicSpotlight = () => {
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);
  const { t } = useLang();
  const containerRef = useRef<HTMLDivElement>(null);

  // CSS-only reveal
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.querySelectorAll(".reveal,.reveal-scale").forEach(c => c.classList.add("revealed"));
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.querySelectorAll(".reveal,.reveal-scale").forEach(c => c.classList.add("revealed")); observer.unobserve(el); } },
      { threshold: 0.1, rootMargin: "-8% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="spotlight" className="section-gpu relative section-padding bg-charcoal overflow-hidden">
      <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-primary/5 to-transparent" />

      <div ref={containerRef} className="relative z-10 mx-auto max-w-7xl">
        <div className="reveal">
          <p className="mb-3 text-xs font-sans font-black uppercase tracking-[0.4em] text-gold">
            {t.spotlight.badge}
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-black tracking-tight font-bold text-foreground mb-4">
            {t.spotlight.title}
          </h2>
          <p className="max-w-xl text-muted-foreground mb-10">
            {t.spotlight.desc}
          </p>
        </div>

        <div
          className="reveal-scale reveal-d2 glass-card relative rounded-xl overflow-hidden"
          style={{ height: "clamp(300px, 50vw, 500px)" }}
        >
          <div className="absolute inset-0 bg-secondary">
            <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M20 0 Q25 20 22 40 Q18 55 25 70 Q30 80 28 100" stroke="hsl(var(--gold))" strokeWidth="0.3" fill="none" opacity="0.3" />
              <path d="M45 0 Q50 15 48 30 Q42 50 50 65 Q55 80 52 100" stroke="hsl(var(--gold))" strokeWidth="0.2" fill="none" opacity="0.2" />
              <path d="M70 10 Q65 30 68 50 Q72 70 65 90" stroke="hsl(var(--gold))" strokeWidth="0.2" fill="none" opacity="0.1" />
              <path d="M15 5 Q30 8 45 5 Q55 8 60 20 Q55 35 45 40 Q35 38 25 42 Q18 35 15 20 Z" fill="hsl(var(--gold))" opacity="0.04" />
              <path d="M30 55 Q50 50 65 55 Q70 65 65 78 Q50 82 35 78 Q28 70 30 55 Z" fill="hsl(var(--primary))" opacity="0.04" />
            </svg>
            <div className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
                backgroundSize: "50px 50px",
              }}
            />
          </div>

          {hotspotIds.map((id) => {
            const pos = hotspotPositions[id];
            const spotData = t.spotlight.hotspots[id];
            return (
              <div
                key={id}
                className="absolute group"
                style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)" }}
              >
                <button
                  className="relative z-10"
                  onClick={() => setActiveHotspot(activeHotspot === id ? null : id)}
                  onMouseEnter={() => setActiveHotspot(id)}
                >
                  <span className="absolute inset-0 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 animate-ping" />
                  <span className="absolute inset-0 h-8 w-8 -translate-x-[calc(50%+4px)] -translate-y-[calc(50%+4px)] rounded-full bg-primary/10 animate-pulse" />
                  <span className="relative block h-3 w-3 rounded-full bg-primary shadow-[0_0_12px_rgba(247,181,0,0.6)]" />
                </button>

                <span className="absolute left-6 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-gold/80">
                  {spotData.label}
                </span>

                <AnimatePresence>
                  {activeHotspot === id && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.9 }}
                      className="absolute left-1/2 -translate-x-1/2 top-8 z-20 w-64 glass-card rounded-lg p-4"
                      onMouseLeave={() => setActiveHotspot(null)}
                    >
                      <h4 className="font-heading font-black tracking-tight font-bold text-foreground text-sm mb-2">{spotData.label}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{spotData.lore}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          <div className="absolute bottom-4 right-4 text-xs font-sans text-muted-foreground/50 uppercase tracking-widest">
            {t.spotlight.mapLabel}
          </div>
        </div>
      </div>
    </section>
  );
};

export default EpicSpotlight;
