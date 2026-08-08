"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import type { Artist } from "@/lib/data/artists";
import { AFRICAN_COUNTRIES } from "@/lib/data/africa";
import type { DirectoryArtwork } from "@/lib/data/directory";

type Props = {
  artists: Artist[];
  artworks: DirectoryArtwork[];
};

function SearchPageInner({ artists, artworks }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  const handleChange = (value: string) => {
    setQuery(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("q", value);
    else params.delete("q");
    router.replace(`/search${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });
  };

  const needle = query.trim().toLowerCase();

  const artistResults = useMemo(() => {
    if (!needle) return [];
    return artists
      .filter((a) => `${a.name} ${a.countryName} ${a.city} ${a.technique}`.toLowerCase().includes(needle))
      .slice(0, 12);
  }, [needle, artists]);

  const countryResults = useMemo(() => {
    if (!needle) return [];
    return AFRICAN_COUNTRIES.filter((c) => c.name.toLowerCase().includes(needle)).slice(0, 8);
  }, [needle]);

  const artworkResults = useMemo(() => {
    if (!needle) return [];
    return artworks
      .filter((w) => `${w.title} ${w.artist} ${w.country}`.toLowerCase().includes(needle))
      .slice(0, 12);
  }, [needle, artworks]);

  const totalCount = artistResults.length + countryResults.length + artworkResults.length;

  return (
    <main className="max-w-container-max mx-auto px-gutter-page py-16 md:py-24">
      <header className="mb-12">
        <span className="font-label-caps text-label-caps text-secondary uppercase block mb-3">Search</span>
        <div className="relative max-w-2xl">
          <span className="material-symbols-outlined absolute left-0 top-1/2 -translate-y-1/2 text-on-surface-variant">
            search
          </span>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Search artists, countries, artworks…"
            className="w-full bg-transparent border-b border-primary/30 focus:border-secondary outline-none py-4 pl-9 font-display text-2xl md:text-3xl text-primary placeholder:text-on-surface-variant/40 transition-colors"
          />
          {query && (
            <button
              onClick={() => handleChange("")}
              aria-label="Clear search"
              className="absolute right-0 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant hover:text-secondary w-11 h-11 flex items-center justify-center"
            >
              close
            </button>
          )}
        </div>
        {needle && (
          <p className="font-label-caps text-[11px] uppercase tracking-widest text-on-surface-variant mt-4">
            {totalCount} result{totalCount === 1 ? "" : "s"} for &ldquo;{query}&rdquo;
          </p>
        )}
      </header>

      {!needle ? (
        <p className="text-on-surface-variant">Start typing to search across artists, countries, and artworks.</p>
      ) : totalCount === 0 ? (
        <p className="text-on-surface-variant">No results for &ldquo;{query}&rdquo;. Try a different term.</p>
      ) : (
        <div className="space-y-16">
          {artistResults.length > 0 && (
            <section>
              <h2 className="font-headline-sm text-headline-sm mb-6 pb-3 border-b border-outline-variant">
                Artists
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {artistResults.map((a) => (
                  <Link key={a.slug} href={`/artists/${a.slug}`} className="group flex gap-4">
                    <div className="relative w-20 h-20 shrink-0 overflow-hidden bg-surface-container">
                      <Image
                        src={a.image}
                        alt={a.name}
                        fill
                        sizes="80px"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div>
                      <p className="font-headline-sm text-headline-sm group-hover:text-secondary transition-colors">
                        {a.name}
                      </p>
                      <p className="font-label-caps text-[11px] uppercase text-on-surface-variant">
                        {a.city}, {a.countryName}
                      </p>
                      <p className="font-label-caps text-[11px] uppercase text-secondary mt-1">{a.technique}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {countryResults.length > 0 && (
            <section>
              <h2 className="font-headline-sm text-headline-sm mb-6 pb-3 border-b border-outline-variant">
                Countries
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {countryResults.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/discover/${c.slug}`}
                    className="flex items-center gap-3 p-4 border border-outline-variant hover:border-secondary transition-colors"
                  >
                    <span className="text-2xl">{c.flag}</span>
                    <span className="font-label-caps text-[11px] uppercase tracking-widest">{c.name}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {artworkResults.length > 0 && (
            <section>
              <h2 className="font-headline-sm text-headline-sm mb-6 pb-3 border-b border-outline-variant">
                Artworks
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {artworkResults.map((w) => (
                  <Link key={w.slug} href={`/artworks/${w.slug}`} className="group">
                    <div className="relative aspect-square overflow-hidden bg-surface-container mb-3">
                      <Image
                        src={w.image}
                        alt={w.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <p className="font-headline-sm text-headline-sm group-hover:text-secondary transition-colors">
                      {w.title}
                    </p>
                    <p className="font-label-caps text-[11px] uppercase text-on-surface-variant">{w.artist}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}

export function SearchPageContent(props: Props) {
  return (
    <Suspense>
      <SearchPageInner {...props} />
    </Suspense>
  );
}
