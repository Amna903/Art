"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TECHNIQUES, type Artist, type Technique } from "@/lib/data/artists";
import { AFRICAN_COUNTRIES, getCountryDisplayName } from "@/lib/data/africa";
import { INTL_LOCALES } from "@/lib/i18n/config";
import { useLanguage } from "@/lib/i18n";
import { ArtistCard } from "./ArtistCard";

const FILTERS = ["All", "New Discoveries", ...TECHNIQUES] as const;
type Filter = (typeof FILTERS)[number];

export function ArtistDirectory({ artists }: { artists: Artist[] }) {
  const searchParams = useSearchParams();
  const { t, language, formatNumber } = useLanguage();

  const sourceArtists = artists;
  const totalCount = artists.length;

  // f/country/q all drive filtering entirely client-side (over the `artists`
  // prop already loaded on the page) — they never needed a server round trip.
  // But /artists is a fully dynamic route (live Supabase/Sanity fetches, no
  // caching) and its <Suspense> has no fallback, so the old router.push-per-
  // change approach forced a real navigation for every filter click or
  // keystroke: the whole directory (including whatever you'd just typed)
  // blanked out while the new page was fetched, then popped back in. Local
  // state drives the UI instantly; the URL is kept in sync via
  // history.replaceState so links stay shareable/back-button-able, without
  // ever triggering Next's router (no navigation, no re-suspension, no flicker).
  const [f, setF] = useState<Filter>((searchParams.get("f") as Filter) || "All");
  const [country, setCountry] = useState(searchParams.get("country") || "");
  const [q, setQ] = useState(searchParams.get("q") || "");

  const syncUrl = (next: { f: Filter; country: string; q: string }) => {
    const params = new URLSearchParams();
    if (next.f && next.f !== "All") params.set("f", next.f);
    if (next.country) params.set("country", next.country);
    if (next.q) params.set("q", next.q);
    const query = params.toString();
    window.history.replaceState(null, "", `/artists${query ? `?${query}` : ""}`);
  };

  const urlDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (urlDebounce.current) clearTimeout(urlDebounce.current);
  }, []);

  const updateParams = (next: Partial<{ f: Filter; country: string; q: string }>) => {
    const merged = { f, country, q, ...next };
    if (next.f !== undefined) setF(merged.f);
    if (next.country !== undefined) setCountry(merged.country);
    if (next.q !== undefined) setQ(merged.q);

    // Debounce only the (fast-typing) search field's URL sync; filter pill/
    // country changes are discrete clicks, so sync those immediately.
    if (next.q !== undefined) {
      if (urlDebounce.current) clearTimeout(urlDebounce.current);
      urlDebounce.current = setTimeout(() => syncUrl(merged), 300);
    } else {
      if (urlDebounce.current) clearTimeout(urlDebounce.current);
      syncUrl(merged);
    }
  };

  const resetFilters = () => {
    if (urlDebounce.current) clearTimeout(urlDebounce.current);
    setF("All");
    setCountry("");
    setQ("");
    syncUrl({ f: "All", country: "", q: "" });
  };

  // Only offer filters that return someone (change brief §6).
  const techniquesInUse = useMemo(
    () => new Set(sourceArtists.flatMap((a) => a.filterTechniques ?? [a.technique as Technique])),
    [sourceArtists],
  );
  const visibleFilters = FILTERS.filter((label) =>
    label === "All" ? true : label === "New Discoveries" ? sourceArtists.some((a) => a.newDiscovery) : techniquesInUse.has(label),
  );
  const countriesInUse = useMemo(
    () => AFRICAN_COUNTRIES.filter((c) => sourceArtists.some((a) => a.countrySlug === c.slug)),
    [sourceArtists],
  );
  // "12 artists from Angola and DR Congo" — the real countries, not "54 nations".
  const countryNames = countriesInUse.map((c) => getCountryDisplayName(c, language));
  const intro =
    countryNames.length > 0 && countryNames.length <= 4
      ? t("{artists} artists from {countries}", {
          artists: formatNumber(totalCount),
          countries: new Intl.ListFormat(INTL_LOCALES[language], { type: "conjunction" }).format(countryNames),
        })
      : t("{artists} artists across {count} countries", {
          artists: formatNumber(totalCount),
          count: formatNumber(countryNames.length),
        });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return sourceArtists.filter((a) => {
      if (f === "New Discoveries" && !a.newDiscovery) return false;
      if (
        f !== "All" &&
        f !== "New Discoveries" &&
        !(a.filterTechniques ?? [a.technique as Technique]).includes(f as Technique)
      )
        return false;
      if (country && a.countrySlug !== country) return false;
      if (
        needle &&
        !`${a.name} ${a.countryName} ${a.city} ${a.technique} ${(a.filterTechniques ?? []).join(" ")}`
          .toLowerCase()
          .includes(needle)
      )
        return false;
      return true;
    });
  }, [sourceArtists, f, country, q]);

  return (
    <main className="px-gutter-page py-16 md:py-24 max-w-[1320px] mx-auto">
      <header className="mb-12 md:mb-16">
        <span className="font-label-caps text-secondary tracking-widest">{t("The Movement")}</span>
        <h1 className="font-display text-primary text-5xl md:text-7xl mt-3 mb-4">{t("Artists")}</h1>
        <p className="font-body-lg text-on-surface-variant max-w-2xl">
          {intro}
        </p>
        <div className="red-thread mt-8" />
      </header>

      <div className="flex flex-col gap-6 mb-12">
        <div className="flex flex-wrap gap-2">
          {visibleFilters.map((label) => {
            const active = f === label;
            return (
              <button
                key={label}
                onClick={() => updateParams({ f: label })}
                className={[
                  "font-label-caps tracking-wider uppercase text-xs px-4 py-2 rounded-full border transition-colors",
                  active
                    ? "bg-primary text-on-primary border-primary"
                    : "border-outline text-on-surface-variant hover:border-primary hover:text-primary",
                ].join(" ")}
              >
                {t(label)}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex flex-wrap gap-3">
            <select
              value={country}
              onChange={(e) => updateParams({ country: e.target.value })}
              className="bg-transparent border border-outline text-primary font-label-caps uppercase text-xs px-3 py-2 rounded-full min-w-[200px]"
            >
              <option value="">{t("All countries")}</option>
              {countriesInUse.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.flag} {getCountryDisplayName(c, language)}
                </option>
              ))}
            </select>
            <input
              type="search"
              placeholder={t("Search name, city, technique…")}
              value={q}
              onChange={(e) => updateParams({ q: e.target.value })}
              className="bg-transparent border border-outline text-primary placeholder:text-on-surface-variant/60 text-sm px-4 py-2 rounded-full min-w-[240px]"
            />
          </div>
          <p className="font-label-caps text-on-surface-variant text-xs tracking-widest">
            {t("Showing {shown} of {total}", { shown: formatNumber(filtered.length), total: formatNumber(totalCount) })}
          </p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-24 text-center">
          <p className="font-headline-sm text-primary mb-2">{t("No artists match your filters.")}</p>
          <button
            onClick={resetFilters}
            className="font-label-caps uppercase tracking-widest border-b border-primary text-primary"
          >
            {t("Reset filters")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4 lg:gap-x-8">
          {filtered.map((a, idx) => (
            <ArtistCard key={a.slug} artist={a} index={idx} />
          ))}
        </div>
      )}
    </main>
  );
}
