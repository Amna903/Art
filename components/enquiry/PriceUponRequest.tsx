"use client";

import { useLanguage } from "@/lib/i18n";

export function PriceUponRequest({ className = "" }: { className?: string }) {
  const { t } = useLanguage();
  return (
    <span className={`inline-flex items-center gap-1.5 text-secondary ${className}`}>
      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
        lock
      </span>
      {t("Price Upon Request")}
    </span>
  );
}
