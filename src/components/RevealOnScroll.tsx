import { motion, useInView } from "framer-motion";
import { useRef } from "react";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

/**
 * Premium scroll-reveal wrapper.
 *
 * Design intent: elements should *emerge* into view like a slow tide,
 * not "pop" or "crash" in. The key is:
 *   – Very small y-offset (10px, not 24px) → subtle float, not a jump
 *   – Slow duration (0.9s) with a smooth deceleration curve
 *   – Early trigger (-25%) so the animation is already mid-flow when
 *     the element reaches the centre of the viewport
 *   – `once: true` → never re-triggers on scroll-back
 */
const RevealOnScroll = ({ children, className = "", delay = 0 }: RevealProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-25% 0px -10% 0px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.9,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94], // smooth deceleration — no bounce, no snap
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default RevealOnScroll;