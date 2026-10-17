"use client";

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "@/components/i18n/Link";
import type { Artwork } from "@/components/three/VirtualMuseum";
import { EnquiryModal } from "@/components/enquiry/EnquiryModal";
import { HeroCredit, HeroPicture } from "@/components/sections/HeroPicture";
import { MusicControl } from "@/components/gallery/MusicControl";
import { RoomTitlesEditor } from "@/components/gallery/RoomTitlesEditor";
import { MAX_ARTWORKS } from "@/lib/data/museum-layout";
import type { SiteHero } from "@/lib/data/site-heroes";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { useMusic } from "@/lib/music";

const VirtualMuseum = lazy(() => import("@/components/three/VirtualMuseum"));

type View = "entrance" | "tour" | "grid" | "free" | "end";
type RoomTitles = Record<1 | 2 | 3 | 4, string>;

/** 2–3 sentences of the curatorial copy. */
function shortStory(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g);
  if (!sentences || sentences.length <= 3) return text.trim();
  return sentences.slice(0, 3).join("").trim();
}

/** "100 x 80 cm" → "100 × 80 cm · 39.4 × 31.5 in". Text that already gives
 * inches, or has no numbers, is shown as entered. */
function useDimensions() {
  const { formatNumber } = useLanguage();
  return (raw?: string) => {
    if (!raw) return "";
    const text = raw.trim();
    if (/\b(in|inch|inches|")\b/i.test(text) || /"/.test(text)) return text;
    const nums = text.match(/\d+(?:[.,]\d+)?/g);
    if (!nums) return text;
    const values = nums.map((n) => Number(n.replace(",", ".")));
    const cmValues = /\bmm\b/i.test(text) ? values.map((v) => v / 10) : values;
    const fmt = (v: number) => formatNumber(v, { maximumFractionDigits: 1 });
    return `${cmValues.map(fmt).join(" × ")} cm · ${cmValues.map((v) => fmt(v / 2.54)).join(" × ")} in`;
  };
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}

export function VirtualGallery({
  artworks,
  roomTitles,
  hero,
  countryLabel,
}: {
  artworks: Artwork[];
  roomTitles: RoomTitles;
  hero: SiteHero | null;
  countryLabel: string | null;
}) {
  const { t } = useLanguage();
  const { role } = useAuth();
  const music = useMusic();
  const desktop = useMediaQuery("(min-width: 1024px)");
  const [view, setView] = useState<View>("entrance");
  const [index, setIndex] = useState(0);
  const [museumMounted, setMuseumMounted] = useState(false);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [editingRooms, setEditingRooms] = useState(false);

  const total = artworks.length;
  const current = artworks[index] ?? null;
  const roomTitle = (zone: 1 | 2 | 3 | 4) => roomTitles[zone] || t("Room {n}", { n: zone });

  // Fetch the playlist up front so "Start the tour" can play inside the tap.
  // Leaving the gallery fades the music out; nothing else inside it stops it.
  const { loadPlaylist, start: startMusic, stop: stopMusic } = music;
  useEffect(() => {
    void loadPlaylist();
    return () => stopMusic();
  }, [loadPlaylist, stopMusic]);

  // The 3D room mounts once it is first needed and then stays mounted, so the
  // camera glides between paintings instead of reloading.
  const wantsMuseum = view === "free" || (desktop && view !== "entrance");
  if (wantsMuseum && !museumMounted) setMuseumMounted(true);

  const inExperience = view !== "entrance";
  useEffect(() => {
    if (!inExperience) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [inExperience]);

  const openTour = useCallback(
    (at: number) => {
      startMusic();
      setIndex(Math.max(0, Math.min(at, total - 1)));
      setZoomed(false);
      setView("tour");
    },
    [startMusic, total],
  );

  const next = useCallback(() => {
    setZoomed(false);
    if (index >= total - 1) setView("end");
    else setIndex((i) => i + 1);
  }, [index, total]);

  const previous = useCallback(() => {
    setZoomed(false);
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  // Desktop: arrow keys move through the tour.
  useEffect(() => {
    if (view !== "tour" || enquiryOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select")) return;
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") previous();
      else if (e.key === "Escape") setZoomed(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, enquiryOpen, next, previous]);

  // Mobile: swipe left / right.
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swipeHandlers = {
    onTouchStart: (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const s = touchStart.current;
      touchStart.current = null;
      if (!s || zoomed) return;
      const dx = e.changedTouches[0].clientX - s.x;
      const dy = e.changedTouches[0].clientY - s.y;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (dx < 0) next();
      else previous();
    },
  };

  const formatDimensions = useDimensions();
  const entranceImage = hero
    ? null
    : artworks.find((a) => a.image)
      ? { src: artworks[0].image, credit: `${artworks[0].title} — ${artworks[0].artist}` }
      : null;
  const credit = hero?.credit ?? entranceImage?.credit ?? null;

  return (
    <main>
      {/* ---------- Gallery entrance (charcoal section) ---------- */}
      <section className="relative isolate w-screen mx-[calc(50%-50vw)] mt-16 overflow-hidden bg-[var(--nua-charcoal-deep)] text-[var(--nua-white)]">
        <div className="absolute inset-0 -z-10">
          {hero ? (
            <HeroPicture hero={hero} />
          ) : entranceImage ? (
            <Image src={entranceImage.src} alt="" fill priority sizes="100vw" className="object-cover" />
          ) : null}
          <div className="absolute inset-0 bg-[var(--overlay-scrim)]" aria-hidden="true" />
        </div>

        <div className="mx-auto flex min-h-[min(calc(100svh-4rem),760px)] max-w-container-max flex-col justify-center px-6 py-20 sm:px-10 lg:px-12">
          <div className="max-w-[640px]">
            {countryLabel && (
              <p className="mb-4 text-xs uppercase tracking-[0.3em] text-[var(--nua-grey-light)]">{countryLabel}</p>
            )}
            <h1 className="font-display text-[clamp(2.25rem,5.5vw,4.5rem)] font-normal leading-[1.02]">
              {t("Take your time with the work")}
            </h1>
            <p className="mt-5 max-w-[520px] text-lg leading-[1.6] text-[var(--nua-white)]/90">
              {total > 0
                ? t("A guided tour of the NUA-ARTE collection, one artwork at a time, with music.")
                : t("The works are being hung. Please come back soon.")}
            </p>

            {total > 0 && (
              <>
                <div className="mt-9 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => openTour(0)}
                    className="btn-primary min-h-[48px] px-8 text-base font-semibold"
                  >
                    {t("Start the tour")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("grid")}
                    className="min-h-[48px] border border-[var(--nua-white)]/85 px-7 text-base text-[var(--nua-white)] transition-colors hover:bg-[var(--nua-white)] hover:text-[var(--nua-charcoal)]"
                  >
                    {t("Browse all artworks")}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    startMusic();
                    setView("free");
                  }}
                  className="mt-6 inline-flex min-h-[44px] items-center text-sm text-[var(--nua-white)]/80 underline underline-offset-4 hover:text-[var(--nua-white)]"
                >
                  {t("Explore the rooms freely")}
                </button>
              </>
            )}
          </div>
        </div>

        {credit && <HeroCredit credit={credit} label={t("Artwork: {credit}", { credit })} />}

        {role === "admin" && (
          <button
            type="button"
            onClick={() => setEditingRooms(true)}
            className="absolute right-4 top-4 z-10 flex items-center gap-2 bg-[var(--nua-white)] px-4 py-2 text-xs uppercase tracking-widest text-[var(--nua-charcoal)] shadow-lg"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              edit
            </span>
            {t("Edit room titles")}
          </button>
        )}
      </section>

      <section className="px-gutter-page py-section-gap text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-headline-sm text-headline-sm mb-6 uppercase tracking-widest">{t("Connect with the Curators")}</h2>
          <p className="text-on-surface-variant">
            {t("Our curators are available for virtual consultations regarding any of the featured works in the Virtual Museum collection.")}
          </p>
        </div>
      </section>

      {/* ---------- The visit: tour, grid, free exploration, end ---------- */}
      {inExperience && (
        <div className="fixed inset-0 z-[60] bg-[var(--nua-charcoal-deep)] text-[var(--nua-white)]" role="dialog" aria-modal="true" aria-label={t("Virtual gallery")}>
          {museumMounted && (
            <div className={`absolute inset-0 ${wantsMuseum ? "" : "invisible"}`}>
              <Suspense fallback={<p className="absolute inset-0 flex items-center justify-center text-sm text-[var(--nua-grey-light)]">{t("Loading the gallery…")}</p>}>
                <VirtualMuseum
                  artworks={artworks.slice(0, MAX_ARTWORKS)}
                  mode={view === "free" ? "free" : "tour"}
                  focus={view === "tour" && index < MAX_ARTWORKS ? current : null}
                  focusOffset={desktop ? 0.9 : 0}
                  onSelectArtwork={(a) => openTour(artworks.findIndex((x) => x.id === a.id))}
                />
              </Suspense>
            </div>
          )}

          {/* Top bar: Back to artworks (left), progress (centre), leave (right). */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3 sm:p-4">
            <div className="pointer-events-auto">
              {view === "grid" ? (
                <button type="button" onClick={() => openTour(index)} className="btn-primary flex min-h-[44px] items-center gap-2 px-5 text-sm font-semibold">
                  {t("Continue the tour")}
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    arrow_forward
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setView("grid")}
                  className="flex min-h-[44px] items-center gap-2 border border-[var(--nua-line)] bg-[var(--nua-white)] px-4 text-sm text-[var(--nua-charcoal)] shadow-lg"
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    grid_view
                  </span>
                  {t("Back to artworks")}
                </button>
              )}
            </div>

            {view === "tour" && (
              <div className="pointer-events-auto absolute left-1/2 top-3 hidden -translate-x-1/2 flex-col items-center gap-1.5 bg-[var(--nua-charcoal-deep)]/80 px-4 py-2 backdrop-blur-md sm:top-4 lg:flex">
                <ProgressLabel index={index} total={total} />
              </div>
            )}

            <button
              type="button"
              onClick={() => setView("entrance")}
              aria-label={t("Leave the tour")}
              className={`pointer-events-auto flex h-11 w-11 items-center justify-center border shadow-lg ${
                view === "grid" || (view === "tour" && !desktop)
                  ? "border-[var(--nua-line)] bg-[var(--nua-white)] text-[var(--nua-charcoal)]"
                  : "border-[var(--nua-line-dark)] bg-[var(--nua-charcoal-deep)]/80 text-[var(--nua-white)]"
              } ${view === "tour" && desktop ? "lg:mr-[440px]" : ""}`}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                close
              </span>
            </button>
          </div>

          {/* ---------- Viewing panel ---------- */}
          {view === "tour" && current && (
            <aside
              className="absolute inset-0 z-10 flex flex-col bg-[var(--nua-white)] text-[var(--nua-charcoal)] lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[440px] lg:border-l lg:border-[var(--nua-line)]"
              {...swipeHandlers}
            >
              <div className="flex-1 overflow-y-auto pt-[68px] lg:pt-[72px]">
                {/* Mobile progress lives in the panel, below the top bar. */}
                <div className="flex flex-col items-center gap-1.5 px-5 pb-3 lg:hidden">
                  <ProgressLabel index={index} total={total} tone="light" />
                </div>

                <button
                  type="button"
                  onClick={() => setZoomed(true)}
                  aria-label={t("Zoom into the artwork")}
                  className="relative block aspect-[4/5] w-full cursor-zoom-in bg-[var(--nua-white)] lg:aspect-square"
                >
                  <Image
                    key={current.id}
                    src={current.image}
                    alt={current.title}
                    fill
                    sizes="(max-width: 1023px) 100vw, 440px"
                    className="object-contain"
                    priority
                  />
                </button>

                <div className="px-5 pb-8 pt-6 sm:px-7">
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--nua-grey)]">{roomTitle(current.zone)}</p>
                  <h2 className="mt-2 font-display text-[28px] leading-tight text-[var(--nua-charcoal)]">{current.title}</h2>
                  {current.artistSlug ? (
                    <Link href={`/artists/${current.artistSlug}`} className="mt-1 inline-block text-lg text-[var(--nua-red)] hover:text-[var(--nua-red-dark)]">
                      {current.artist}
                    </Link>
                  ) : (
                    <p className="mt-1 text-lg">{current.artist}</p>
                  )}
                  {current.description && (
                    <p className="mt-4 text-[18px] leading-[1.6] text-[var(--nua-charcoal)]">{shortStory(current.description)}</p>
                  )}
                  <dl className="mt-5 space-y-1 text-base text-[var(--nua-grey)]">
                    {current.medium && (
                      <div>
                        <dt className="sr-only">{t("Materials")}</dt>
                        <dd>{t(current.medium)}</dd>
                      </div>
                    )}
                    {current.dimensions && (
                      <div>
                        <dt className="sr-only">{t("Dimensions")}</dt>
                        <dd>{formatDimensions(current.dimensions)}</dd>
                      </div>
                    )}
                  </dl>
                  {current.slug && (
                    <button
                      type="button"
                      onClick={() => setEnquiryOpen(true)}
                      className="btn-primary mt-7 min-h-[48px] w-full px-6 text-base font-semibold"
                    >
                      {t("Enquire about this work")}
                    </button>
                  )}
                </div>
              </div>

              <nav className="grid grid-cols-2 border-t border-[var(--nua-line)] bg-[var(--nua-white)]" aria-label={t("Tour navigation")}>
                <button
                  type="button"
                  onClick={previous}
                  disabled={index === 0}
                  className="flex min-h-[56px] items-center justify-center gap-2 text-base disabled:text-[var(--nua-grey-light)]"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    arrow_back
                  </span>
                  {t("Previous artwork")}
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="flex min-h-[56px] items-center justify-center gap-2 border-l border-[var(--nua-line)] text-base"
                >
                  {t("Next artwork")}
                  <span className="material-symbols-outlined" aria-hidden="true">
                    arrow_forward
                  </span>
                </button>
              </nav>
            </aside>
          )}

          {/* ---------- Grid ---------- */}
          {view === "grid" && (
            <div className="absolute inset-0 z-10 overflow-y-auto bg-[var(--nua-white)] text-[var(--nua-charcoal)]">
              <div className="mx-auto max-w-container-max px-4 pb-28 pt-20 sm:px-8">
                <h2 className="font-display text-3xl">{t("All artworks")}</h2>
                <p className="mt-1 text-base text-[var(--nua-grey)]">{t("{count} works in the tour", { count: total })}</p>
                <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
                  {artworks.map((a, i) => (
                    <li key={a.id}>
                      <button type="button" onClick={() => openTour(i)} className="group block w-full text-left">
                        <span className="relative block aspect-square bg-[var(--nua-paper)]">
                          <Image src={a.image} alt={a.title} fill sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw" className="object-contain p-2" loading={i < 8 ? "eager" : "lazy"} />
                          {i === index && <span className="absolute inset-x-0 bottom-0 h-[3px] bg-[var(--nua-red)]" aria-hidden="true" />}
                        </span>
                        <span className="mt-2 block text-base leading-snug group-hover:underline">{a.title}</span>
                        <span className="block text-sm text-[var(--nua-grey)]">{a.artist}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* ---------- End of the tour ---------- */}
          {view === "end" && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--nua-charcoal-deep)]/95 px-6">
              <div className="max-w-md text-center">
                <h2 className="font-display text-4xl">{t("You have seen every work")}</h2>
                <p className="mt-3 text-lg text-[var(--nua-grey-light)]">{t("Thank you for taking your time with the work.")}</p>
                <div className="mt-8 flex flex-col gap-3">
                  <button type="button" onClick={() => openTour(0)} className="btn-primary min-h-[48px] px-6 text-base font-semibold">
                    {t("Start again")}
                  </button>
                  <Link href="/artists" className="flex min-h-[48px] items-center justify-center border border-[var(--nua-white)]/85 px-6 text-base text-[var(--nua-white)] hover:bg-[var(--nua-white)] hover:text-[var(--nua-charcoal)]">
                    {t("Meet the artists")}
                  </Link>
                  <button type="button" onClick={() => setView("grid")} className="min-h-[44px] text-base text-[var(--nua-white)]/85 underline underline-offset-4">
                    {t("Enquire about a work")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ---------- Zoom ---------- */}
          {zoomed && current && <ZoomView artwork={current} onClose={() => setZoomed(false)} />}

          <MusicControl
            tone={view === "grid" ? "light" : "dark"}
            className={
              view === "tour"
                ? "bottom-[68px] right-3 items-end lg:bottom-4 lg:left-4 lg:right-auto lg:items-start"
                : view === "free"
                  ? "bottom-4 right-4 items-end"
                  : undefined
            }
          />
        </div>
      )}

      {current && current.slug && (
        <EnquiryModal
          open={enquiryOpen}
          onClose={() => setEnquiryOpen(false)}
          artworkSlug={current.slug}
          artworkTitle={current.title}
          artistName={current.artist}
          artworkImage={current.image}
        />
      )}

      {editingRooms && <RoomTitlesEditor initial={roomTitles} onClose={() => setEditingRooms(false)} />}
    </main>
  );
}

function ProgressLabel({ index, total, tone = "dark" }: { index: number; total: number; tone?: "dark" | "light" }) {
  const { t } = useLanguage();
  return (
    <>
      <span className={`text-sm ${tone === "dark" ? "text-[var(--nua-white)]" : "text-[var(--nua-grey)]"}`}>
        {t("Artwork {current} of {total}", { current: index + 1, total })}
      </span>
      <span
        className={`block h-[2px] w-40 ${tone === "dark" ? "bg-[var(--nua-line-dark)]" : "bg-[var(--nua-line)]"}`}
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={index + 1}
      >
        <span className="block h-full bg-[var(--nua-red)] transition-[width] duration-300" style={{ width: `${((index + 1) / total) * 100}%` }} />
      </span>
    </>
  );
}

/** Full-screen view of one artwork on white. Tap to zoom in at that point;
 * pinch works too (the page allows pinch-zoom here). */
function ZoomView({ artwork, onClose }: { artwork: Artwork; onClose: () => void }) {
  const { t } = useLanguage();
  const [origin, setOrigin] = useState<string | null>(null);
  return (
    <div className="absolute inset-0 z-30 overflow-auto bg-[var(--nua-white)]" style={{ touchAction: "pinch-zoom" }}>
      <button
        type="button"
        onClick={(e) => {
          if (origin) return setOrigin(null);
          const r = e.currentTarget.getBoundingClientRect();
          setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
        }}
        aria-label={origin ? t("Zoom out") : t("Zoom in")}
        className={`relative block h-full w-full overflow-hidden ${origin ? "cursor-zoom-out" : "cursor-zoom-in"}`}
      >
        <Image
          src={artwork.image}
          alt={artwork.title}
          fill
          sizes="100vw"
          className="object-contain transition-transform duration-300"
          style={{ transform: origin ? "scale(2.2)" : undefined, transformOrigin: origin ?? undefined }}
        />
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label={t("Close")}
        className="fixed right-4 top-4 flex h-11 w-11 items-center justify-center border border-[var(--nua-line)] bg-[var(--nua-white)] text-[var(--nua-charcoal)] shadow-lg"
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          close
        </span>
      </button>
    </div>
  );
}
