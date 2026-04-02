import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook that enables drag-to-scroll on touch/mouse for kiosk touchscreens.
 * Returns a ref to attach to the scrollable container.
 *
 * @param {object} options
 * @param {string} options.direction - 'vertical' | 'horizontal' | 'both'
 * @returns {React.RefObject}
 */
export default function useTouchScroll({ direction = 'vertical' } = {}) {
  const ref = useRef(null);
  useTouchScrollOnRef(ref, { direction });
  return ref;
}

/**
 * Attach drag-to-scroll to an existing ref (for components that already have a ref).
 *
 * @param {React.RefObject} ref
 * @param {object} options
 * @param {string} options.direction - 'vertical' | 'horizontal' | 'both'
 */
export function useTouchScrollOnRef(ref, { direction = 'vertical' } = {}) {
  const state = useRef({
    isDown: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
    moved: false,
  });

  const getPos = useCallback((e) => {
    const touch = e.touches ? e.touches[0] : e;
    return { x: touch.clientX, y: touch.clientY };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onStart = (e) => {
      state.current.isDown = true;
      state.current.moved = false;
      const pos = getPos(e);
      state.current.startX = pos.x;
      state.current.startY = pos.y;
      state.current.scrollLeft = el.scrollLeft;
      state.current.scrollTop = el.scrollTop;
      el.style.scrollBehavior = 'auto';
      el.style.cursor = 'grabbing';
    };

    const onMove = (e) => {
      if (!state.current.isDown) return;
      const pos = getPos(e);
      const dx = pos.x - state.current.startX;
      const dy = pos.y - state.current.startY;

      if (direction === 'vertical' || direction === 'both') {
        el.scrollTop = state.current.scrollTop - dy;
      }
      if (direction === 'horizontal' || direction === 'both') {
        el.scrollLeft = state.current.scrollLeft - dx;
      }

      if (Math.abs(dy) > 5 || Math.abs(dx) > 5) {
        state.current.moved = true;
        e.preventDefault();
      }
    };

    const onEnd = () => {
      state.current.isDown = false;
      el.style.scrollBehavior = '';
      el.style.cursor = '';
    };

    // Prevent click if user was dragging (so items don't accidentally activate)
    const onClick = (e) => {
      if (state.current.moved) {
        e.stopPropagation();
        e.preventDefault();
        state.current.moved = false;
      }
    };

    // Mouse events
    el.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);

    // Touch events
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);

    // Block accidental clicks after drag
    el.addEventListener('click', onClick, true);

    // Prevent native drag (image/text drag)
    el.addEventListener('dragstart', (e) => e.preventDefault());

    return () => {
      el.removeEventListener('mousedown', onStart);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('click', onClick, true);
    };
  }, [direction, getPos, ref]);
}
