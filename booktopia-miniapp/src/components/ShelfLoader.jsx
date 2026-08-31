import { useEffect, useState } from 'react';

/**
 * Loading state for the miniapp.
 *
 * Two decisions worth keeping:
 *
 * 1. It does not render for the first `delay` milliseconds. The production
 *    shell paints in roughly 50ms, so on a normal connection nobody ever sees
 *    this — and a spinner that flashes for 80ms reads as jank, not as polish.
 *    The loader only appears when waiting is real.
 *
 * 2. It is shaped like the thing being loaded. Books slide onto a shelf, one
 *    after another, in the brand palette. A generic spinner says "something is
 *    happening"; a shelf filling up says "your books are coming", which is the
 *    same wait told honestly.
 *
 * No images, no library, no extra request — pure CSS on elements already in the
 * bundle, so it costs nothing to show and nothing to skip.
 */

const SPINES = [
  { h: 76, w: 15, c: '#265999' },
  { h: 92, w: 12, c: '#D5AD36' },
  { h: 68, w: 17, c: '#38A169' },
  { h: 88, w: 13, c: '#805AD5' },
  { h: 74, w: 16, c: '#3182CE' },
];

export default function ShelfLoader({ delay = 300, label }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(id);
  }, [delay]);

  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 18, minHeight: '60dvh', padding: 24,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 96 }}>
        {SPINES.map((s, i) => (
          <span
            key={i}
            aria-hidden="true"
            style={{
              width: s.w,
              height: s.h,
              borderRadius: '2px 3px 3px 2px',
              background: s.c,
              transformOrigin: 'bottom center',
              animation: `shelf-in 1.6s cubic-bezier(0.34, 1.3, 0.64, 1) ${i * 0.13}s infinite`,
              // A lighter edge reads as the page block beside the spine.
              boxShadow: `inset -3px 0 0 rgba(255,255,255,0.28)`,
            }}
          />
        ))}
      </div>

      {/* the shelf itself */}
      <span
        aria-hidden="true"
        style={{
          width: 108, height: 3, borderRadius: 3,
          background: 'var(--surface-2)', marginTop: -16,
        }}
      />

      <img
        src="/brand-wordmark.png" alt="" aria-hidden="true"
        style={{ width: 104, height: 'auto', opacity: 0.35 }}
      />

      {label && (
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>{label}</p>
      )}

      <style>{`
        @keyframes shelf-in {
          0%   { transform: translateY(14px) rotate(-8deg); opacity: 0; }
          22%  { transform: translateY(0) rotate(0deg);     opacity: 1; }
          72%  { transform: translateY(0) rotate(0deg);     opacity: 1; }
          100% { transform: translateY(0) rotate(0deg);     opacity: 0.25; }
        }
        @media (prefers-reduced-motion: reduce) {
          [role="status"] span { animation: none !important; opacity: 1 !important; }
        }
      `}</style>
    </div>
  );
}
