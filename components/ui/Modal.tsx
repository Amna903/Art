"use client";

import { useEffect, type ReactNode } from "react";
import { useLanguage } from "@/lib/i18n";

/**
 * Shared editor/admin popup: dimmed backdrop, centred panel, title row with a
 * close (✕) button. Escape closes it. Defaults reproduce the look the editor
 * modals already had; pass the class props to adjust size, layering or the
 * title type for a specific popup.
 */
export function Modal({
  title,
  onClose,
  children,
  overlayClassName = "z-50 overflow-auto",
  panelClassName = "max-w-2xl max-h-[90vh] overflow-auto",
  headerClassName = "mb-6",
  titleClassName = "font-display-sm text-display-sm",
}: {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  overlayClassName?: string;
  panelClassName?: string;
  headerClassName?: string;
  titleClassName?: string;
}) {
  const { t } = useLanguage();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={`fixed inset-0 bg-black/60 flex items-center justify-center p-4 ${overlayClassName}`}>
      <div role="dialog" aria-modal="true" className={`bg-background w-full p-8 ${panelClassName}`}>
        <div className={`flex items-center justify-between ${headerClassName}`}>
          <h3 className={`text-primary ${titleClassName}`}>{title}</h3>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="text-on-surface-variant">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
