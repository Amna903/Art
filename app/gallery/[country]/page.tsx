"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { markVisited, type CountryGallery, type MockArtwork } from "@/lib/data/africa";
import { EnquiryModal } from "@/components/enquiry/EnquiryModal";
import { PriceUponRequest } from "@/components/enquiry/PriceUponRequest";
import { getCountryGalleryBySlug } from "@/lib/sanity/queries";
import { toast } from "sonner";

type Props = { params: Promise<{ country: string }> };

export default function GalleryPageRoute({ params }: Props) {
  const [gallery, setGallery] = useState<CountryGallery | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    params.then(async ({ country }) => {
      const nextGallery = await getCountryGalleryBySlug(country);
      if (alive) setGallery(nextGallery);
    });
    return () => {
      alive = false;
    };
  }, [params]);

  if (gallery === undefined) return null;
  if (gallery === null) return <GalleryNotFound />;
  return <GalleryPage gallery={gallery} />;
}

function GalleryNotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-primary text-beige">
      <div className="text-center px-6">
        <p className="font-label-caps tracking-widest text-secondary mb-3">COUNTRY NOT FOUND</p>
        <h1 className="font-display-lg text-4xl mb-6">This gallery isn&apos;t on the map.</h1>
        <Link href="/#atlas" className="border border-beige px-6 py-3 font-label-caps tracking-widest hover:bg-beige hover:text-primary transition-colors">
          RETURN TO MAP
        </Link>
      </div>
    </main>
  );
}

