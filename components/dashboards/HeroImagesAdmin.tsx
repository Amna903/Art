"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";
import { compressImage } from "@/lib/utils/compress-image";
import { pingRevalidate } from "@/lib/utils/revalidate";
import { AFRICAN_COUNTRIES, getCountryDisplayName } from "@/lib/data/africa";

type HeroRow = {
  id: string;
  page: string;
  image_desktop: string;
  image_mobile: string | null;
  alt_text: string;
  credit: string | null;
  focal_point: string;
  active: boolean;
  updated_at: string;
};

const PAGES = [
  { key: "home", label: "Homepage" },
  { key: "virtual-gallery", label: "Virtual gallery" },
  { key: "exhibitions", label: "Exhibitions" },
  { key: "about", label: "About" },
] as const;

// Change brief §7: desktop 2400 × 1350 (16:9) ≤ 400 KB, mobile 1080 × 1350 (4:5) ≤ 250 KB.
const DESKTOP = { maxWidth: 2400, maxHeight: 1350, maxBytes: 400 * 1024 };
const MOBILE = { maxWidth: 1080, maxHeight: 1350, maxBytes: 250 * 1024 };

async function uploadHero(file: File, page: string, kind: "desktop" | "mobile") {
  const compressed = await compressImage(file, kind === "desktop" ? DESKTOP : MOBILE);
  const path = `${page.replace(":", "-")}/${Date.now()}-${kind}.webp`;
  const { error } = await supabase.storage.from("heroes").upload(path, compressed, { contentType: "image/webp" });
  if (error) throw error;
  return supabase.storage.from("heroes").getPublicUrl(path).data.publicUrl;
}

/** Desktop + 4:5 mobile preview; clicking the desktop preview sets the focal point. */
function Preview({
  desktop,
  mobile,
  focal,
  onFocal,
}: {
  desktop: string;
  mobile: string | null;
  focal: string;
  onFocal?: (focal: string) => void;
}) {
  const { t } = useLanguage();
  const [fx, fy] = focal.split(" ");
  return (
    <div className="flex items-end gap-4">
      <div>
        <span className="mb-1 block text-[10px] uppercase tracking-widest text-on-surface-variant">{t("Desktop")}</span>
        <button
          type="button"
          disabled={!onFocal}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            onFocal?.(`${Math.round(((e.clientX - r.left) / r.width) * 100)}% ${Math.round(((e.clientY - r.top) / r.height) * 100)}%`);
          }}
          className="relative block aspect-video w-64 overflow-hidden bg-surface-container"
          title={onFocal ? t("Click to set the focal point") : undefined}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={desktop} alt="" className="h-full w-full object-cover" />
          {onFocal && (
            <span
              className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
              style={{ left: fx, top: fy, background: "var(--nua-red)" }}
              aria-hidden="true"
            />
          )}
        </button>
      </div>
      <div>
        <span className="mb-1 block text-[10px] uppercase tracking-widest text-on-surface-variant">{t("Mobile")}</span>
        <div className="aspect-[4/5] w-28 overflow-hidden bg-surface-container">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mobile ?? desktop} alt="" className="h-full w-full object-cover" style={{ objectPosition: mobile ? undefined : focal }} />
        </div>
      </div>
    </div>
  );
}

/**
 * "Hero images" (change brief §7): upload, preview desktop + mobile, choose
 * the active image per page, alt text and credit. Live within a minute, no
 * deploy. Country pages fall back to the homepage hero when they have none.
 */
