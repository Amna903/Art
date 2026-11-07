"use client";

import { useCallback, useEffect, useRef } from "react";
import { useCountrySoundUrls } from "@/lib/data/country-sounds";

type Cue = (slug: string, ctx: AudioContext, master: GainNode) => void;

const FADE_IN_MS = 120;
const FADE_OUT_MS = 220;
const VOLUME = 0.8;

/**
 * Shared hover-sound player for the Africa maps.
 *
 * - Preloads every uploaded country sound once (no network delay on hover).
 * - Unlocks audio on the first user gesture (browsers block sound until then).
 * - Fades in/out instead of hard start/stop, and never lets a stale play()
 *   start after the pointer has already left.
 * - Stops everything on unmount / tab hide, so sound never "sticks" after navigating.
 */
export function useCountrySoundPlayer(enabled: boolean, synthCue: Cue) {
  const urls = useCountrySoundUrls();
  const cacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const currentRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef<Map<HTMLAudioElement, number>>(new Map());
  const tokenRef = useRef(0);
  const ctxRef = useRef<{ ctx: AudioContext; master: GainNode } | null>(null);
  const unlockedRef = useRef(false);
  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const ensureCtx = useCallback(() => {
    if (ctxRef.current) return ctxRef.current;
    if (typeof window === "undefined") return null;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = 0.4;
    master.connect(ctx.destination);
    ctxRef.current = { ctx, master };
    return ctxRef.current;
  }, []);

  // Preload uploaded sounds as soon as their URLs arrive.
  useEffect(() => {
    const cache = cacheRef.current;
    Object.entries(urls).forEach(([slug, url]) => {
      if (cache.has(slug)) return;
      const el = new Audio();
      el.preload = "auto";
      el.src = url;
      el.load();
      cache.set(slug, el);
    });
  }, [urls]);

  const clearFade = (el: HTMLAudioElement) => {
    const id = fadeRef.current.get(el);
    if (id) cancelAnimationFrame(id);
    fadeRef.current.delete(el);
  };

  const fade = (el: HTMLAudioElement, to: number, ms: number, done?: () => void) => {
    clearFade(el);
    const from = el.volume;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      el.volume = Math.max(0, Math.min(1, from + (to - from) * t));
      if (t < 1) fadeRef.current.set(el, requestAnimationFrame(step));
      else {
        fadeRef.current.delete(el);
        done?.();
      }
    };
    fadeRef.current.set(el, requestAnimationFrame(step));
  };

  const stop = useCallback((immediate = false) => {
    tokenRef.current++; // invalidate any pending play()
    const el = currentRef.current;
    currentRef.current = null;
    if (!el) return;
    const halt = () => {
      el.pause();
      try {
        el.currentTime = 0;
      } catch {}
    };
    if (immediate) {
      clearFade(el);
      halt();
    } else {
      fade(el, 0, FADE_OUT_MS, halt);
    }
  }, []);

  // Unlock audio on the first real user gesture (autoplay policy).
  useEffect(() => {
    const unlock = () => {
      if (unlockedRef.current) return;
      unlockedRef.current = true;
      const a = ensureCtx();
      if (a && a.ctx.state === "suspended") a.ctx.resume().catch(() => {});
      // Prime each cached element so later hover playback is allowed (iOS/Safari).
      cacheRef.current.forEach((el) => {
        if (el === currentRef.current) return;
        el.muted = true;
        el.play()
          .then(() => {
            if (el !== currentRef.current) {
              el.pause();
              el.currentTime = 0;
            }
            el.muted = false;
          })
          .catch(() => {
            el.muted = false;
          });
      });
      events.forEach((e) => window.removeEventListener(e, unlock, true));
    };
    const events = ["pointerdown", "keydown", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, unlock, { capture: true, passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, unlock, true));
  }, [ensureCtx]);

  // Stop on unmount, route change, tab hide, or bfcache.
  useEffect(() => {
    const onHide = () => stop(true);
    const onVis = () => document.hidden && stop(true);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onHide);
      stop(true);
      cacheRef.current.forEach((el) => {
        clearFade(el);
        el.pause();
      });
      ctxRef.current?.ctx.suspend().catch(() => {});
    };
  }, [stop]);

  useEffect(() => {
    if (!enabled) stop(true);
  }, [enabled, stop]);

  const play = useCallback(
    (slug: string) => {
      if (!enabledRef.current) return;
      stop();
      const token = tokenRef.current;
      const el = cacheRef.current.get(slug);
      if (el) {
        clearFade(el);
        el.volume = 0;
        try {
          el.currentTime = 0;
        } catch {}
        currentRef.current = el;
        el.play()
          .then(() => {
            // Pointer left (or another country started) before play resolved.
            if (token !== tokenRef.current || currentRef.current !== el) {
              el.pause();
              return;
            }
            fade(el, VOLUME, FADE_IN_MS);
          })
          .catch(() => {
            if (currentRef.current === el) currentRef.current = null;
          });
        return;
      }
      const a = ensureCtx();
      if (!a) return;
      if (a.ctx.state === "suspended") a.ctx.resume().catch(() => {});
      synthCue(slug, a.ctx, a.master);
    },
    [ensureCtx, stop, synthCue],
  );

  return { play, stop };
}
