"use client";

import { Modal } from "@/components/ui/Modal";
import { buttonClass } from "@/components/ui/Button";
import { useState } from "react";
import { toast } from "sonner";
import { useLanguage, useRouter } from "@/lib/i18n";
import { LOCALE_NATIVE_NAMES } from "@/lib/i18n/config";
import { savePageBlock } from "@/lib/data/page-block-save";
import { pingRevalidate } from "@/lib/utils/revalidate";
import { F } from "@/components/dashboards/FormField";

type RoomTitles = Record<1 | 2 | 3 | 4, string>;
const ROOMS = [1, 2, 3, 4] as const;

/**
 * Admin editor for the four room titles (the brief's `room_title` field),
 * stored as page_blocks "room_title_1"…"room_title_4" on page
 * "virtual-gallery". Saved in the language of the page being edited.
 */
export function RoomTitlesEditor({ initial, onClose }: { initial: RoomTitles; onClose: () => void }) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [draft, setDraft] = useState<RoomTitles>(initial);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const results = await Promise.all(
      ROOMS.filter((n) => draft[n].trim() !== initial[n]).map((n) =>
        savePageBlock({
          page: "virtual-gallery",
          blockKey: `room_title_${n}`,
          lang: language,
          value: draft[n].trim(),
          englishFallback: { value: "" },
        }),
      ),
    );
    setSaving(false);
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      toast.error(t(failed.error.message));
      return;
    }
    await pingRevalidate("page-blocks", { page: "virtual-gallery" });
    toast.success(t("Room titles saved."));
    onClose();
    router.refresh();
  };

  return (
    <Modal title={t("Edit room titles")} onClose={onClose} overlayClassName="z-[70]" panelClassName="max-w-lg text-on-surface" headerClassName="mb-2" titleClassName="font-display text-2xl">
        <p className="mb-6 text-sm text-on-surface-variant">
          {language === "en"
            ? t("Shown above each artwork in the tour. Leave a title empty to show “Room 1”, “Room 2”…")
            : t("Saved for {language} only.", { language: LOCALE_NATIVE_NAMES[language] })}
        </p>
        <div className="space-y-5">
          {ROOMS.map((n) => (
            <F
              key={n}
              label={t("Room {n}", { n })}
              value={draft[n]}
              onChange={(v) => setDraft((d) => ({ ...d, [n]: v }))}
 />
          ))}
        </div>
        <div className="mt-8 flex justify-end gap-3">
          <button type="button" onClick={onClose} className={buttonClass({variant: "secondary",size: "sm"})}>
            {t("Cancel")}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className={buttonClass({variant: "accent",size: "sm"})}
          >
            {saving ? t("Saving…") : t("Save")}
          </button>
        </div>
    </Modal>
  );
}
