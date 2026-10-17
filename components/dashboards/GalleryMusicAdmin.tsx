"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";
import { AFRICAN_COUNTRIES, getCountryDisplayName } from "@/lib/data/africa";

type TrackRow = {
  id: string;
  title: string;
  country_slug: string | null;
  audio_path: string;
  duration_seconds: number | null;
  position: number;
  active: boolean;
};

const MAX_BYTES = 40 * 1024 * 1024;
/** Streaming previews (Spotify, Apple Music, Deezer) are exactly 30 s. */
const PREVIEW_SECONDS = 60;

function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    const url = URL.createObjectURL(file);
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(audio.duration) ? Math.round(audio.duration) : null);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    audio.src = url;
  });
}

const publicUrl = (path: string) =>
  /^https?:\/\//.test(path) ? path : supabase.storage.from("gallery-music").getPublicUrl(path).data.publicUrl;

/**
 * The gallery playlist (change brief §3): full-length tracks played in order,
 * looping, for the whole guided tour.
 */
export function GalleryMusicAdmin() {
  const { t, language } = useLanguage();
  const [tracks, setTracks] = useState<TrackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [country, setCountry] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("gallery_tracks")
      .select("id, title, country_slug, audio_path, duration_seconds, position, active")
      .order("position")
      .order("created_at");
    if (error) toast.error(t(error.message));
    setTracks((data ?? []) as TrackRow[]);
    setLoading(false);
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const upload = async () => {
    if (!file || !title.trim()) return;
    if (file.size > MAX_BYTES) {
      toast.error(t("The file is larger than 40 MB."));
      return;
    }
    setBusy(true);
    const duration = await readDuration(file);
    const ext = file.name.split(".").pop() || "mp3";
    const path = `${Date.now()}-${title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${ext}`;
    const { error: upErr } = await supabase.storage.from("gallery-music").upload(path, file, { contentType: file.type });
    if (upErr) {
      setBusy(false);
      toast.error(t(upErr.message));
      return;
    }
    const position = tracks.length ? Math.max(...tracks.map((x) => x.position)) + 1 : 0;
    const { error } = await supabase.from("gallery_tracks").insert({
      title: title.trim(),
      country_slug: country || null,
      audio_path: path,
      duration_seconds: duration,
      position,
    });
    setBusy(false);
    if (error) {
      toast.error(t(error.message));
      return;
    }
    if (duration != null && duration <= PREVIEW_SECONDS) {
      toast.warning(t("This track is only {seconds} seconds long. Use the full-length file, not a preview.", { seconds: duration }));
    } else {
      toast.success(t("Track added."));
    }
    setFile(null);
    setTitle("");
    setCountry("");
    void load();
  };

  const update = async (id: string, patch: Partial<TrackRow>) => {
    const { error } = await supabase.from("gallery_tracks").update(patch).eq("id", id);
    if (error) toast.error(t(error.message));
    void load();
  };

  const move = async (i: number, dir: -1 | 1) => {
    const a = tracks[i];
    const b = tracks[i + dir];
    if (!a || !b) return;
    await Promise.all([
      supabase.from("gallery_tracks").update({ position: b.position }).eq("id", a.id),
      supabase.from("gallery_tracks").update({ position: a.position === b.position ? a.position + dir : a.position }).eq("id", b.id),
    ]);
    void load();
  };

  const remove = async (track: TrackRow) => {
    if (!confirm(t("Delete “{title}”?", { title: track.title }))) return;
    if (!/^https?:\/\//.test(track.audio_path)) await supabase.storage.from("gallery-music").remove([track.audio_path]);
    const { error } = await supabase.from("gallery_tracks").delete().eq("id", track.id);
    if (error) toast.error(t(error.message));
    void load();
  };

  const minutes = (s: number | null) => (s == null ? "—" : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);
  const totalSeconds = tracks.filter((x) => x.active).reduce((sum, x) => sum + (x.duration_seconds ?? 0), 0);

  return (
    <section className="mt-10 space-y-10">
      <div>
        <h2 className="font-headline-sm text-headline-sm text-primary">{t("Gallery music")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">
          {t("Full-length tracks for the virtual gallery. They play in this order for the whole tour, and the playlist loops. Music starts when a visitor taps “Start the tour”.")}
        </p>
      </div>

      <div className="grid gap-5 border border-primary/10 p-6 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        <label className="block">
          <span className="mb-2 block font-label-caps text-label-caps uppercase text-on-surface-variant">{t("Audio file")}</span>
          <input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm" />
        </label>
        <label className="block">
          <span className="mb-2 block font-label-caps text-label-caps uppercase text-on-surface-variant">{t("Track title")}</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border-b border-primary/30 bg-transparent py-2 text-primary" />
        </label>
        <label className="block">
          <span className="mb-2 block font-label-caps text-label-caps uppercase text-on-surface-variant">{t("Country (optional)")}</span>
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full border-b border-primary/30 bg-transparent py-2 text-primary">
            <option value="">—</option>
            {AFRICAN_COUNTRIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {getCountryDisplayName(c, language)}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={upload} disabled={!file || !title.trim() || busy} className="btn-primary px-5 py-2.5 text-xs uppercase tracking-[0.2em] disabled:opacity-50">
          {busy ? t("Uploading…") : t("Add track")}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-on-surface-variant">{t("Loading…")}</p>
      ) : tracks.length === 0 ? (
        <p className="text-sm text-on-surface-variant">{t("No tracks yet. The gallery shows no music control until a track is added.")}</p>
      ) : (
        <div>
          <p className="mb-3 text-sm text-on-surface-variant">
            {t("Active playlist: {count} tracks, {duration} in total.", {
              count: tracks.filter((x) => x.active).length,
              duration: minutes(totalSeconds),
            })}
          </p>
          <ul className="divide-y divide-primary/10 border-y border-primary/10">
            {tracks.map((track, i) => (
              <li key={track.id} className="flex flex-wrap items-center gap-4 py-4">
                <div className="flex flex-col">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={t("Move up")} className="material-symbols-outlined text-[18px] disabled:opacity-20">
                    keyboard_arrow_up
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === tracks.length - 1} aria-label={t("Move down")} className="material-symbols-outlined text-[18px] disabled:opacity-20">
                    keyboard_arrow_down
                  </button>
                </div>
                <div className="min-w-[200px] flex-1">
                  <p className="text-primary">{track.title}</p>
                  <p className="text-xs text-on-surface-variant">
                    {[track.country_slug && getCountryDisplayName(track.country_slug, language), minutes(track.duration_seconds)].filter(Boolean).join(" · ")}
                    {track.duration_seconds != null && track.duration_seconds <= PREVIEW_SECONDS && (
                      <span className="ml-2 text-secondary">{t("Short clip — replace with the full track")}</span>
                    )}
                  </p>
                </div>
                <audio controls preload="none" src={publicUrl(track.audio_path)} className="h-9 max-w-[260px]" />
                <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-on-surface-variant">
                  <input type="checkbox" checked={track.active} onChange={(e) => update(track.id, { active: e.target.checked })} />
                  {t("In playlist")}
                </label>
                <button type="button" onClick={() => remove(track)} className="text-xs uppercase tracking-widest text-secondary">
                  {t("Delete")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
