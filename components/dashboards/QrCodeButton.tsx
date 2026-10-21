"use client";

import QRCode from "qrcode";
import { useLanguage } from "@/lib/i18n";
import { slugify } from "@/lib/utils/slugify";

/** Printed codes always point at the live domain, whichever environment the admin is using. */
export const QR_BASE_URL = "https://nua-arte.com/q/";

async function download(id: string, name: string, format: "png" | "svg") {
  const url = `${QR_BASE_URL}${id}`;
  // High error correction ("H") so a scuffed or partly covered label still scans.
  const options = { errorCorrectionLevel: "H" as const, margin: 2 };
  const href =
    format === "png"
      ? await QRCode.toDataURL(url, { ...options, width: 1200 })
      : URL.createObjectURL(new Blob([await QRCode.toString(url, { ...options, type: "svg" })], { type: "image/svg+xml" }));
  const a = document.createElement("a");
  a.href = href;
  a.download = `nua-arte-qr-${slugify(name) || id}.${format}`;
  a.click();
  if (format === "svg") setTimeout(() => URL.revokeObjectURL(href), 1000);
}

/** Download links for a print-ready QR code that opens nua-arte.com/q/<id>. */
export function QrCodeButton({ id, name, label }: { id: string; name: string; label?: string }) {
  const { t } = useLanguage();
  const cls = "text-[10px] uppercase tracking-widest border border-primary/20 px-2 py-1 hover:border-secondary hover:text-secondary";
  return (
    <span className="inline-flex gap-1 items-center" title={`${QR_BASE_URL}${id}`}>
      <button type="button" className={cls} onClick={() => download(id, name, "png")}>
        {label ?? t("QR")} PNG
      </button>
      <button type="button" className={cls} onClick={() => download(id, name, "svg")}>
        SVG
      </button>
    </span>
  );
}
