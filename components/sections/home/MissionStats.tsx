"use client";

import { useLanguage } from "@/lib/i18n";

const STATS = [
  { value: "4k+", label: "Works Brought to Light" },
  { value: "1,000+", label: "Artists Featured" },
  { value: "54", label: "Countries Represented" },
  { value: "10k+", label: "Artist Stories Read" },
];

export function MissionStats() {
  const { t } = useLanguage();

  return (
    <section className="px-gutter-page py-section-gap">
      <div className="mx-auto grid max-w-container-max grid-cols-1 gap-8 bg-[#F2EFE9] px-5 py-7 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-12 lg:px-10 lg:py-8">
        <div>
          <span className="mb-3 block font-label-caps text-[8px] tracking-[0.24em] text-secondary">
            — {t("OUR MISSION IN DATA", "NOTRE MISSION EN CHIFFRES")}
          </span>
          <h2 className="max-w-[15ch] font-display text-[clamp(1.25rem,2vw,1.75rem)] font-normal leading-[1.1]">
            {t("Quantifying Global Visibility", "Mesurer la Visibilité Mondiale")}
          </h2>
          <p className="mt-2 text-[10px] leading-snug text-on-surface-variant">
            {t("The Visibility We Are Building")}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:gap-x-8">
          {STATS.map((stat) => (
            <div key={stat.label} className="min-w-0 border-l border-primary/10 pl-3 sm:pl-4">
              <span className="mb-1 block font-display text-[clamp(1.35rem,3vw,2rem)] leading-none">
                {stat.value}
              </span>
              <p className="text-[8px] uppercase leading-tight tracking-[0.12em] text-on-surface-variant sm:text-[9px]">
                {t(stat.label)}
              </p>
            </div>
          ))}
          <svg aria-hidden="true" className="col-span-2 h-3 w-full" viewBox="0 0 360 12" preserveAspectRatio="none">
            <path d="M2 8 C88 3 140 11 220 6 S320 8 358 4" fill="none" stroke="#9F0D12" strokeWidth="1.2" strokeLinecap="round" opacity="0.65" />
          </svg>
        </div>

      </div>
    </section>
  );
}
