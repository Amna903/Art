"use client";

import QRCode from "qrcode";
import { useLanguage } from "@/lib/i18n";
import { slugify } from "@/lib/utils/slugify";

/** QR downloads are built but hidden until the client launches them — set to true to show the buttons. */
export const QR_CODES_ENABLED = true;

/**
 * Printed codes always point at the live domain, whichever environment the
 * admin is using. Set NEXT_PUBLIC_QR_BASE_URL (e.g. "https://www.example.com")
 * if the site is served from another address; codes already printed keep the
 * address they were made with.
 */
export const QR_BASE_URL = `${(process.env.NEXT_PUBLIC_QR_BASE_URL?.trim() || "https://www.nua-arte.com").replace(/\/+$/, "").replace(/\/q$/, "")}/q/`;

async function download(id: string, name: string, format: "png" | "svg") {
  const url = `${QR_BASE_URL}${id}`;
  // Medium error correction ("M"): still recovers ~15% damage, but the code
  // needs 37 squares across instead of 45 at "H", so each square prints
  // larger and phones read small labels far more reliably. margin: 4 is the
  // white border (quiet zone) the QR standard requires; scanners often fail
  // to find a code with less, especially on a coloured label or wall.
  const options = { errorCorrectionLevel: "M" as const, margin: 4 };
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

/** Download links for a print-ready QR code that opens www.nua-arte.com/q/<id>. */
export function QrCodeButton({ id, name, label }: { id: string; name: string; label?: string }) {
  const { t } = useLanguage();
  if (!QR_CODES_ENABLED) return null;
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
