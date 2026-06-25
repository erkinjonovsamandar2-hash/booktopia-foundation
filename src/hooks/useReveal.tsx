import { useEffect, useRef, type RefObject } from "react";

/**
 * Lightweight scroll-reveal hook — ZERO framer-motion overhead.
 *
 * Uses a single native IntersectionObserver to toggle a `.revealed` class.
 * All animation is CSS-only (runs on the compositor thread, not main thread).
 *
 * Usage:
 *   const ref = useReveal<HTMLDivElement>();
 *   <div ref={ref} className="reveal">Content</div>
 *
 * The element starts hidden (via `.reveal` CSS), then gets `.revealed`
 * added when it enters the viewport, triggering a CSS transition.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect user preference for reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("revealed");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("revealed");
          observer.unobserve(el); // once: true
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

  return ref;
}

/**
 * Standalone component for wrapping children in a reveal animation.
 * Drop-in replacement for the old framer-motion RevealOnScroll.
 */
interface RevealProps {
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export function Reveal({ children, className = "", as: Tag = "div" }: RevealProps) {
  const ref = useReveal<HTMLDivElement>();
  return (
    // @ts-expect-error — Tag is a valid element type
    <Tag ref={ref} className={`reveal ${className}`}>
      {children}
    </Tag>
  );
}
