"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";

/**
 * Generates the pre-made list thumbnails (640/1280 WebP) for artworks that
 * don't have them yet — e.g. everything uploaded before thumbnails existed.
 * Works in batches of 20 until none are left.
 */
export function ThumbnailBackfill() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    let made = 0;
    let failed = 0;
    try {
      for (;;) {
        const res = await fetch("/api/artworks/thumbnails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
          body: JSON.stringify({ missing: true }),
        });
        const body = (await res.json()) as { done?: { ok: boolean }[]; remaining?: number; error?: string };
        if (!res.ok) throw new Error(body.error ?? res.statusText);
        const ok = (body.done ?? []).filter((d) => d.ok).length;
        made += ok;
        failed += (body.done ?? []).length - ok;
        setStatus(t("{made} created, {remaining} left…", { made, remaining: body.remaining ?? 0 }));
        // Stop when finished, or when a whole batch failed (broken image links).
        if (!body.remaining || ok === 0) break;
      }
      setStatus(
        failed
          ? t("{made} thumbnails created. {failed} images could not be read.", { made, failed })
          : t("{made} thumbnails created. All artworks have thumbnails.", { made }),
      );
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="mb-6 flex flex-wrap items-center gap-4 text-sm">
      <button type="button" onClick={run} disabled={running} className="border border-primary/20 px-4 py-2 disabled:opacity-40">
        {running ? t("Generating…") : t("Generate missing thumbnails")}
      </button>
      {status && <span className="text-on-surface-variant">{status}</span>}
    </div>
  );
}
