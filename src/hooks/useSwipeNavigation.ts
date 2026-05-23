"use client";

import { useCallback, useRef } from "react";

type Options = {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  enabled?: boolean;
};

/**
 * Swipe left = forward in time (next). Swipe right = backward (previous).
 */
export function useSwipeNavigation({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  enabled = true,
}: Options) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const pointerDown = useRef(false);

  const reset = () => {
    startX.current = null;
    startY.current = null;
    pointerDown.current = false;
  };

  const trySwipe = useCallback(
    (endX: number, endY: number) => {
      if (!enabled) return;
      if (startX.current == null || startY.current == null) return;
      const dx = endX - startX.current;
      const dy = endY - startY.current;
      if (Math.abs(dx) < threshold) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.2) return;
      if (dx < 0) onSwipeLeft?.();
      else onSwipeRight?.();
    },
    [enabled, threshold, onSwipeLeft, onSwipeRight]
  );

  const onTouchStart = (e: React.TouchEvent) => {
    if (!enabled || e.touches.length !== 1) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!enabled || startX.current == null) return;
    const t = e.changedTouches[0];
    if (t) trySwipe(t.clientX, t.clientY);
    reset();
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (!enabled || e.button !== 0) return;
    pointerDown.current = true;
    startX.current = e.clientX;
    startY.current = e.clientY;
  };

  const onMouseUp = (e: React.MouseEvent) => {
    if (!enabled || !pointerDown.current) return;
    trySwipe(e.clientX, e.clientY);
    reset();
  };

  const onMouseLeave = () => {
    if (pointerDown.current) reset();
  };

  return {
    swipeHandlers: {
      onTouchStart,
      onTouchEnd,
      onMouseDown,
      onMouseUp,
      onMouseLeave,
    },
  };
}
