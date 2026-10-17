"use client";

import { useLanguage } from "@/lib/i18n";
import { useMusic } from "@/lib/music";
import { getCountryDisplayName } from "@/lib/data/africa";

/** Small Listen / Pause control with mute, fixed in a bottom corner
 * (`className` sets which one). */
export function MusicControl({ tone = "dark", className }: { tone?: "dark" | "light"; className?: string }) {
  const { t, language } = useLanguage();
  const { tracks, current, playing, muted, resume, pause, toggleMute } = useMusic();
  if (tracks.length === 0) return null;

  const surface =
    tone === "dark"
      ? "bg-[var(--nua-charcoal-deep)]/90 text-[var(--nua-white)] border-[var(--nua-line-dark)]"
      : "bg-[var(--nua-white)]/95 text-[var(--nua-charcoal)] border-[var(--nua-line)]";
  const muteHint = tone === "dark" ? "text-[var(--nua-grey-light)]" : "text-[var(--nua-grey)]";
  const country = current?.country ? getCountryDisplayName(current.country, language) : "";
  const nowPlaying = [current?.title, country].filter(Boolean).join(", ");

  return (
    <div className={`fixed z-[80] flex max-w-[calc(100vw-2rem)] flex-col gap-1 ${className ?? "bottom-4 right-4 items-end"}`}>
      <div className={`flex items-center border shadow-lg backdrop-blur-md ${surface}`}>
        <button
          type="button"
          onClick={playing ? pause : resume}
          aria-pressed={playing}
          className="flex min-h-[44px] items-center gap-2 px-4 text-sm"
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
            {playing ? "pause" : "play_arrow"}
          </span>
          {playing ? t("Pause") : t("Listen")}
        </button>
        <button
          type="button"
          onClick={toggleMute}
          aria-pressed={muted}
          aria-label={muted ? t("Unmute music") : t("Mute music")}
          className={`flex h-11 w-11 items-center justify-center border-l ${tone === "dark" ? "border-[var(--nua-line-dark)]" : "border-[var(--nua-line)]"}`}
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
            {muted ? "volume_off" : "volume_up"}
          </span>
        </button>
      </div>
      {playing && nowPlaying && (
        <p className={`max-w-[260px] truncate text-xs ${muteHint}`}>
          {t("Now playing — {track}", { track: nowPlaying })}
        </p>
      )}
    </div>
  );
}
