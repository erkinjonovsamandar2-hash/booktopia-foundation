import { useEffect, useRef } from 'react';

/**
 * Click-and-drag horizontal scrolling for a row of cards.
 *
 * Mouse only, deliberately. Touch already scrolls these rows natively with
 * momentum, and running our own handler alongside it would fight the browser
 * for the same gesture — on a Telegram mini app that is the one input we cannot
 * afford to get wrong. Pointer events from a finger are ignored here.
 *
 * A drag must not also register as a tap on the card underneath, so movement
 * past DRAG_THRESHOLD swallows the click that the browser fires afterwards.
 * Below the threshold nothing is suppressed, and "Savatga qo'shish" behaves
 * exactly as before.
 */

const DRAG_THRESHOLD = 8; // px of travel before it counts as a drag, not a tap

export default function useDragScroll() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let startX = 0;
    let startScroll = 0;
    let pointerDown = false;
    let dragged = false;

    const onPointerDown = (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      pointerDown = true;
      dragged = false;
      startX = e.clientX;
      startScroll = el.scrollLeft;
    };

    const onPointerMove = (e) => {
      if (!pointerDown) return;
      const dx = e.clientX - startX;
      if (!dragged && Math.abs(dx) < DRAG_THRESHOLD) return;
      if (!dragged) {
        dragged = true;
        el.style.cursor = 'grabbing';
        // Snapping mid-drag drifts the row under the cursor.
        el.style.scrollSnapType = 'none';
      }
      el.scrollLeft = startScroll - dx;
    };

    const endDrag = () => {
      if (!pointerDown) return;
      pointerDown = false;
      el.style.cursor = '';
      el.style.scrollSnapType = '';
    };

    // Capture phase: the card's own onClick must not run for a drag.
    const onClickCapture = (e) => {
      if (!dragged) return;
      e.preventDefault();
      e.stopPropagation();
      dragged = false;
    };

    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', endDrag);
    el.addEventListener('click', onClickCapture, true);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', endDrag);
      el.removeEventListener('click', onClickCapture, true);
    };
  }, []);

  return ref;
}
