"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { AFRICAN_COUNTRIES, type Country } from "@/lib/data/africa";
import {
  listCountrySounds,
  uploadCountrySound,
  deleteCountrySound,
  type CountrySound,
} from "@/lib/data/country-sounds";
import { supabase } from "@/lib/supabase/client";

const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_AUDIO_DURATION_SECONDS = 6;

function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement("audio");
    const objectUrl = URL.createObjectURL(file);

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      audio.removeAttribute("src");
      audio.load();
    };

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Could not read audio duration. Please try another audio file."));
    }, 10000);

    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      window.clearTimeout(timeout);
      const { duration } = audio;
      cleanup();

      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error("Could not read audio duration. Please try another audio file."));
        return;
      }

      resolve(duration);
    };
    audio.onerror = () => {
      window.clearTimeout(timeout);
      cleanup();
      reject(new Error("Could not read audio duration. Please choose a valid audio file."));
    };
    audio.src = objectUrl;
  });
}

export function CountrySoundsAdmin() {
  const [soundsMap, setSoundsMap] = useState<Record<string, CountrySound>>({});
  const [soundUrls, setSoundUrls] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploadingSlug, setUploadingSlug] = useState<string | null>(null);
  const [playingSlug, setPlayingSlug] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadSounds = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const sounds = await listCountrySounds();
      const map: Record<string, CountrySound> = {};
      sounds.forEach((s) => {
        map[s.country_slug] = s;
      });
      setSoundsMap(map);

      // Resolve signed or public URLs
      if (sounds.length > 0) {
        const paths = sounds.map((s) => s.audio_url);
        const { data: signed } = await supabase.storage
          .from("country-sounds")
          .createSignedUrls(paths, 60 * 60 * 6);

        const urlMap: Record<string, string> = {};
        sounds.forEach((s, i) => {
          if (signed && signed[i]?.signedUrl) {
            urlMap[s.country_slug] = signed[i].signedUrl;
          } else {
            const { data: pub } = supabase.storage
              .from("country-sounds")
              .getPublicUrl(s.audio_url);
            if (pub?.publicUrl) urlMap[s.country_slug] = pub.publicUrl;
          }
        });
        setSoundUrls(urlMap);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load country sounds";
      console.error("[CountrySoundsAdmin]", msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadSounds(false);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadSounds]);

  const handlePlay = (slug: string, url: string) => {
    if (playingSlug === slug) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingSlug(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingSlug(slug);

    audio.play().catch((e) => {
      console.error("Audio playback error:", e);
      setPlayingSlug(null);
    });

    audio.onended = () => {
      setPlayingSlug(null);
    };
  };

  const handleFileUpload = async (country: Country, file: File) => {
    if (!file) return;

    if (file.size > MAX_AUDIO_SIZE_BYTES) {
      setMessage({ text: "Audio file is too large. Please select a file under 10MB.", type: "error" });
      return;
    }

    setUploadingSlug(country.slug);
    setMessage(null);

    try {
      const duration = await getAudioDuration(file);
      if (duration > MAX_AUDIO_DURATION_SECONDS) {
        setMessage({
          text: `Audio is ${duration.toFixed(1)} seconds. Please upload a sound around ${MAX_AUDIO_DURATION_SECONDS} seconds or shorter.`,
          type: "error",
        });
        return;
      }

      await uploadCountrySound(country.slug, file, `${country.name} Sound`);
      setMessage({ text: `Characteristic sound for ${country.name} uploaded successfully!`, type: "success" });
      await loadSounds();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setMessage({ text: `Failed to upload: ${msg}`, type: "error" });
    } finally {
      setUploadingSlug(null);
    }
  };

  const handleDelete = async (country: Country) => {
    const existing = soundsMap[country.slug];
    if (!existing) return;

    if (!confirm(`Remove characteristic sound for ${country.name}?`)) return;

    try {
      await deleteCountrySound(country.slug, existing.audio_url);
      setMessage({ text: `Sound for ${country.name} removed.`, type: "success" });
      await loadSounds();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      setMessage({ text: `Failed to delete sound: ${msg}`, type: "error" });
    }
  };

  const filteredCountries = AFRICAN_COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.region.toLowerCase().includes(search.toLowerCase()) ||
    c.capital.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-primary/10">
        <div>
          <h2 className="font-display text-xl text-primary">Country Sound Identity</h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Upload characteristic sounds up to 6 seconds for each of the 54 African nations. These sounds play when users hover over countries on the interactive map.
          </p>
        </div>
        <input
          type="text"
          placeholder="Search nation or region…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 bg-transparent border border-primary/20 text-sm text-primary placeholder:text-on-surface-variant/50 focus:outline-none focus:border-secondary w-full md:w-64"
        />
      </div>

      {message && (
        <div
          className={`p-3 text-xs uppercase tracking-widest border ${
            message.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
              : "bg-rose-950/40 border-rose-500/50 text-rose-300"
          }`}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-on-surface-variant text-sm">Loading country sound directory…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCountries.map((c) => {
            const hasSound = Boolean(soundsMap[c.slug]);
            const url = soundUrls[c.slug];
            const isUploading = uploadingSlug === c.slug;
            const isPlaying = playingSlug === c.slug;

            return (
              <div
                key={c.slug}
                className="border border-primary/10 p-4 hover:border-primary/20 transition-colors flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{c.flag}</span>
                      <h3 className="font-display text-base text-primary">{c.name}</h3>
                    </div>
                    <span
                      className={`text-[9px] uppercase tracking-widest px-2 py-0.5 border ${
                        hasSound
                          ? "bg-secondary/10 border-secondary text-secondary"
                          : "border-primary/20 text-on-surface-variant"
                      }`}
                    >
                      {hasSound ? "Uploaded" : "Procedural"}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1 line-clamp-1">
                    {c.capital} · {c.region} Africa
                  </p>
                </div>

                <div className="pt-2 border-t border-primary/5 flex items-center justify-between gap-2">
                  {hasSound && url ? (
                    <button
                      type="button"
                      onClick={() => handlePlay(c.slug, url)}
                      className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-secondary hover:underline"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {isPlaying ? "pause_circle" : "play_circle"}
                      </span>
                      {isPlaying ? "Playing…" : "Preview"}
                    </button>
                  ) : (
                    <span className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                      No custom audio
                    </span>
                  )}

                  <div className="flex items-center gap-2">
                    <label
                      className={`cursor-pointer inline-flex items-center gap-1 px-2.5 py-1.5 border text-[10px] uppercase tracking-widest transition-colors ${
                        isUploading
                          ? "opacity-50 pointer-events-none border-primary/20 text-on-surface-variant"
                          : "border-primary/30 text-primary hover:border-secondary hover:text-secondary"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">upload_file</span>
                      {isUploading ? "Uploading…" : hasSound ? "Replace" : "Upload Sound"}
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(c, file);
                        }}
                      />
                    </label>

                    {hasSound && (
                      <button
                        type="button"
                        onClick={() => handleDelete(c)}
                        className="p-1.5 text-on-surface-variant hover:text-rose-400 border border-primary/10 hover:border-rose-400/40"
                        title="Delete Sound"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
