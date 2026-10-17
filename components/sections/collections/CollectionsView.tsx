"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "@/components/i18n/Link";
import Image from "next/image";
import { PriceUponRequest } from "@/components/enquiry/PriceUponRequest";
import { COLLECTIONS, type Collection } from "@/lib/data/collections";
import type { SupabaseCollection } from "@/lib/data/supabase-collections";
import { useLanguage } from "@/lib/i18n";
import { getCountryBySlug, getCountryDisplayName, normalizeCountrySlug } from "@/lib/data/africa";

type ViewMode = "grid" | "list";
type MenuKey = "country" | "medium" | null;

function fromSupabase(c: SupabaseCollection): Collection {
  return {
    slug: c.slug,
    title: c.title,
    description: c.description ?? "",
    image: c.coverImageUrl,
    imageAlt: c.title,
    country: "",
    medium: "",
    artists: c.artworkCount === 1 ? "1 artwork" : `${c.artworkCount} artworks`,
  };
}

export function CollectionsView({ initialItems = [] }: { initialItems?: SupabaseCollection[] }) {
  const { t, language } = useLanguage();
  // Oldest real collection takes slot 0, so a slot never jumps once filled —
  // the rest stay static until replaced by admin-created collections.
  // Real collections arrive already in this language; the built-in demo
  // collections are site copy and go through the dictionary. Filters below
  // work on these display values.
  const allItems = useMemo(
    () =>
      // Real collections only (change brief §6); the sample collections are
      // shown in local development until a real one exists.
      (initialItems.length > 0
        ? initialItems.map(fromSupabase)
        : process.env.NODE_ENV === "development"
          ? COLLECTIONS
          : []
      ).map((c) => {
        const artworkCount = c.artists.match(/^(\d+) artworks?$/);
        return {
          ...c,
          title: t(c.title),
          tag: c.tag && t(c.tag),
          description: t(c.description),
          imageAlt: t(c.imageAlt),
          country:
            c.country && getCountryBySlug(normalizeCountrySlug(c.country))
              ? getCountryDisplayName(c.country, language)
              : c.country && t(c.country),
          medium: c.medium && t(c.medium),
          artists: !artworkCount
            ? t(c.artists)
            : artworkCount[1] === "1"
              ? t("1 artwork")
              : t("{count} artworks", { count: Number(artworkCount[1]) }),
        };
      }),
    [initialItems, t, language],
  );

  const [country, setCountry] = useState("All");
  const [medium, setMedium] = useState("All");
  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const [view, setView] = useState<ViewMode>("grid");
  const filterRef = useRef<HTMLDivElement>(null);

  const countries = useMemo(
    () => ["All", ...Array.from(new Set(allItems.map((c) => c.country).filter(Boolean)))],
    [allItems],
  );
  const mediums = useMemo(
    () => ["All", ...Array.from(new Set(allItems.map((c) => c.medium).filter(Boolean)))],
    [allItems],
  );

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const filtered = useMemo(() => {
    return allItems.filter((c) => {
      if (country !== "All" && c.country !== country) return false;
      if (medium !== "All" && c.medium !== medium) return false;
      return true;
    });
  }, [allItems, country, medium]);

  const resetAll = () => {
    setCountry("All");
    setMedium("All");
    setOpenMenu(null);
  };

  return (
    <main className="max-w-container-max mx-auto px-gutter-page">
      <header className="pt-16 pb-12 md:pt-24">
        <span className="font-label-caps tracking-widest text-secondary">{t("Collections")}</span>
        <h1 className="mt-3 max-w-3xl font-display text-4xl leading-[1.05] md:text-6xl">
          {t("Works brought together through connection")}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-[1.6] text-on-surface">
          {t("Each collection begins with a curatorial encounter: work that holds attention and invites a closer look. Explore the pieces together, then spend time with the individual artists and the worlds they bring to the canvas.")}
        </p>
        <div className="mt-10 max-w-2xl border-l-2 border-[var(--nua-red)] pl-6">
          <h2 className="font-display text-2xl">{t("The first collection")}</h2>
          <p className="mt-3 text-lg leading-[1.6] text-on-surface-variant">
            {t("The first collection began in an art market in Luanda, where Anané chose twenty works for her homes. Learning about their makers brought a new depth to those first encounters. These pieces became the foundation of NUA-ARTE, carrying the feeling that continues to guide its curation.")}
          </p>
        </div>
      </header>

      <section className="mb-12 border-b border-primary/10 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div ref={filterRef} className="flex items-center gap-12">
            <FilterButton
              label={t("Country")}
              value={country}
              open={openMenu === "country"}
              onToggle={() => setOpenMenu(openMenu === "country" ? null : "country")}
              options={countries}
              onSelect={(v) => {
                setCountry(v);
                setOpenMenu(null);
              }}
            />
            <FilterButton
              label={t("Medium")}
              value={medium}
              open={openMenu === "medium"}
              onToggle={() => setOpenMenu(openMenu === "medium" ? null : "medium")}
              options={mediums}
              onSelect={(v) => {
                setMedium(v);
                setOpenMenu(null);
              }}
            />
            {(country !== "All" || medium !== "All") && (
              <button
                onClick={resetAll}
                className="font-label-caps text-label-caps uppercase tracking-widest text-secondary hover:opacity-70 transition-opacity"
              >
                {t("Reset")}
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="font-label-caps text-label-caps uppercase opacity-40">{t("View As:")}</span>
            <button
              aria-label={t("Grid view")}
              onClick={() => setView("grid")}
              className={`material-symbols-outlined w-11 h-11 flex items-center justify-center transition-opacity ${view === "grid" ? "text-primary opacity-100" : "text-on-surface-variant opacity-40 hover:opacity-100"}`}
            >
              grid_view
            </button>
            <button
              aria-label={t("List view")}
              onClick={() => setView("list")}
              className={`material-symbols-outlined w-11 h-11 flex items-center justify-center transition-opacity ${view === "list" ? "text-primary opacity-100" : "text-on-surface-variant opacity-40 hover:opacity-100"}`}
            >
              view_agenda
            </button>
          </div>
        </div>
      </section>

      {filtered.length === 0 ? (
        <section className="py-24 text-center">
          <p className="font-body-lg text-on-surface-variant mb-6">
            {allItems.length === 0 ? t("The first collection is coming soon.") : t("No collections match your filters.")}
          </p>
          <button
            onClick={resetAll}
            className="font-label-caps text-label-caps uppercase tracking-widest text-secondary hover:opacity-70"
          >
            {t("Reset filters")}
          </button>
        </section>
      ) : view === "list" ? (
        <section className="flex flex-col divide-y divide-primary/10 mb-section-gap">
          {filtered.map((c) => (
            <Link
              key={c.slug}
              href={`/collections/${c.slug}`}
              className="group grid grid-cols-1 md:grid-cols-12 gap-8 py-10 cursor-pointer"
            >
              <div className="md:col-span-4 relative overflow-hidden aspect-[4/3]">
                <Image
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-all duration-700"
                  alt={c.imageAlt}
                  src={c.image}
                />
              </div>
              <div className="md:col-span-8 flex flex-col justify-center">
                {c.tag && (
                  <span className="font-label-caps text-label-caps uppercase text-secondary mb-3">
                    {c.tag}
                  </span>
                )}
                <h2 className="font-headline-md text-headline-md mb-3">{c.title}</h2>
                <p className="font-body-md text-on-surface-variant mb-4 max-w-2xl">
                  {c.description}
                </p>
                <div className="flex flex-wrap gap-8 pt-4 border-t border-primary/10 mt-2">
                  {c.country && <Meta label={t("Country")} value={c.country} />}
                  {c.medium && <Meta label={t("Medium")} value={c.medium} />}
                  <Meta label={t("Artists")} value={c.artists} />
                  <div>
                    <p className="font-label-caps text-[10px] uppercase text-on-surface-variant/60 mb-1">{t("Price")}</p>
                    <PriceUponRequest className="text-sm" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </section>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-12 gap-x-gutter gap-y-section-gap mb-section-gap">
          {filtered.map((c, i) => {
            const span = i === 0 ? "md:col-span-8" : "md:col-span-4";
            return (
              <Link
                key={c.slug}
                href={`/collections/${c.slug}`}
                className={`${span} group cursor-pointer flex flex-col`}
              >
                <div
                  className={`relative overflow-hidden mb-8 ${i === 0 ? "aspect-[16/9]" : "aspect-[3/4]"}`}
                >
                  <Image
                    fill
                    sizes={i === 0 ? "(max-width: 768px) 100vw, 66vw" : "(max-width: 768px) 100vw, 33vw"}
                    className="object-cover transition-all duration-700 scale-100 group-hover:scale-105"
                    alt={c.imageAlt}
                    src={c.image}
                  />
                  {c.tag && (
                    <div className="absolute top-8 left-8">
                      <span className="bg-primary text-beige font-label-caps text-[10px] px-3 py-1 uppercase tracking-widest">
                        {c.tag}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <h2
                    className={`${i === 0 ? "font-headline-md text-headline-md" : "font-headline-sm text-headline-sm"} mb-3`}
                  >
                    {c.title}
                  </h2>
                  {i === 0 && <div className="red-thread mb-4 w-1/4 group-hover:w-full transition-all duration-500"></div>}
                  <p className="font-body-md text-on-surface-variant mb-6 line-clamp-3">
                    {c.description}
                  </p>
                  <div className="mt-auto pt-6 border-t border-primary/10">
                    <div className="flex justify-between items-center">
                      <span className="font-label-caps text-[11px] uppercase tracking-widest">
                        {c.artists}
                      </span>
                      <PriceUponRequest className="text-[11px]" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      )}

      <section className="mb-section-gap grid gap-10 border-t border-primary/10 pt-16 md:grid-cols-[1fr_1.4fr]">
        <h2 className="font-display text-3xl md:text-4xl">{t("Choose a work that stays with you")}</h2>
        <div className="max-w-2xl space-y-5 text-lg leading-[1.6] text-on-surface">
          <p>
            {t("Explore available artworks and ask us about the piece that draws you in. We can help you understand its materials, dimensions and presentation, and discuss the next steps in bringing it into your space.")}
          </p>
          <p className="text-on-surface-variant">
            {t("NUA-ARTE purchases selected works directly from artists, paying them at acquisition. When a work is sold, its creator also receives an additional commission. Collecting helps sustain this cycle of discovery, support and wider visibility.")}
          </p>
        </div>
      </section>

      <section className="bg-surface-container-low p-margin-desktop mb-section-gap relative overflow-hidden">
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-headline-md text-headline-md mb-6">
              {t("Never Miss a New Collection")}
            </h2>
            <p className="font-body-lg text-on-surface-variant mb-8 max-w-sm">
              {t("Be the first to receive our curated catalogues and invitations to private artist viewings.")}
            </p>
            <form className="flex flex-col gap-6 max-w-md" onSubmit={(e) => e.preventDefault()}>
              <div className="border-b border-primary py-2 relative group">
                <input
                  className="bg-transparent border-none w-full focus:ring-0 font-label-caps placeholder:text-primary/30 text-primary"
                  placeholder={t("EMAIL ADDRESS")}
                  type="email"
                />
                <div className="absolute bottom-0 left-0 h-[2px] bg-secondary w-0 group-focus-within:w-full transition-all duration-500"></div>
              </div>
              <button className="text-left font-label-caps text-label-caps uppercase tracking-widest flex items-center gap-4 group">
                {t("Subscribe")}{" "}
                <span className="w-12 h-[1px] bg-secondary group-hover:w-24 transition-all duration-300"></span>
              </button>
            </form>
          </div>
          <div className="hidden md:block relative aspect-square">
            <Image
              fill
              sizes="50vw"
              className="object-cover opacity-80"
              alt={t("Contemporary African ceramic vessel curated for NUA-ARTE.")}
              src="https://nu-artcollective.lovable.app/__l5e/assets-v1/8fb36909-f581-4701-9e44-3a179fcb76d5/afr-ceramic.jpg"
            />
          </div>
        </div>
        <div className="absolute -top-12 -right-12 opacity-10 pointer-events-none">
          <svg fill="none" height="400" viewBox="0 0 400 400" width="400">
            <path
              d="M380 200C380 299.411 299.411 380 200 380C100.589 380 20 299.411 20 200C20 100.589 100.589 20 200 20C299.411 20 380 100.589 380 200Z"
              stroke="var(--red-blood)"
              strokeWidth="1"
            ></path>
          </svg>
        </div>
      </section>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-label-caps text-[10px] uppercase text-primary/40">{label}</p>
      <p className="font-body-md text-primary">{value}</p>
    </div>
  );
}

function FilterButton({
  label,
  value,
  open,
  onToggle,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  open: boolean;
  onToggle: () => void;
  options: string[];
  onSelect: (v: string) => void;
}) {
  const { t } = useLanguage();
  const active = value !== "All";
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`font-label-caps text-label-caps uppercase flex items-center gap-2 tracking-widest transition-colors ${active ? "text-secondary" : "hover:text-secondary"}`}
      >
        {active ? `${label}: ${t(value)}` : label}
        <span className={`material-symbols-outlined text-[16px] transition-transform ${open ? "rotate-180" : ""}`}>
          expand_more
        </span>
      </button>
      {open && (
        <div className="absolute z-30 top-full left-0 mt-4 min-w-[220px] bg-surface border border-primary/10 shadow-lg py-2">
          {options.map((opt) => {
            const selected = opt === value;
            return (
              <button
                key={opt}
                onClick={() => onSelect(opt)}
                className={`w-full text-left px-5 py-2 font-label-caps text-label-caps uppercase tracking-widest transition-colors ${selected ? "text-secondary" : "text-primary hover:text-secondary"}`}
              >
                {t(opt)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
