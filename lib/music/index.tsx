"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * One music player for the whole app (change brief, section 3).
 *
 * The <audio> element is created once in MusicProvider at the app root, so
 * nothing in the gallery or the guided tour can destroy it: changing artwork,
 * opening the grid, "Back to artworks" and free exploration never touch it.
 * Each country has its own soundtrack: `setCountry()` switches to the tracks
 * the admin assigned to that country (crossfading ~1 s), and tracks with no
 * country are the fallback for countries that have none; a country with no
 * music and no fallback is silent (never another country's music). Moving between
 * artworks of the same country never interrupts the music. Within a country
 * the tracks play one after another and loop. The only things that stop the
 * music are the visitor (Pause) and leaving the gallery, both with a fade.
 */

export type Track = { url: string; title: string; country: string | null };

type MusicContextValue = {
  tracks: Track[];
  current: Track | null;
  playing: boolean;
  muted: boolean;
  /** Country whose soundtrack is playing (null = general playlist). */
  country: string | null;
  /** Fetches the playlist; call when the gallery mounts so Start can play instantly. */
  loadPlaylist: () => Promise<void>;
  /** Starts the music. Call from a click handler (browsers need the gesture). */
  start: () => void;
  pause: () => void;
  resume: () => void;
  toggleMute: () => void;
  /** Fades out and stops; used when the visitor leaves the gallery. */
  stop: () => void;
  /**
   * Switches to the soundtrack of the artwork on show. A no-op while that
   * soundtrack is already playing, so works from one country play straight on.
   */
  setCountry: (slug: string | null) => void;
};

/** Which tracks belong to a country: its own, else the general ones. */
export function playlistFor(all: Track[], slug: string | null): { key: string; list: Track[] } {
  if (slug) {
    const own = all.filter((t) => t.country === slug);
    if (own.length > 0) return { key: `country:${slug}`, list: own };
  }
  const general = all.filter((t) => !t.country);
  if (general.length > 0) return { key: "general", list: general };
  // No general tracks either: nothing fits this country.
  return { key: "none", list: [] };
}

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
  const allTracksRef = useRef<Track[]>([]);
  const tracksRef = useRef<Track[]>([]); // the active (per-country) playlist
  const playlistKeyRef = useRef<string>("");
  const countryRef = useRef<string | null>(null);
  const indexRef = useRef(0);
  const fadeRef = useRef<number | null>(null);
  const failuresRef = useRef(0);
  const loadingRef = useRef<Promise<void> | null>(null);
  const pendingStartRef = useRef(false);
  const hiddenPauseRef = useRef(false);
  const stoppingRef = useRef(false); // a Pause / Stop fade-out is running
  // Music is wanted but the current country has none (and there is no
  // general playlist): stay quiet rather than play another country's music,
  // and start again as soon as the tour reaches a country that has some.
  const silencedRef = useRef(false);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
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

  const playIndex = useCallback((i: number, fadeIn = false) => {
    const list = tracksRef.current;
    if (list.length === 0) return;
    const audio = getAudio();
    indexRef.current = ((i % list.length) + list.length) % list.length;
    setIndex(indexRef.current);
    audio.src = list[indexRef.current].url; // full-length file, not a preview
    cancelFade();
    audio.volume = fadeIn ? 0 : VOLUME;
    void audio
      .play()
      .then(() => {
        if (fadeIn) fadeTo(VOLUME);
      })
      .catch(() => setPlaying(false));
  }, [getAudio, fadeTo]);

  /** Points the active playlist at the current country. True if it changed. */
  const selectPlaylist = useCallback(() => {
    const { key, list } = playlistFor(allTracksRef.current, countryRef.current);
    if (key === playlistKeyRef.current) return false;
    playlistKeyRef.current = key;
    tracksRef.current = list;
    setTracks(list);
    setActiveCountry(key.startsWith("country:") ? key.slice(8) : null);
    failuresRef.current = 0;
    return true;
  }, []);

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
          allTracksRef.current = list;
          selectPlaylist();
          if (pendingStartRef.current) {
            pendingStartRef.current = false;
            if (tracksRef.current.length > 0) playIndex(0);
            else silencedRef.current = true;
          }
        })
        .catch(() => {
          loadingRef.current = null;
        });
    }
    return loadingRef.current ?? Promise.resolve();
  }, [playIndex, selectPlaylist]);

  const start = useCallback(() => {
    if (readPrefs().paused) return;
    const audio = getAudio();
    if (stoppingRef.current) {
      // Came back during the fade-out (e.g. moved to another room). Keep
      // playing only if it is still the right country's soundtrack.
      stoppingRef.current = false;
      cancelFade();
      if (allTracksRef.current.length > 0) {
        const changed = selectPlaylist();
        if (tracksRef.current.length === 0) {
          silencedRef.current = true; // this country has no music
          audio.pause();
          return;
        }
        silencedRef.current = false;
        if (changed) {
          playIndex(0, true);
          return;
        }
      }
      audio.volume = VOLUME;
    }
    if (!audio.paused) return; // already playing: never restart
    if (allTracksRef.current.length === 0) {
      pendingStartRef.current = true;
      void loadPlaylist();
      return;
    }
    // Paused while the visitor moved to another country: start that
    // country's soundtrack instead of resuming the old one.
    const changed = selectPlaylist();
    if (tracksRef.current.length === 0) {
      silencedRef.current = true; // this country has no music
      return;
    }
    silencedRef.current = false;
    if (changed) {
      playIndex(0);
      return;
    }
    if (audio.src) {
      cancelFade();
      audio.volume = VOLUME;
      void audio.play().catch(() => setPlaying(false));
    } else {
      playIndex(0);
    }
  }, [getAudio, loadPlaylist, playIndex, selectPlaylist]);

  const pause = useCallback(() => {
    writePrefs({ paused: true });
    silencedRef.current = false;
    const audio = getAudio();
    if (audio.paused) return;
    stoppingRef.current = true;
    fadeTo(0, () => {
      stoppingRef.current = false;
      audio.pause();
    });
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
    silencedRef.current = false;
    const audio = getAudio();
    if (audio.paused) return;
    stoppingRef.current = true;
    fadeTo(0, () => {
      stoppingRef.current = false;
      audio.pause();
    });
  }, [fadeTo, getAudio]);

  const setCountry = useCallback(
    (slug: string | null) => {
      if (countryRef.current === slug) return;
      countryRef.current = slug;
      if (allTracksRef.current.length === 0) return; // applied once loaded
      // Fading out after Pause / leaving: leave it be.
      if (stoppingRef.current) return;
      const audio = getAudio();

      // Quiet because the previous country had no music.
      if (silencedRef.current) {
        selectPlaylist();
        if (tracksRef.current.length > 0) {
          silencedRef.current = false;
          playIndex(0, true);
        }
        return;
      }
      // Not playing (not started, or paused by the visitor): start() picks
      // up the right country next time.
      if (audio.paused) return;

      const { key } = playlistFor(allTracksRef.current, slug);
      if (key === playlistKeyRef.current) {
        // Same soundtrack: play on. If it was fading out towards another
        // country the visitor has now left, fade it back up instead.
        if (fadeRef.current != null) fadeTo(VOLUME);
        return;
      }
      // Fade the old soundtrack out, then fade the new one in — or stay
      // quiet if this country has no music.
      fadeTo(0, () => {
        if (stoppingRef.current) return;
        // The visitor may have moved on again during the fade.
        const changed = selectPlaylist();
        if (tracksRef.current.length === 0) {
          silencedRef.current = true;
          audio.pause();
        } else if (changed) playIndex(0, true);
        else fadeTo(VOLUME);
      });
    },
    [fadeTo, getAudio, playIndex, selectPlaylist],
  );

  const value = useMemo<MusicContextValue>(
    () => ({
      tracks,
      current: tracks[index] ?? null,
      playing,
      muted,
      country: activeCountry,
      loadPlaylist,
      start,
      pause,
      resume,
      toggleMute,
      stop,
      setCountry,
    }),
    [tracks, index, playing, muted, activeCountry, loadPlaylist, start, pause, resume, toggleMute, stop, setCountry],
  );

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}

export function useMusic(): MusicContextValue {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error("useMusic must be used inside MusicProvider");
  return ctx;
}
