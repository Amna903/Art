"use client";

import { useCallback, useState } from "react";

/**
 * Tracks whether an <img> failed to load. onError alone misses images that
 * fail before React hydrates (the browser fires the event before the handler
 * is attached), so the ref callback also checks an already-finished image.
 */
export function useBrokenImage() {
  const [broken, setBroken] = useState(false);
  const ref = useCallback((img: HTMLImageElement | null) => {
    if (img && img.complete && img.naturalWidth === 0) setBroken(true);
  }, []);
  return { broken, ref, onError: () => setBroken(true) };
}
