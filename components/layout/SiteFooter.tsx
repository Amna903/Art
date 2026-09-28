"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n";

export function SiteFooter() {
  const { t } = useLanguage();

  return (
    <footer className="bg-inverse-surface text-inverse-on-surface mt-section-gap relative">
      <div className="max-w-container-max mx-auto px-gutter-page py-20 grid grid-cols-1 md:grid-cols-4 gap-14">
        <div className="md:col-span-2 max-w-md">
          <h3 className="font-display text-2xl md:text-[28px] mb-3 leading-tight">
            {t("Stay in")} <span className="italic">{t("the circle.")}</span>
          </h3>
          <p className="text-[13px] leading-relaxed opacity-70 mb-7">
            {t("Editorials, new artist drops, and private viewing invites — delivered with intention.")}
          </p>
          <form className="flex">
            <input
              type="email"
              placeholder={t("Your email address")}
              className="bg-transparent flex-1 py-3 outline-none text-sm placeholder:text-inverse-on-surface/50"
            />
            <button
              type="button"
              className="material-symbols-outlined w-11 h-11 flex items-center justify-center shrink-0 hover:text-secondary-fixed-dim transition-colors"
              aria-label={t("Subscribe")}
              style={{ fontSize: "20px" }}
            >
              arrow_forward
            </button>
          </form>
        </div>

        <div>
          <p className="font-label-caps text-label-caps uppercase mb-5 opacity-50">{t("Explore")}</p>
          <ul className="space-y-2.5 text-[13px]">
            <li>
              <Link href="/#atlas" className="opacity-85 hover:opacity-100 hover:text-secondary-fixed-dim">
                {t("Discover")}
              </Link>
            </li>
            <li>
              <Link href="/artists" className="opacity-85 hover:opacity-100 hover:text-secondary-fixed-dim">
                {t("Artists")}
              </Link>
            </li>
            <li>
              <Link href="/collections" className="opacity-85 hover:opacity-100 hover:text-secondary-fixed-dim">
                {t("Collections")}
              </Link>
            </li>
            <li>
              <Link href="/exhibitions" className="opacity-85 hover:opacity-100 hover:text-secondary-fixed-dim">
                {t("Exhibitions")}
              </Link>
            </li>
            <li>
              <Link href="/virtual-gallery" className="opacity-85 hover:opacity-100 hover:text-secondary-fixed-dim">
                {t("Virtual Gallery")}
              </Link>
            </li>
            <li>
              <Link href="/journal" className="opacity-85 hover:opacity-100 hover:text-secondary-fixed-dim">
                {t("Journal")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="font-label-caps text-label-caps uppercase mb-5 opacity-50">{t("Circle")}</p>
          <ul className="space-y-2.5 text-[13px]">
            <li>
              <Link href="/account" className="opacity-85 hover:opacity-100 hover:text-secondary-fixed-dim">
                {t("My Collection")}
              </Link>
            </li>
            <li>
              <Link href="/account" className="opacity-85 hover:opacity-100 hover:text-secondary-fixed-dim">
                {t("Saved & Enquiries")}
              </Link>
            </li>
            <li>
              <Link href="/about" className="opacity-85 hover:opacity-100 hover:text-secondary-fixed-dim">
                {t("About")}
              </Link>
            </li>
            <li>
              <Link href="/faq" className="opacity-85 hover:opacity-100 hover:text-secondary-fixed-dim">
                {t("FAQ")}
              </Link>
            </li>
            <li>
              <a href="#" className="opacity-85 hover:opacity-100 hover:text-secondary-fixed-dim">
                {t("Press")}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div>
        <div className="max-w-container-max mx-auto px-gutter-page py-6 flex flex-col md:flex-row gap-2 md:gap-6 justify-between text-[10.5px] uppercase tracking-[0.22em] opacity-55">
          <span>© {new Date().getFullYear()} NUA-ARTE Collective</span>
          <span>{t("Lagos · Dakar · Johannesburg · Lisboa")}</span>
        </div>
      </div>
    </footer>
  );
}
