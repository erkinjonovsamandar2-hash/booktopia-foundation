import { motion } from 'framer-motion';

/**
 * Wraps each page with a smooth slide-in/slide-out transition.
 * Pages slide in from right (forward navigation) and slide out to left.
 * Use this as the outermost wrapper in every page component.
 */
const pageVariants = {
  initial: { opacity: 0, x: 24 },
  in:      { opacity: 1, x: 0 },
  out:     { opacity: 0, x: -24 },
};

const pageTransition = {
  type: 'spring',
  stiffness: 380,
  damping: 32,
};

export default function PageTransition({ children }) {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
    >
      {children}
    </motion.div>
  );
}
