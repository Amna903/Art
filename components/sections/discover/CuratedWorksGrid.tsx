"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { PriceUponRequest } from "@/components/enquiry/PriceUponRequest";
import { RequestPriceButton } from "@/components/enquiry/RequestPriceButton";

export type CuratedWork = {
  id: string;
  title: string;
  artist: string;
  year: number;
  technique: string;
  dimensions: string;
  price: number | null;
  swatch: string;
  image: string;
};

const PAGE_SIZE = 6;

export function CuratedWorksGrid({ works }: { works: CuratedWork[] }) {
  const [medium, setMedium] = useState("All");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const mediums = useMemo(
    () => ["All", ...Array.from(new Set(works.map((w) => w.technique)))],
    [works],
  );

  const filtered = useMemo(
    () => (medium === "All" ? works : works.filter((w) => w.technique === medium)),
    [works, medium],
  );

  const visible = filtered.slice(0, visibleCount);

  const changeMedium = (m: string) => {
    setMedium(m);
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <div>
      {mediums.length > 2 && (
        <div className="flex flex-wrap gap-2 mb-10">
          {mediums.map((m) => (
            <button
              key={m}
              onClick={() => changeMedium(m)}
              className={`px-4 py-2 min-h-[40px] font-label-caps tracking-widest text-[10px] uppercase border transition-colors ${
                medium === m
                  ? "bg-primary text-beige border-primary"
                  : "border-outline/30 text-on-surface-variant hover:border-primary hover:text-primary"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-on-surface-variant py-12 text-center">No works found for this medium yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
            {visible.map((w) => (
              <article key={w.id} className="group">
                <div
                  className="relative aspect-[3/4] overflow-hidden mb-5"
                  style={{ background: `#${w.swatch}` }}
                >
                  <Image
                    src={w.image}
                    alt={`${w.title} by ${w.artist}`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover mix-blend-multiply opacity-95 transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                  {w.price !== null && (
                    <span className="absolute top-4 left-4 bg-beige text-primary px-3 py-1 font-label-caps tracking-widest text-[10px]">
                      AVAILABLE
                    </span>
                  )}
                </div>
                <p className="font-label-caps tracking-widest text-secondary text-xs">
                  {w.artist.toUpperCase()} · {w.year}
                </p>
                <h3 className="font-headline-sm text-primary mt-1 group-hover:text-secondary transition-colors">
                  {w.title}
                </h3>
                <p className="text-sm text-on-surface-variant italic mt-1">
                  {w.technique} · {w.dimensions}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  {w.price !== null ? (
                    <>
                      <PriceUponRequest className="font-body-md" />
                      <RequestPriceButton
                        artworkSlug={w.id}
                        artworkTitle={w.title}
                        artistName={w.artist}
                        artworkImage={w.image}
                        className="font-label-caps tracking-widest text-primary border-b border-primary hover:text-secondary hover:border-secondary transition-colors"
                      >
                        REQUEST PRICE →
                      </RequestPriceButton>
                    </>
                  ) : (
                    <span className="font-label-caps tracking-widest text-on-surface-variant">
                      Exhibition only
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>

          {visibleCount < filtered.length && (
            <div className="mt-14 flex justify-center">
              <button
                onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                className="bg-primary text-beige px-10 py-4 font-label-caps tracking-widest hover:bg-red-blood transition-colors"
              >
                LOAD MORE ({filtered.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