export function HeroImagesAdmin() {
  const { t, language } = useLanguage();
  const [page, setPage] = useState("home");
  const [rows, setRows] = useState<HeroRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [credit, setCredit] = useState("");
  const [focal, setFocal] = useState("50% 50%");
  const desktopPreview = useMemo(() => (desktopFile ? URL.createObjectURL(desktopFile) : null), [desktopFile]);
  const mobilePreview = useMemo(() => (mobileFile ? URL.createObjectURL(mobileFile) : null), [mobileFile]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("site_heroes")
      .select("id, page, image_desktop, image_mobile, alt_text, credit, focal_point, active, updated_at")
      .eq("page", page)
      .order("created_at", { ascending: false });
    if (error) toast.error(t(error.message));
    setRows((data ?? []) as HeroRow[]);
    setLoading(false);
  }, [page, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => () => void (desktopPreview && URL.revokeObjectURL(desktopPreview)), [desktopPreview]);
  useEffect(() => () => void (mobilePreview && URL.revokeObjectURL(mobilePreview)), [mobilePreview]);

  const done = async () => {
    await pingRevalidate("site-heroes");
    void load();
  };

  const activate = async (id: string) => {
    // One active hero per page (unique index): switch the old one off first.
    await supabase.from("site_heroes").update({ active: false }).eq("page", page).eq("active", true);
    const { error } = await supabase.from("site_heroes").update({ active: true }).eq("id", id);
    if (error) toast.error(t(error.message));
    else toast.success(t("Hero is live. It can take up to a minute to appear."));
    await done();
  };

  const deactivate = async (id: string) => {
    const { error } = await supabase.from("site_heroes").update({ active: false }).eq("id", id);
    if (error) toast.error(t(error.message));
    await done();
  };

  const save = async (makeActive: boolean) => {
    if (!desktopFile || !alt.trim()) return;
    setBusy(true);
    try {
      const imageDesktop = await uploadHero(desktopFile, page, "desktop");
      const imageMobile = mobileFile ? await uploadHero(mobileFile, page, "mobile") : null;
      const { data, error } = await supabase
        .from("site_heroes")
        .insert({
          page,
          image_desktop: imageDesktop,
          image_mobile: imageMobile,
          alt_text: alt.trim(),
          credit: credit.trim() || null,
          focal_point: focal,
        })
        .select("id")
        .single();
      if (error) throw error;
      setDesktopFile(null);
      setMobileFile(null);
      setAlt("");
      setCredit("");
      setFocal("50% 50%");
      if (makeActive && data) await activate(data.id);
      else {
        toast.success(t("Hero image saved."));
        await done();
      }
    } catch (err) {
      toast.error(t(err instanceof Error ? err.message : "Upload failed."));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: HeroRow) => {
    if (!confirm(t("Delete this hero image?"))) return;
    const paths = [row.image_desktop, row.image_mobile]
      .filter((u): u is string => !!u)
      .map((u) => u.split("/storage/v1/object/public/heroes/")[1])
      .filter(Boolean);
    if (paths.length) await supabase.storage.from("heroes").remove(paths);
    const { error } = await supabase.from("site_heroes").delete().eq("id", row.id);
    if (error) toast.error(t(error.message));
    await done();
  };

  const field = "w-full border-b border-primary/30 bg-transparent py-2 text-primary";
  const label = "mb-2 block font-label-caps text-label-caps uppercase text-on-surface-variant";

  return (
    <section className="mt-10 space-y-10">
      <div>
        <h2 className="font-headline-sm text-headline-sm text-primary">{t("Hero images")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">
          {t("Use a detail from a real collection artwork: no AI-generated or stock images. Images are resized automatically (desktop 2400 × 1350 under 400 KB, mobile 1080 × 1350 under 250 KB).")}
        </p>
      </div>

      <label className="block max-w-sm">
        <span className={label}>{t("Page")}</span>
        <select value={page} onChange={(e) => setPage(e.target.value)} className={field}>
          {PAGES.map((p) => (
            <option key={p.key} value={p.key}>
              {t(p.label)}
            </option>
          ))}
          <optgroup label={t("Country pages")}>
            {AFRICAN_COUNTRIES.map((c) => (
              <option key={c.slug} value={`country:${c.slug}`}>
                {getCountryDisplayName(c, language)}
              </option>
            ))}
          </optgroup>
        </select>
      </label>

      <div className="space-y-6 border border-primary/10 p-6">
        <h3 className="text-sm uppercase tracking-[0.2em] text-primary">{t("New hero image")}</h3>
        <div className="grid gap-6 sm:grid-cols-2">
          <label className="block">
            <span className={label}>{t("Desktop image (16:9)")}</span>
            <input type="file" accept="image/*" onChange={(e) => setDesktopFile(e.target.files?.[0] ?? null)} className="text-sm" />
          </label>
          <label className="block">
            <span className={label}>{t("Mobile image (4:5, optional)")}</span>
            <input type="file" accept="image/*" onChange={(e) => setMobileFile(e.target.files?.[0] ?? null)} className="text-sm" />
          </label>
          <label className="block">
            <span className={label}>{t("Image description (alt text)")}</span>
            <input value={alt} onChange={(e) => setAlt(e.target.value)} className={field} />
          </label>
          <label className="block">
            <span className={label}>{t("Credit: artwork title — artist")}</span>
            <input value={credit} onChange={(e) => setCredit(e.target.value)} placeholder="Kianda — Benvindo Yala" className={field} />
          </label>
        </div>
        {desktopPreview && (
          <div>
            <Preview desktop={desktopPreview} mobile={mobilePreview} focal={focal} onFocal={setFocal} />
            {!mobilePreview && (
              <p className="mt-2 text-xs text-on-surface-variant">{t("No mobile image: phones show the desktop image cropped around the red dot. Click the desktop preview to move it.")}</p>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => save(true)} disabled={!desktopFile || !alt.trim() || busy} className="btn-primary px-5 py-2.5 text-xs uppercase tracking-[0.2em] disabled:opacity-50">
            {busy ? t("Uploading…") : t("Save and make live")}
          </button>
          <button type="button" onClick={() => save(false)} disabled={!desktopFile || !alt.trim() || busy} className="btn-secondary px-5 py-2.5 text-xs uppercase tracking-[0.2em] disabled:opacity-50">
            {t("Save without publishing")}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-on-surface-variant">{t("Loading…")}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-on-surface-variant">
          {page.startsWith("country:")
            ? t("No hero for this page yet: it shows the homepage hero.")
            : t("No hero for this page yet: it shows its built-in image.")}
        </p>
      ) : (
        <ul className="space-y-6">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-end gap-6 border-b border-primary/10 pb-6">
              <Preview desktop={row.image_desktop} mobile={row.image_mobile} focal={row.focal_point} />
              <div className="min-w-[200px] flex-1 space-y-1 text-sm">
                {row.active && <span className="inline-block bg-[var(--nua-charcoal)] px-2 py-0.5 text-[10px] uppercase tracking-widest text-[var(--nua-white)]">{t("Live")}</span>}
                <p className="text-primary">{row.alt_text}</p>
                {row.credit && <p className="text-on-surface-variant">{t("Artwork: {credit}", { credit: row.credit })}</p>}
              </div>
              <div className="flex gap-4 text-xs uppercase tracking-widest">
                {row.active ? (
                  <button type="button" onClick={() => deactivate(row.id)} className="text-on-surface-variant">
                    {t("Take offline")}
                  </button>
                ) : (
                  <button type="button" onClick={() => activate(row.id)} className="text-secondary">
                    {t("Make live")}
                  </button>
                )}
                <button type="button" onClick={() => remove(row)} className="text-secondary">
                  {t("Delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
