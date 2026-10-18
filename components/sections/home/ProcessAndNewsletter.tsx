"use client";

import { useLanguage } from "@/lib/i18n";

const STEPS = [
  { n: "01", title: "Discover", body: "Browse a curated selection of contemporary artists from Angola and the Congo." },
  { n: "02", title: "Save", body: "Follow your favorite artists and build a digital portfolio of works that resonate with you." },
  { n: "03", title: "Collect", body: "Ask us about the piece that draws you in. We can help you understand its materials, dimensions and presentation." },
  { n: "04", title: "Support", body: "NUA-ARTE purchases selected works directly from artists, paying them at acquisition. When a work is sold, its creator also receives an additional commission." },
];

export function ProcessSteps() {
  const { t } = useLanguage();

  return (
    <section className="py-section-gap px-gutter-page bg-surface-container-highest">
      <div className="max-w-container-max mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {STEPS.map((step) => (
            <div key={step.n} className="space-y-6">
              <div className="w-12 h-12 flex items-center justify-center bg-primary text-on-primary font-bold">
                {step.n}
              </div>
              {/* Keyed with the step number so "Save"/"Support" get the step
                  meaning, not the button / help-desk translation. */}
              <h3 className="font-headline-sm text-headline-sm">
                {t(`${step.n} ${step.title}`).replace(/^\d+\s+/, "")}
              </h3>
              <p className="text-on-surface-variant">{t(step.body)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Newsletter() {
  const { t } = useLanguage();

  return (
    <section className="py-section-gap px-gutter-page">
      <div className="max-w-3xl mx-auto text-center">
        <div className="mb-12">
          <h2 className="font-headline-md text-headline-md">{t("Stay connected")}</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-[1.6] text-on-surface-variant">
            {t("Let the discovery continue. Receive artists’ stories, new collection arrivals and invitations to experience NUA-ARTE in person.")}
          </p>
        </div>
        <form className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-grow w-full">
            <label htmlFor="newsletter-email" className="font-label-caps text-left block mb-2">
              {t("EMAIL ADDRESS")}
            </label>
            <input
              id="newsletter-email"
              className="w-full bg-transparent border-0 border-b border-primary p-4 focus:ring-0 focus:border-secondary transition-all outline-none"
              placeholder={t("Your email address")}
              type="email"
            />
          </div>
          <button className="bg-primary text-on-primary px-12 py-4 font-navigation text-navigation uppercase tracking-widest hover:bg-secondary transition-colors w-full md:w-auto">
            {t("Keep me connected")}
          </button>
        </form>
      </div>
    </section>
  );
}
