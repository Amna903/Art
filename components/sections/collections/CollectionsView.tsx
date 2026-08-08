"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { PriceUponRequest } from "@/components/enquiry/PriceUponRequest";
import { COLLECTIONS, type Collection } from "@/lib/data/collections";
import type { SupabaseCollection } from "@/lib/data/supabase-collections";
import { mergeSlots } from "@/lib/utils/mergeSlots";

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
    artists: `${c.artworkCount} artwork${c.artworkCount === 1 ? "" : "s"}`,
  };
}

export function CollectionsView({ initialItems = [] }: { initialItems?: SupabaseCollection[] }) {
  // Oldest real collection takes slot 0, so a slot never jumps once filled —
  // the rest stay static until replaced by admin-created collections.
  const allItems = useMemo(
    () => mergeSlots(initialItems.map(fromSupabase), COLLECTIONS),
    [initialItems],
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
      <section className="mb-12 border-b border-primary/10 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div ref={filterRef} className="flex items-center gap-12">
            <FilterButton
              label="Country"
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
              label="Medium"
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
                Reset
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="font-label-caps text-label-caps uppercase opacity-40">View As:</span>
            <button
              aria-label="Grid view"
              onClick={() => setView("grid")}
              className={`material-symbols-outlined w-11 h-11 flex items-center justify-center transition-opacity ${view === "grid" ? "text-primary opacity-100" : "text-on-surface-variant opacity-40 hover:opacity-100"}`}
            >
              grid_view
            </button>
            <button
              aria-label="List view"
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
            No collections match these filters.
          </p>
          <button
            onClick={resetAll}
            className="font-label-caps text-label-caps uppercase tracking-widest text-secondary hover:opacity-70"
          >
            Reset filters
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
                  className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
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
                  {c.country && <Meta label="Country" value={c.country} />}
                  {c.medium && <Meta label="Medium" value={c.medium} />}
                  <Meta label="Artists" value={c.artists} />
                  <div>
                    <p className="font-label-caps text-[10px] uppercase text-on-surface-variant/60 mb-1">Pricing</p>
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
                    className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-100 group-hover:scale-105"
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

      <section className="bg-surface-container-low p-margin-desktop mb-section-gap relative overflow-hidden">
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-headline-md text-headline-md mb-6">
              Never Miss a <br />
              New Collection
            </h2>
            <p className="font-body-lg text-on-surface-variant mb-8 max-w-sm">
              Be the first to receive our curated catalogues and invitations to private artist viewings.
            </p>
            <form className="flex flex-col gap-6 max-w-md" onSubmit={(e) => e.preventDefault()}>
              <div className="border-b border-primary py-2 relative group">
                <input
                  className="bg-transparent border-none w-full focus:ring-0 font-label-caps placeholder:text-primary/30 text-primary"
                  placeholder="YOUR EMAIL ADDRESS"
                  type="email"
                />
                <div className="absolute bottom-0 left-0 h-[2px] bg-secondary w-0 group-focus-within:w-full transition-all duration-500"></div>
              </div>
              <button className="text-left font-label-caps text-label-caps uppercase tracking-widest flex items-center gap-4 group">
                Subscribe{" "}
                <span className="w-12 h-[1px] bg-secondary group-hover:w-24 transition-all duration-300"></span>
              </button>
            </form>
          </div>
          <div className="hidden md:block relative aspect-square">
            <Image
              fill
              sizes="50vw"
              className="object-cover opacity-80"
              alt="Contemporary African ceramic vessel curated for NU-ART."
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
  const active = value !== "All";
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`font-label-caps text-label-caps uppercase flex items-center gap-2 tracking-widest transition-colors ${active ? "text-secondary" : "hover:text-secondary"}`}
      >
        {active ? `${label}: ${value}` : label}
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
                {opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
