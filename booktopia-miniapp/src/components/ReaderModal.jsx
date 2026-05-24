import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic } from '../lib/utils';

// We'll use the same preview pages as the foundation's mockData
const PREVIEW_PAGES = [
  "Bu kitobning birinchi sahifasi. Qorong'u va sirli bir kecha edi. Shamol daraxtlarning shoxlarini silkitardi va osmon yulduzlarsiz qolgan edi...",
  "Ikkinchi sahifa davomi. Qahramonimiz yo'lga chiqdi. Uning oldida noma'lum bir sayohat kutayotgan edi. Har bir qadam yangi sirlarni ochardi...",
  "Uchinchi sahifa. Qadimiy qal'a devorlarida yashirin xat topildi. Bu xat butun mamlakatning taqdirini o'zgartirishi mumkin edi..."
];

const modalVariants = {
  hidden: { y: '100%', opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } },
  exit: { y: '100%', opacity: 0, transition: { duration: 0.2 } }
};

export default function ReaderModal({ book, onClose, lang = 'uz' }) {
  const [currentPage, setCurrentPage] = useState(0);
  const scrollRef = useRef(null);

  const title = book[`title_${lang}`] || book.title || '';

  const handleScroll = (e) => {
    const el = e.target;
    // Calculate which page is currently snapped based on scroll position
    const pageIndex = Math.round(el.scrollLeft / el.clientWidth);
    if (pageIndex !== currentPage) {
      setCurrentPage(pageIndex);
      haptic('selection'); // Tiny tick when turning pages
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="reader-modal"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: '#0F172A', // Dark mode for reading
          color: '#E2E8F0',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          touchAction: 'none' // We'll handle touch in the scroll container
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid #1E293B',
          background: '#0F172A'
        }}>
          <button 
            onClick={() => { haptic('light'); onClose(); }}
            style={{ background: 'none', border: 'none', color: '#38BDF8', fontSize: 16, fontWeight: 700 }}
          >
            Yopish
          </button>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#94A3B8', maxWidth: '60%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {title}
          </div>
          <div style={{ width: 45 }} /> {/* spacer */}
        </div>

        {/* Swipeable Pages (CSS Snap Scroll) */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{
            flex: 1,
            display: 'flex',
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-x pan-y',
            scrollbarWidth: 'none', // Firefox
          }}
          className="no-scrollbar"
        >
          {PREVIEW_PAGES.map((text, idx) => (
            <div
              key={idx}
              style={{
                minWidth: '100%',
                height: '100%',
                flexShrink: 0,
                scrollSnapAlign: 'start',
                padding: '24px 24px 80px 24px', // extra bottom padding for scrolling
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <div style={{ paddingBottom: '40px' }}>
                <p style={{
                  fontSize: 18,
                  lineHeight: 1.8,
                  fontFamily: 'serif',
                  color: '#CBD5E1',
                  textIndent: '2em',
                  margin: 0
                }}>
                  {text}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer / Page Indicator */}
        <div style={{
          padding: '16px', display: 'flex', justifyContent: 'center', gap: 6,
          background: '#0F172A', borderTop: '1px solid #1E293B'
        }}>
          {PREVIEW_PAGES.map((_, i) => (
            <div
              key={i}
              style={{
                width: 8, height: 8, borderRadius: '50%',
                background: i === currentPage ? '#38BDF8' : '#334155',
                transition: 'background 0.2s'
              }}
            />
          ))}
        </div>

        <style>{`
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}
