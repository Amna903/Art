"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * One music player for the whole app (change brief, section 3).
 *
 * The <audio> element is created once in MusicProvider at the app root, so
 * nothing in the gallery or the guided tour can destroy it: changing artwork,
 * opening the grid, "Back to artworks" and free exploration never touch it.
 * Tracks play one after another and the playlist loops. The only things that
 * stop the music are the visitor (Pause) and leaving the gallery, both with a
 * ~1 s fade.
 */

export type Track = { url: string; title: string; country: string | null };

type MusicContextValue = {
  tracks: Track[];
  current: Track | null;
  playing: boolean;
  muted: boolean;
  /** Fetches the playlist; call when the gallery mounts so Start can play instantly. */
  loadPlaylist: () => Promise<void>;
  /** Starts the music. Call from a click handler (browsers need the gesture). */
  start: () => void;
  pause: () => void;
  resume: () => void;
  toggleMute: () => void;
  /** Fades out and stops; used when the visitor leaves the gallery. */
  stop: () => void;
};

const MusicContext = createContext<MusicContextValue | null>(null);

const PREF_KEY = "nua-music";
type Prefs = { muted?: boolean; paused?: boolean };

function readPrefs(): Prefs {
  try {
    return JSON.parse(sessionStorage.getItem(PREF_KEY) ?? "{}") as Prefs;
  } catch {
    return {};
  }
}

function writePrefs(next: Prefs) {
  try {
    sessionStorage.setItem(PREF_KEY, JSON.stringify({ ...readPrefs(), ...next }));
  } catch {
    // Private mode / blocked storage: the choice just isn't remembered.
  }
}

const FADE_MS = 1000;
const VOLUME = 0.8;

async function fetchPlaylist(): Promise<Track[]> {
  if (!isSupabaseConfigured()) return [];
  const { data: rows } = await supabase
    .from("gallery_tracks")
    .select("title, country_slug, audio_path")
    .eq("active", true)
    .order("position")
    .order("created_at");
  // Only full-length tracks from the gallery playlist. The map's country
  // sounds are short clips (6 s maximum) and are not used here.
  return (rows ?? []).map((r) => ({
    url: /^https?:\/\//.test(r.audio_path)
      ? r.audio_path
      : supabase.storage.from("gallery-music").getPublicUrl(r.audio_path).data.publicUrl,
    title: r.title,
    country: r.country_slug,
  }));
}

export function MusicProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tracksRef = useRef<Track[]>([]);
  const indexRef = useRef(0);
  const fadeRef = useRef<number | null>(null);
  const failuresRef = useRef(0);
  const loadingRef = useRef<Promise<void> | null>(null);
  const pendingStartRef = useRef(false);
  const hiddenPauseRef = useRef(false);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(() => typeof window !== "undefined" && !!readPrefs().muted);

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = "auto";
      audio.volume = VOLUME;
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  const cancelFade = () => {
    if (fadeRef.current != null) cancelAnimationFrame(fadeRef.current);
    fadeRef.current = null;
  };

  const fadeTo = useCallback((target: number, done?: () => void) => {
    const audio = getAudio();
    cancelFade();
    const from = audio.volume;
    const started = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - started) / FADE_MS);
      audio.volume = from + (target - from) * k;
      if (k < 1) fadeRef.current = requestAnimationFrame(step);
      else {
        fadeRef.current = null;
        done?.();
      }
    };
    fadeRef.current = requestAnimationFrame(step);
  }, [getAudio]);

  const playIndex = useCallback((i: number) => {
    const list = tracksRef.current;
    if (list.length === 0) return;
    const audio = getAudio();
    indexRef.current = ((i % list.length) + list.length) % list.length;
    setIndex(indexRef.current);
    audio.src = list[indexRef.current].url; // full-length file, not a preview
    cancelFade();
    audio.volume = VOLUME;
    void audio.play().catch(() => setPlaying(false));
  }, [getAudio]);

  // Wire the element once: next track on end, skip broken files, mirror state.
  useEffect(() => {
    const audio = getAudio();
    const onEnded = () => playIndex(indexRef.current + 1);
    const onError = () => {
      failuresRef.current += 1;
      if (failuresRef.current < tracksRef.current.length) playIndex(indexRef.current + 1);
      else setPlaying(false);
    };
    const onPlaying = () => {
      failuresRef.current = 0;
      setPlaying(true);
    };
    const onPause = () => setPlaying(false);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);
    audio.muted = !!readPrefs().muted;
    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
    };
  }, [getAudio, playIndex]);

  // Optional behaviour from the brief: pause while the tab is hidden.
  useEffect(() => {
    const onVisibility = () => {
      const audio = getAudio();
      if (document.hidden && !audio.paused) {
        hiddenPauseRef.current = true;
        audio.pause();
      } else if (!document.hidden && hiddenPauseRef.current) {
        hiddenPauseRef.current = false;
        void audio.play().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [getAudio]);

  const loadPlaylist = useCallback(() => {
    if (!loadingRef.current) {
      loadingRef.current = fetchPlaylist()
        .then((list) => {
          tracksRef.current = list;
          setTracks(list);
          if (pendingStartRef.current && list.length > 0) {
            pendingStartRef.current = false;
            playIndex(0);
          }
        })
        .catch(() => {
          loadingRef.current = null;
        });
    }
    return loadingRef.current ?? Promise.resolve();
  }, [playIndex]);

  const start = useCallback(() => {
    if (readPrefs().paused) return;
    const audio = getAudio();
    if (!audio.paused) return; // already playing: never restart
    if (tracksRef.current.length === 0) {
      pendingStartRef.current = true;
      void loadPlaylist();
      return;
    }
    if (audio.src) {
      cancelFade();
      audio.volume = VOLUME;
      void audio.play().catch(() => setPlaying(false));
    } else {
      playIndex(0);
    }
  }, [getAudio, loadPlaylist, playIndex]);

  const pause = useCallback(() => {
    writePrefs({ paused: true });
    const audio = getAudio();
    if (audio.paused) return;
    fadeTo(0, () => audio.pause());
  }, [fadeTo, getAudio]);

  const resume = useCallback(() => {
    writePrefs({ paused: false });
    start();
  }, [start]);

  const toggleMute = useCallback(() => {
    const audio = getAudio();
    audio.muted = !audio.muted;
    setMuted(audio.muted);
    writePrefs({ muted: audio.muted });
  }, [getAudio]);

  const stop = useCallback(() => {
    pendingStartRef.current = false;
    const audio = getAudio();
    if (audio.paused) return;
    fadeTo(0, () => audio.pause());
  }, [fadeTo, getAudio]);

  const value = useMemo<MusicContextValue>(
    () => ({
      tracks,
      current: tracks[index] ?? null,
      playing,
      muted,
      loadPlaylist,
      start,
      pause,
      resume,
      toggleMute,
      stop,
    }),
    [tracks, index, playing, muted, loadPlaylist, start, pause, resume, toggleMute, stop],
  );

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}

export function useMusic(): MusicContextValue {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error("useMusic must be used inside MusicProvider");
  return ctx;
}
