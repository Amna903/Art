"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { LOCALE_LABELS, LOCALE_NATIVE_NAMES, type Language } from "@/lib/i18n/config";
import { asTranslations, withTranslation, type ContentTranslations } from "@/lib/i18n/content";
import type { Json } from "@/lib/supabase/types";
import { F } from "./FormField";

type TranslatedLanguage = Exclude<Language, "en">;
const TRANSLATED: TranslatedLanguage[] = ["fr", "pt", "es", "it"];

export type TranslatableField = { name: string; label: string; textarea?: boolean };

/**
 * Per-language versions of a row's text fields, stored in its `translations`
 * column. The regular form fields above it stay the English original; a blank
 * translation falls back to English on the public site.
 */
export function TranslationFields({
  fields,
  value,
  onChange,
}: {
  fields: TranslatableField[];
  value: Json | ContentTranslations | null | undefined;
  onChange: (next: ContentTranslations) => void;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<TranslatedLanguage>("fr");
  const translations = asTranslations(value as Json);
  const current = translations[lang] ?? {};

  const filled = (l: TranslatedLanguage) =>
    fields.filter((f) => translations[l]?.[f.name]?.trim()).length;

  const setField = (name: string, v: string) => {
    const fieldsForLang = Object.fromEntries(fields.map((f) => [f.name, current[f.name] ?? ""]));
    onChange(withTranslation(translations, lang, { ...fieldsForLang, [name]: v }));
  };

  return (
    <div className="col-span-full border border-primary/15">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3 font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant hover:text-secondary"
      >
        <span>
          {t("Translations")}
          <span className="ml-3 normal-case tracking-normal opacity-70">
            {TRANSLATED.map((l) => `${LOCALE_LABELS[l]} ${filled(l)}/${fields.length}`).join(" · ")}
          </span>
        </span>
        <span className="material-symbols-outlined text-base" aria-hidden="true">
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          <p className="text-xs text-on-surface-variant">
            {t("The fields above are the English original. Leave a translation blank to show English in that language.")}
          </p>
          <div role="tablist" aria-label={t("Language")} className="flex gap-1 border-b border-primary/15">
            {TRANSLATED.map((l) => (
              <button
                key={l}
                type="button"
                role="tab"
                aria-selected={l === lang}
                onClick={() => setLang(l)}
                className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 -mb-px ${
                  l === lang ? "border-secondary text-secondary" : "border-transparent text-on-surface-variant hover:text-primary"
                }`}
              >
                {LOCALE_LABELS[l]}
              </button>
            ))}
          </div>
          <div className="grid gap-4" lang={lang}>
            {fields.map((f) => (
              <F
                key={`${lang}-${f.name}`}
                label={`${t(f.label)} — ${LOCALE_NATIVE_NAMES[lang]}`}
                value={current[f.name] ?? ""}
                onChange={(v) => setField(f.name, v)}
                textarea={f.textarea}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
