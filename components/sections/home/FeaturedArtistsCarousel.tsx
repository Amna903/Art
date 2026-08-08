"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

export type FeaturedCard = {
  slug: string;
  name: string;
  country: string;
  discipline: string;
  image: string;
  badge?: string;
};

/**
 * Horizontal scroll-snap carousel. Touch swiping works natively via
 * overflow-x-auto; this layer adds working prev/next arrows and
 * mouse-drag-to-swipe for desktop pointers (touch/pen are left alone so the
 * browser's own momentum scrolling handles them).
 */
export function FeaturedArtistsCarousel({ cards }: { cards: FeaturedCard[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; startScrollLeft: number } | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const updateEdges = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft >= el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    updateEdges();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateEdges, { passive: true });
    window.addEventListener("resize", updateEdges);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      window.removeEventListener("resize", updateEdges);
    };
  }, [cards.length]);

  const scrollByCard = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return; // touch/pen keep native swipe scrolling
    const el = scrollerRef.current;
    if (!el) return;
    drag.current = { startX: e.clientX, startScrollLeft: el.scrollLeft };
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || e.pointerType !== "mouse") return;
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollLeft = drag.current.startScrollLeft - (e.clientX - drag.current.startX);
  };

  const endDrag = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    drag.current = null;
  };

  return (
    <>
      <div className="flex justify-between items-end mb-16">
        <div>
          <span className="font-label-caps text-label-caps text-secondary block mb-2">AFRICAN ARTISTS</span>
          <h2 className="font-headline-md text-headline-md">African Arts</h2>
        </div>
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            disabled={atStart}
            aria-label="Scroll left"
            className="w-12 h-12 border border-primary/20 flex items-center justify-center hover:bg-primary hover:text-on-primary transition-all disabled:opacity-30 disabled:pointer-events-none"
          >
            <span className="material-symbols-outlined">west</span>
          </button>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            disabled={atEnd}
            aria-label="Scroll right"
            className="w-12 h-12 border border-primary/20 flex items-center justify-center hover:bg-primary hover:text-on-primary transition-all disabled:opacity-30 disabled:pointer-events-none"
          >
            <span className="material-symbols-outlined">east</span>
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        className="flex gap-12 overflow-x-auto no-scrollbar snap-x-mandatory pb-8 cursor-grab active:cursor-grabbing"
      >
        {cards.map((artist) => (
          <div key={artist.slug} className="min-w-[400px] snap-center group cursor-pointer">
            <div className="aspect-[4/5] overflow-hidden mb-6 relative">
              <Image
                fill
                sizes="400px"
                draggable={false}
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                alt={artist.name}
                src={artist.image}
              />
              {artist.badge && (
                <div className="absolute bottom-4 left-4 bg-primary text-on-primary px-3 py-1 font-label-caps text-[10px]">
                  {artist.badge}
                </div>
              )}
            </div>
            <h3 className="font-headline-sm text-headline-sm mb-1">{artist.name}</h3>
            <p className="font-body-md text-on-surface-variant uppercase tracking-widest text-xs">
              {artist.country} • African {artist.discipline}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