function GalleryPage({ gallery }: { gallery: CountryGallery }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"intro" | "walk">("intro");
  const [active, setActive] = useState<MockArtwork | null>(null);
  const [currentRoom, setCurrentRoom] = useState(0);
  const [autoWalk, setAutoWalk] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const autoRafRef = useRef<number | null>(null);

  // Track current room via scroll position
  useEffect(() => {
    if (phase !== "walk") return;
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const room = Math.round(el.scrollLeft / el.clientWidth);
      setCurrentRoom(Math.min(Math.max(room, 0), gallery.rooms.length - 1));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [phase, gallery.rooms.length]);

  // Auto-walk loop
  useEffect(() => {
    if (!autoWalk || phase !== "walk") return;
    const el = scrollerRef.current;
    if (!el) return;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = t - last;
      last = t;
      el.scrollLeft += dt * 0.08; // ~80px/s
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 2) {
        setAutoWalk(false);
        return;
      }
      autoRafRef.current = requestAnimationFrame(tick);
    };
    autoRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (autoRafRef.current) cancelAnimationFrame(autoRafRef.current);
    };
  }, [autoWalk, phase]);

  const enterGallery = (guided: boolean) => {
    markVisited(gallery.country.slug);
    setPhase("walk");
    if (guided) setTimeout(() => setAutoWalk(true), 800);
  };

  const exit = () => router.push("/discover");

  const gotoRoom = (idx: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
  };

  const [enquiryTarget, setEnquiryTarget] = useState<MockArtwork | null>(null);

  const handleRequestPrice = (a: MockArtwork) => {
    if (a.price === null) {
      toast("For exhibition only");
      return;
    }
    setActive(null);
    setEnquiryTarget(a);
  };

  if (phase === "intro") {
    return (
      <main className="min-h-screen bg-primary text-beige flex items-center justify-center px-6 py-16">
        <div className="max-w-3xl text-center animate-fade-in">
          <div className="text-7xl mb-8">{gallery.country.flag}</div>
          <p className="font-label-caps text-label-caps text-secondary tracking-[0.3em] mb-3">VIRTUAL COUNTRY GALLERY</p>
          <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg uppercase mb-6">{gallery.country.name}</h1>
          <p className="font-body-lg max-w-xl mx-auto opacity-80 mb-10 leading-relaxed">{gallery.country.blurb}</p>
          <div className="flex flex-wrap items-center justify-center gap-6 mb-12 font-label-caps text-label-caps tracking-widest">
            <span><span className="text-secondary">{gallery.artists.length}</span> ARTISTS</span>
            <span className="opacity-30">·</span>
            <span><span className="text-secondary">{gallery.artworks.length}</span> WORKS</span>
            <span className="opacity-30">·</span>
            <span><span className="text-secondary">{gallery.rooms.length}</span> ROOMS</span>
            <span className="opacity-30">·</span>
            <span>{gallery.country.capital.toUpperCase()}</span>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => enterGallery(false)}
              className="bg-beige text-primary px-10 py-4 font-navigation text-navigation uppercase tracking-[0.15em] hover:bg-secondary hover:text-beige transition-all"
            >
              Enter Gallery →
            </button>
            <button
              onClick={() => enterGallery(true)}
              className="border border-beige/40 px-10 py-4 font-navigation text-navigation uppercase tracking-[0.15em] hover:bg-beige/10 transition-all"
            >
              Guided Tour
            </button>
            <Link
              href="/#atlas"
              className="px-6 py-4 font-navigation text-navigation uppercase tracking-[0.15em] text-beige/60 hover:text-beige transition-all"
            >
              ← Back to map
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 bg-primary text-beige overflow-hidden z-[100]">
      {/* Mini-map */}
      <div className="absolute top-4 right-4 z-30 bg-black/80 backdrop-blur-md border border-beige/10 p-3 shadow-2xl">
        <div className="font-label-caps text-[9px] tracking-widest opacity-50 mb-2">MAP · {gallery.country.flag} {gallery.country.name.toUpperCase()}</div>
        <div className="flex gap-1">
          {gallery.rooms.map((r, i) => (
            <button
              key={i}
              onClick={() => gotoRoom(i)}
              className={`h-2 w-12 transition-all ${i === currentRoom ? "bg-secondary" : "bg-beige/20 hover:bg-beige/40"}`}
              title={r.title}
            />
          ))}
        </div>
        <div className="font-label-caps text-[9px] tracking-widest mt-2 opacity-80">
          {currentRoom + 1}/{gallery.rooms.length} · {gallery.rooms[currentRoom].title.toUpperCase()}
        </div>
      </div>

      {/* Exit */}
      <button
        onClick={exit}
        className="absolute top-4 left-4 z-30 bg-black/80 backdrop-blur-md border border-beige/10 px-4 py-2 font-label-caps text-[10px] tracking-widest hover:bg-secondary transition-colors"
      >
        ← EXIT GALLERY
      </button>

      {/* Scrolling rooms */}
      <div
        ref={scrollerRef}
        className="flex h-full w-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        {gallery.rooms.map((room, roomIdx) => {
          const works = gallery.artworks.filter((a) => a.room === roomIdx);
          const isFeatured = roomIdx === 0;
          return (
            <section
              key={roomIdx}
              className="relative h-full w-full flex-shrink-0 snap-start"
              style={{
                background: isFeatured
                  ? "linear-gradient(180deg, #1a1816 0%, #0a0908 70%, #050404 100%)"
                  : "linear-gradient(180deg, #15140f 0%, #0a0908 70%, #050404 100%)",
              }}
            >
              {/* Floor */}
              <div
                className="absolute bottom-0 left-0 right-0 h-1/3"
                style={{
                  background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.6) 100%)",
                  transform: "perspective(800px) rotateX(60deg)",
                  transformOrigin: "top",
                }}
              />
              {/* Red thread on floor */}
              <svg className="absolute bottom-0 left-0 w-full h-1/3 pointer-events-none" viewBox="0 0 1000 200" preserveAspectRatio="none">
                <line x1="0" y1="100" x2="1000" y2="100" stroke="var(--red-blood)" strokeWidth="2" strokeDasharray="12 8" opacity="0.7" />
              </svg>

              {/* Room title */}
              <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center">
                <p className="font-label-caps text-label-caps tracking-[0.3em] text-secondary mb-1">ROOM {String(roomIdx + 1).padStart(2, "0")}</p>
                <h2 className="font-display-lg text-2xl md:text-4xl uppercase">{room.title}</h2>
                <p className="font-body-md text-sm opacity-60 mt-1">{room.subtitle}</p>
              </div>

              {/* Artworks on walls */}
              <div className="absolute inset-0 flex items-center justify-center pt-32 pb-32 px-12">
                <div className="flex gap-8 md:gap-16 items-center">
                  {works.length === 0 && (
                    <p className="font-label-caps tracking-widest opacity-50">This room is being curated.</p>
                  )}
                  {works.map((a, i) => {
                    const isHero = isFeatured && i === 0;
                    return (
                      <div
                        key={a.id}
                        className="relative group cursor-pointer flex-shrink-0"
                        style={{
                          transform: `translateY(${(i % 2) * 20 - 10}px)`,
                        }}
                        onClick={() => setActive(a)}
                      >
                        {/* Spotlight */}
                        <div
                          className="absolute -inset-12 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity"
                          style={{
                            background: "radial-gradient(ellipse at center, rgba(228,219,213,0.25) 0%, transparent 70%)",
                          }}
                        />
                        {/* Frame */}
                        <div
                          className="relative bg-beige border-[10px] border-[#1c1815] shadow-2xl"
                          style={{
                            width: isHero ? 280 : 200,
                            height: isHero ? 360 : 260,
                          }}
                        >
                          <div
                            className="w-full h-full flex items-end p-4"
                            style={{
                              background: `linear-gradient(135deg, #${a.swatch} 0%, #1c1815 100%)`,
                            }}
                          >
                            <span className="font-display-lg text-beige/90 text-xs uppercase tracking-wider leading-tight">{a.title}</span>
                          </div>
                          {/* Hotspot */}
                          <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-secondary shadow-lg animate-pulse" />
                          {isHero && (
                            <span
                              className="absolute -inset-6 rounded-full border-2 border-secondary opacity-70 pointer-events-none"
                              style={{ animation: "pulse-ring 3s ease-in-out infinite" }}
                            />
                          )}
                        </div>
                        {/* Plaque */}
                        <div className="mt-4 bg-beige text-primary px-3 py-2 border-l-2 border-secondary max-w-[280px]">
                          <p className="font-label-caps text-[9px] tracking-widest opacity-60">{a.year} · {a.technique.split(" ").slice(0, 2).join(" ")}</p>
                          <p className="font-navigation text-sm uppercase truncate">{a.title}</p>
                          <p className="font-body-md text-xs opacity-70 truncate">{a.artist}</p>
                          <p className="font-label-caps text-[9px] tracking-widest mt-1 text-secondary">
                            {a.price !== null ? "PRICE UPON REQUEST" : "FOR EXHIBITION ONLY"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-black/80 backdrop-blur-md border border-beige/10 p-2 shadow-2xl">
        <button
          onClick={() => gotoRoom(Math.max(currentRoom - 1, 0))}
          disabled={currentRoom === 0}
          className="px-4 py-2 font-label-caps text-[10px] tracking-widest hover:bg-beige/10 disabled:opacity-30 transition-colors"
        >
          ◀ PREV
        </button>
        <button
          onClick={() => setAutoWalk((v) => !v)}
          className={`px-4 py-2 font-label-caps text-[10px] tracking-widest transition-colors ${
            autoWalk ? "bg-secondary text-beige" : "hover:bg-beige/10"
          }`}
        >
          {autoWalk ? "⏸ PAUSE TOUR" : "▶ AUTO WALK"}
        </button>
        <button
          onClick={() => gotoRoom(Math.min(currentRoom + 1, gallery.rooms.length - 1))}
          disabled={currentRoom === gallery.rooms.length - 1}
          className="px-4 py-2 font-label-caps text-[10px] tracking-widest hover:bg-beige/10 disabled:opacity-30 transition-colors"
        >
          NEXT ▶
        </button>
        <span className="w-px h-6 bg-beige/20 mx-1" />
        <Link
          href="/#atlas"
          className="px-4 py-2 font-label-caps text-[10px] tracking-widest hover:bg-beige/10 transition-colors"
        >
          CHANGE COUNTRY
        </Link>
      </div>

      {/* Artwork panel */}
      {active && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setActive(null)}
        >
          <aside
            className="absolute right-0 top-0 bottom-0 w-full md:w-[480px] bg-beige text-primary overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 md:p-8">
              <button
                onClick={() => setActive(null)}
                className="float-right text-2xl hover:text-secondary transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
              <p className="font-label-caps text-label-caps tracking-widest text-secondary mb-2">ARTWORK</p>
              <h2 className="font-display-lg text-3xl uppercase mb-2 leading-tight">{active.title}</h2>
              <p className="font-body-md mb-6">
                <Link href="/artists/amara-diop" className="underline decoration-secondary underline-offset-4 hover:text-secondary">
                  {active.artist}
                </Link>
              </p>

              <div
                className="aspect-[3/4] w-full mb-6 flex items-end p-6 border-[8px] border-[#1c1815] shadow-xl"
                style={{ background: `linear-gradient(135deg, #${active.swatch} 0%, #1c1815 100%)` }}
              >
                <span className="font-display-lg text-beige/90 text-base uppercase tracking-wider">{active.title}</span>
              </div>

              <dl className="grid grid-cols-2 gap-4 font-body-md text-sm mb-6">
                <div><dt className="font-label-caps text-[9px] tracking-widest opacity-60">COUNTRY</dt><dd>{gallery.country.name}</dd></div>
                <div><dt className="font-label-caps text-[9px] tracking-widest opacity-60">CITY</dt><dd>{active.city}</dd></div>
                <div><dt className="font-label-caps text-[9px] tracking-widest opacity-60">YEAR</dt><dd>{active.year}</dd></div>
                <div><dt className="font-label-caps text-[9px] tracking-widest opacity-60">DIMENSIONS</dt><dd>{active.dimensions}</dd></div>
                <div className="col-span-2"><dt className="font-label-caps text-[9px] tracking-widest opacity-60">TECHNIQUE</dt><dd>{active.technique}</dd></div>
                <div className="col-span-2"><dt className="font-label-caps text-[9px] tracking-widest opacity-60">PRICE</dt>
                  <dd>{active.price !== null ? <PriceUponRequest /> : <span className="text-on-surface-variant">For exhibition only</span>}</dd>
                </div>
              </dl>

              <p className="font-body-md text-sm leading-relaxed mb-8 opacity-80">{active.description}</p>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={() => handleRequestPrice(active)}
                  className="bg-primary text-beige py-3 font-label-caps text-[10px] tracking-widest hover:bg-secondary transition-colors"
                >
                  {active.price !== null ? "REQUEST PRICE" : "EXHIBITION ONLY"}
                </button>
                <Link
                  href="/artworks/ethereal-resilience"
                  className="border border-primary py-3 text-center font-label-caps text-[10px] tracking-widest hover:bg-primary hover:text-beige transition-colors"
                >
                  VIEW ARTWORK
                </Link>
                <button
                  onClick={() => toast("Saved to your collection (demo)")}
                  className="border border-primary/30 py-3 font-label-caps text-[10px] tracking-widest hover:border-primary transition-colors"
                >
                  ♥ SAVE
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    toast("Gallery link copied");
                  }}
                  className="border border-primary/30 py-3 font-label-caps text-[10px] tracking-widest hover:border-primary transition-colors"
                >
                  ↗ SHARE
                </button>
              </div>
              <Link
                href="/artists/amara-diop"
                className="block text-center py-3 font-label-caps text-[10px] tracking-widest underline decoration-secondary underline-offset-4 hover:text-secondary"
              >
                MEET THE ARTIST →
              </Link>
            </div>
          </aside>
        </div>
      )}

      <EnquiryModal
        open={!!enquiryTarget}
        onClose={() => setEnquiryTarget(null)}
        artworkSlug={enquiryTarget?.id ?? ""}
        artworkTitle={enquiryTarget?.title ?? ""}
        artistName={enquiryTarget?.artist}
      />
    </main>
  );
}
