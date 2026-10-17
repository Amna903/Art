"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useLanguage, useRouter } from "@/lib/i18n";
import { LOCALE_NATIVE_NAMES } from "@/lib/i18n/config";
import { savePageBlock } from "@/lib/data/page-block-save";
import { pingRevalidate } from "@/lib/utils/revalidate";
import { F } from "@/components/dashboards/FormField";

export type HeroContent = {
  titleLine1: string;
  titleLine2: string;
  titleColor: "white" | "red";
  subLine1: string;
  subLine2: string;
  ctaLabel: string;
  ctaHref: string;
  imageSrc: string;
  imageAlt: string;
};

export const HERO_DEFAULTS: HeroContent = {
  titleLine1: "UNSEEN.",
  titleLine2: "UNHEARD.",
  titleColor: "white",
  subLine1: "An encounter with art.",
  subLine2: "An introduction to a life.",
  ctaLabel: "Discover the artists",
  ctaHref: "/artists",
  imageSrc: "/images/hero-unseen.jpg",
  imageAlt: "Close-up portrait of a face layered with red, ochre and ivory impasto paint.",
};

/** Fields saved per language; everything else is shared by all languages
 * (the title stays English everywhere, links and the image are the same). */
const PER_LANGUAGE: (keyof HeroContent)[] = ["subLine1", "subLine2", "ctaLabel"];

const blockKey = (field: keyof HeroContent) =>
  `hero_v2_${field.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)}`;

export function HeroEditor({ initial, onClose }: { initial: HeroContent; onClose: () => void }) {
  const { t, language } = useLanguage();
  const router = useRouter();
  // Translatable fields open showing what the page shows in this language.
  const [draft, setDraft] = useState<HeroContent>(() => ({
    ...initial,
    subLine1: t(initial.subLine1),
    subLine2: t(initial.subLine2),
    ctaLabel: t(initial.ctaLabel),
  }));
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof HeroContent>(key: K, value: HeroContent[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const save = async () => {
    setSaving(true);
    const textFields: (keyof HeroContent)[] = [
      "titleLine1",
      "titleLine2",
      "titleColor",
      "subLine1",
      "subLine2",
      "ctaLabel",
      "ctaHref",
    ];
    const results = await Promise.all([
      ...textFields
        .filter((field) => draft[field] !== (PER_LANGUAGE.includes(field) ? t(initial[field]) : initial[field]))
        .map((field) =>
          savePageBlock({
            page: "home",
            blockKey: blockKey(field),
            lang: PER_LANGUAGE.includes(field) ? language : "en",
            value: draft[field].trim(),
            englishFallback: { value: HERO_DEFAULTS[field] },
          }),
        ),
    ]);
    const failed = results.find((r) => r && "error" in r && r.error);
    setSaving(false);
    if (failed && failed.error) {
      toast.error(t(failed.error.message));
      return;
    }
    await pingRevalidate("page-blocks", { page: "home" });
    toast.success(t("Hero saved."));
    onClose();
    router.refresh();
  };

  const languageNote =
    language === "en" ? null : t("Subtitle, button text and image description are saved for {language} only.", {
      language: LOCALE_NATIVE_NAMES[language],
    });

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-auto bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto bg-background p-8 text-on-surface">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-display text-2xl text-primary">{t("Edit hero")}</h3>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="text-on-surface-variant">
            ✕
          </button>
        </div>

        {languageNote && <p className="mb-5 text-xs text-on-surface-variant">{languageNote}</p>}

        <div className="grid gap-5 sm:grid-cols-2">
          <F label={t("Title — line 1")} value={draft.titleLine1} onChange={(v) => set("titleLine1", v)} />
          <F label={t("Title — line 2")} value={draft.titleLine2} onChange={(v) => set("titleLine2", v)} />
          <label className="block sm:col-span-2">
            <span className="mb-2 block font-label-caps text-label-caps uppercase text-on-surface-variant">
              {t("Title colour")}
            </span>
            <select
              value={draft.titleColor}
              onChange={(e) => set("titleColor", e.target.value === "red" ? "red" : "white")}
              className="w-full border-b border-primary/30 bg-transparent py-2 text-primary"
            >
              <option value="white">{t("Charcoal (light mode) / white (dark mode)")}</option>
              <option value="red">{t("Poster red")}</option>
            </select>
          </label>
          <F label={t("Subtitle — line 1")} value={draft.subLine1} onChange={(v) => set("subLine1", v)} />
          <F label={t("Subtitle — line 2")} value={draft.subLine2} onChange={(v) => set("subLine2", v)} />
          <F label={t("Button text")} value={draft.ctaLabel} onChange={(v) => set("ctaLabel", v)} />
          <F label={t("Button link")} value={draft.ctaHref} onChange={(v) => set("ctaHref", v)} />

          <p className="sm:col-span-2 text-sm text-on-surface-variant">
            {t("The image is changed in Dashboard → Hero images, with separate desktop and mobile versions.")}
          </p>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary px-5 py-2 text-xs uppercase tracking-[0.2em]">
            {t("Cancel")}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="btn-primary px-5 py-2 text-xs uppercase tracking-[0.2em] disabled:opacity-50"
          >
            {saving ? t("Saving…") : t("Save")}
          </button>
        </div>
      </div>
    </div>
  );
}
