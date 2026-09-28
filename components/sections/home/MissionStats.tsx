"use client";

import { useLanguage } from "@/lib/i18n";

const STATS = [
  { value: "480+", label: "Artists Discovered" },
  { value: "1.2M", label: "Artist Revenue (USD)" },
  { value: "24", label: "Nations Represented" },
  { value: "12k", label: "Monthly Circle Members" },
];

export function MissionStats() {
  const { t } = useLanguage();

  return (
    <section className="py-section-gap px-gutter-page">
      <div className="max-w-container-max mx-auto grid grid-cols-1 md:grid-cols-3 gap-24 items-center">
        <div className="col-span-1">
          <span className="font-label-caps text-secondary block mb-4">— {t("OUR MISSION IN DATA", "NOTRE MISSION EN CHIFFRES")}</span>
          <h2 className="font-headline-md text-headline-md leading-tight">{t("Quantifying Global Visibility", "Mesurer la Visibilité Mondiale")}</h2>
        </div>
        <div className="col-span-2 grid grid-cols-2 gap-8 md:gap-12">
          {STATS.map((stat) => (
            <div key={stat.label} className="border-l border-primary/10 pl-6 md:pl-8">
              <span
                className="font-display block mb-2"
                style={{ fontSize: "clamp(32px, 4vw, 48px)", lineHeight: 1.1 }}
              >
                {stat.value}
              </span>
              <p className="font-navigation text-navigation uppercase text-on-surface-variant">{t(stat.label)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
