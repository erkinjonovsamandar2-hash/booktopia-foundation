import { useEffect, useRef, type ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

/**
 * Scroll-reveal wrapper — pure CSS, zero framer-motion.
 *
 * Uses native IntersectionObserver + CSS transitions (compositor thread).
 * Drop-in replacement for the old framer-motion version.
 */
const RevealOnScroll = ({ children, className = "", delay = 0 }: RevealProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("revealed");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("revealed");
          observer.unobserve(el);
        }
      },
      { threshold: 0.01, rootMargin: "0px" }
    );
    observer.observe(el);

    const fallbackTimer = setTimeout(() => {
      el.classList.add("revealed");
      observer.disconnect();
    }, 600);

    return () => {
      observer.disconnect();
      clearTimeout(fallbackTimer);
    };
  }, []);

  // Map the old `delay` prop to a stagger delay class
  const delayClass =
    delay >= 0.32 ? "reveal-d4" :
    delay >= 0.24 ? "reveal-d3" :
    delay >= 0.16 ? "reveal-d2" :
    delay >= 0.08 ? "reveal-d1" : "";

  return (
    <div ref={ref} className={`reveal ${delayClass} ${className}`}>
      {children}
    </div>
  );
};

export default RevealOnScroll;