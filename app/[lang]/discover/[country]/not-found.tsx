"use client";

import Link from "@/components/i18n/Link";
import { useLanguage } from "@/lib/i18n";

export default function CountryNotFound() {
  const { t } = useLanguage();
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-6 text-center">
      <div>
        <p className="font-label-caps tracking-widest text-secondary mb-3">{t("COUNTRY NOT FOUND")}</p>
        <h1 className="font-display-lg text-4xl mb-6">{t("This country isn’t on the atlas.")}</h1>
        <Link
          href="/#atlas"
          className="border border-primary px-6 py-3 font-label-caps tracking-widest hover:bg-primary hover:text-beige transition-colors"
        >
          {t("RETURN TO MAP")}
        </Link>
      </div>
    </main>
  );
}
