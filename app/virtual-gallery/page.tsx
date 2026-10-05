"use client";

import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import type { Artwork } from "@/components/three/VirtualMuseum";
import { useTheme } from "@/lib/theme";
import { getPublishedArtworks } from "@/lib/data/supabase-artists";
import { layoutArtworks, FALLBACK_ARTWORKS } from "@/lib/data/museum-layout";
import { useLanguage } from "@/lib/i18n";

const VirtualMuseum = lazy(() => import("@/components/three/VirtualMuseum"));



const ZONES = [
  { id: 1, label: "ZONE 01: ANCESTRAL ROOTS", map: { left: "50%", top: "75%" } },
  { id: 2, label: "ZONE 02: URBAN RHYTHM", map: { left: "20%", top: "50%" } },
  { id: 3, label: "ZONE 03: WOVEN THREADS", map: { left: "80%", top: "50%" } },
  { id: 4, label: "ZONE 04: DIGITAL HORIZONS", map: { left: "50%", top: "20%" } },
] as const;

function MobileMuseumPreview({ artworks }: { artworks: Artwork[] }) {
  return (
    <div className="md:hidden border border-primary/10 bg-primary p-4">
      <p className="font-label-caps text-[10px] tracking-[0.22em] text-secondary mb-2">MOBILE MUSEUM</p>
      <p className="text-sm text-beige/80 mb-4">Browse the current exhibition. The immersive walk-through is available on larger screens.</p>
      <div className="grid grid-cols-2 gap-3">
        {artworks.slice(0, 4).map((artwork) => (
          <article
            key={artwork.id}
            className="group overflow-hidden border border-beige/20 bg-primary"
          >
            <div className="relative aspect-[4/5] bg-surface-container">
              <Image src={artwork.image} alt={artwork.title} fill sizes="50vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
            </div>
            <div className="p-3">
              <p className="font-label-caps text-[9px] tracking-[0.12em] text-secondary truncate">{artwork.artist}</p>
              <p className="mt-1 text-sm font-semibold text-beige line-clamp-2">{artwork.title}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function VirtualGalleryContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const country = searchParams.get("country") ?? undefined;
  // TODO(backend): when a `country` search param is present, fetch the
  // country-scoped artwork set from the backend and pass it to <VirtualMuseum />.
  // For now we render the full curated set and only surface the country label
  // in the hero so the front-end wiring is ready.
  const countryLabel = country
    ? country.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
    : null;
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [activeZone, setActiveZone] = useState(1);
  const [zoneTarget, setZoneTarget] = useState<number | null>(null);
  const [selected, setSelected] = useState<Artwork | null>(null);
  const [keys, setKeys] = useState<Record<string, boolean>>({});
  const [artworks, setArtworks] = useState<Artwork[]>(FALLBACK_ARTWORKS);
  const [progress, setProgress] = useState({ loaded: 0, total: FALLBACK_ARTWORKS.length, errors: 0 });
  const [zonesCollapsed, setZonesCollapsed] = useState(false);

  // Real artworks are placed by formula (layoutArtworks), not by hand.
  // Falls back to the curated demo set when Supabase has nothing published yet.
  useEffect(() => {
    let cancelled = false;
    getPublishedArtworks().then((data) => {
      if (cancelled || data.length === 0) return;
      const placed = layoutArtworks(data);
      setArtworks(placed);
      setProgress({ loaded: 0, total: placed.length, errors: 0 });
    });
    return () => {
      cancelled = true;
    };
  }, []);


  const handleZoneClick = (id: number) => {
    setActiveZone(id);
    setZoneTarget(id);
  };

  const handleFullscreen = () => {
    const el = document.getElementById("explorer-3d-root");
    if (!document.fullscreenElement) el?.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  const onKeysChange = useCallback((k: Record<string, boolean>) => setKeys(k), []);
  const activeZoneData = ZONES.find((z) => z.id === activeZone)!;

  // Theme-aware panel style tokens
  const panelBg = isDark ? "rgba(7,10,13,0.82)" : "rgba(245,242,238,0.88)";
  const panelBgSoft = isDark ? "rgba(7,10,13,0.72)" : "rgba(245,242,238,0.85)";
  const panelBorder = isDark ? "1px solid rgba(245,242,238,0.10)" : "1px solid rgba(17,17,17,0.10)";
  const textPrimary = isDark ? "#F5F2EE" : "#111111";
  const textSecondary = isDark ? "#D9D2CC" : "#4B5560";
  const accent = "#9F0D12";


  return (
    <main>
      <section className="relative h-screen flex items-center justify-center overflow-hidden bg-primary w-screen mx-[calc(50%-50vw)]">
        <div className="absolute inset-0 z-0">
          <div
            className="w-full h-full opacity-70 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://nu-artcollective.lovable.app/__l5e/assets-v1/8fb36909-f581-4701-9e44-3a179fcb76d5/afr-ceramic.jpg')",
            }}
          />
        </div>
        <div className="relative z-10 text-center px-gutter-page max-w-4xl">
          <h2 className="font-label-caps text-label-caps text-background/80 mb-4 tracking-[0.3em]">
            {countryLabel ? `${t("VIRTUAL EXHIBITION")} — ${countryLabel.toUpperCase()}` : t("VIRTUAL EXHIBITION")}
          </h2>
          <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-beige mb-6 uppercase tracking-tighter">
            {t("THE VIRTUAL")} <br />
            {t("MUSEUM")}
          </h1>
          <p className="font-body-lg text-body-lg text-background/90 mb-10 max-w-2xl mx-auto leading-relaxed">
            {countryLabel
              ? `A curated walk through contemporary works from ${countryLabel} — a country-specific selection served by the NUA-ARTE archive.`
              : t("A living archive of contemporary African creativity. Move through four thematic halls — from ancestral roots to digital futures — and experience the breadth of the continent's visual imagination.")}
          </p>

          <div className="flex flex-wrap justify-center items-center gap-6">
            <a
              href="#explorer-root"
              className="bg-beige text-primary px-10 py-4 font-navigation text-navigation uppercase tracking-[0.1em] hover:bg-secondary hover:text-beige transition-all duration-300"
            >
              {t("Enter Virtual Museum")}
            </a>
          </div>
        </div>
      </section>

      <section className="bg-surface-container py-12 px-gutter-page">
        <div className="max-w-container-max mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
            <div>
              <h4 className="font-label-caps text-label-caps text-secondary mb-2">
                {t("IMMERSIVE EXPERIENCE")}
              </h4>
              <h2 className="font-headline-sm text-headline-sm uppercase tracking-tight">
                {t("Virtual Museum Explorer")}
              </h2>
            </div>
          </div>

          <div id="explorer-root">
          <div
            className="relative hidden md:block aspect-video w-full bg-black group overflow-hidden border border-primary/10 shadow-2xl"
            id="explorer-3d-root"
          >
            <Suspense
              fallback={
                <div className="absolute inset-0 flex items-center justify-center text-beige/60 font-label-caps text-[10px]">
                  {t("LOADING MUSEUM…")}
                </div>
              }
            >
              <VirtualMuseum
                artworks={artworks}
                zoneTarget={zoneTarget}
                onZoneReached={() => setZoneTarget(null)}
                onSelectArtwork={(a) => setSelected(a)}
                onKeysChange={onKeysChange}
                onLoadProgress={(loaded, total, errors) =>
                  setProgress({ loaded, total, errors })
                }
              />
            </Suspense>

            <div className="absolute inset-0 flex flex-col justify-between p-4 md:p-6 pointer-events-none z-20 gap-4">
              <div className="flex justify-between items-start gap-3 pointer-events-auto">
                <div
                  className="px-4 py-2.5 backdrop-blur-md shadow-2xl"
                  style={{ background: panelBg, border: panelBorder, borderLeft: `2px solid ${accent}`, color: textPrimary }}
                >
                  <span className="font-label-caps text-[10px] block tracking-[0.2em]" style={{ color: textSecondary }}>
                    {t("CURRENT LOCATION")}
                  </span>
                  <span className="font-headline-sm text-sm md:text-base uppercase tracking-wide">
                    {t(activeZoneData.label)}
                  </span>
                </div>
                <div className="flex gap-2 items-stretch">
                  <div
                    className="hidden sm:block px-3 py-2 backdrop-blur-md shadow-2xl"
                    style={{ background: panelBg, border: panelBorder, borderLeft: `2px solid ${accent}`, color: textPrimary }}
                  >
                    <span className="font-label-caps text-[9px] block tracking-[0.2em]" style={{ color: textSecondary }}>
                      {t("ARTWORKS LOADED")}
                    </span>
                    <span className="font-label-caps text-[11px]">
                      {progress.loaded} / {progress.total}
                      {progress.errors > 0 && (
                        <span className="ml-2" style={{ color: accent }}>· {progress.errors} ERR</span>
                      )}
                    </span>
                  </div>
                  <button
                    onClick={handleFullscreen}
                    aria-label={t("Toggle fullscreen")}
                    className="w-10 h-10 backdrop-blur-md flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2"
                    style={{ background: panelBg, border: panelBorder, color: textPrimary }}
                  >
                    <span className="material-symbols-outlined">fullscreen</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 w-full md:w-fit pointer-events-auto md:max-w-xs">
                <button
                  onClick={() => setZonesCollapsed((v) => !v)}
                  className="hidden md:flex px-3 py-1.5 font-label-caps text-[9px] tracking-[0.2em] backdrop-blur-md items-center justify-between w-full md:w-60 focus:outline-none focus-visible:ring-2"
                  style={{ background: panelBgSoft, border: panelBorder, color: textSecondary, borderLeft: `2px solid ${accent}` }}
                  aria-expanded={!zonesCollapsed}
                >
                  <span>{t("ZONES")}</span>
                  <span className="material-symbols-outlined text-[14px]">
                    {zonesCollapsed ? "expand_more" : "expand_less"}
                  </span>
                </button>
                {(!zonesCollapsed || undefined) && ZONES.map((z) => {
                  const active = z.id === activeZone;
                  return (
                    <button
                      key={z.id}
                      onClick={() => handleZoneClick(z.id)}
                      className="px-4 py-2.5 font-label-caps text-[10px] text-left transition-all w-full md:w-60 shadow-lg flex items-center justify-between backdrop-blur-md focus:outline-none focus-visible:ring-2 tracking-[0.15em]"
                      style={{
                        background: active ? accent : panelBgSoft,
                        color: active ? "#F5F2EE" : textPrimary,
                        border: active ? "none" : panelBorder,
                        borderLeft: `2px solid ${active ? "#F5F2EE" : "rgba(159,13,18,0.6)"}`,
                      }}
                    >
                      <span>{t(z.label)}</span>
                      {active && <span className="material-symbols-outlined text-xs">east</span>}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between items-end gap-3 pointer-events-auto">
                <div
                  className="hidden md:flex items-center gap-6 p-3 backdrop-blur-md shadow-2xl"
                  style={{ background: panelBg, border: panelBorder, borderLeft: `2px solid ${accent}`, color: textPrimary }}
                >
                  <div className="flex gap-1">
                    {(["w", "a", "s", "d"] as const).map((k) => {
                      const pressed =
                        keys[k] ||
                        keys[`arrow${k === "w" ? "up" : k === "s" ? "down" : k === "a" ? "left" : "right"}`];
                      return (
                        <span
                          key={k}
                          className="w-8 h-8 border flex items-center justify-center text-[10px] font-label-caps transition-colors"
                          style={{
                            background: pressed ? accent : (isDark ? "rgba(245,242,238,0.06)" : "rgba(17,17,17,0.05)"),
                            borderColor: pressed ? accent : (isDark ? "rgba(245,242,238,0.25)" : "rgba(17,17,17,0.2)"),
                            color: pressed ? "#F5F2EE" : textPrimary,
                          }}
                        >
                          {k.toUpperCase()}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div
                  className="hidden md:block w-32 h-32 backdrop-blur-md p-3 relative overflow-hidden shadow-2xl"
                  style={{ background: panelBg, border: panelBorder, borderLeft: `2px solid ${accent}` }}
                >
                  <div
                    className="relative w-full h-full"
                    style={{ border: isDark ? "1px solid rgba(245,242,238,0.15)" : "1px solid rgba(17,17,17,0.15)" }}
                  >
                    <div
                      className="absolute top-1.5 left-1.5 font-label-caps text-[8px] tracking-[0.2em]"
                      style={{ color: textSecondary }}
                    >
                      {t("MAP · VIEW")}
                    </div>
                    {/* Mid partition wall indicator */}
                    <span
                      className="absolute pointer-events-none rounded-full"
                      style={{
                        left: "31.5%",
                        top: "45%",
                        width: "2px",
                        height: "38%",
                        background: isDark ? "rgba(245,242,238,0.28)" : "rgba(17,17,17,0.22)",
                      }}
                    />
                    {ZONES.map((z) => {
                      const active = z.id === activeZone;
                      return (
                        <span
                          key={z.id}
                          className="absolute rounded-full -translate-x-1/2 -translate-y-1/2"
                          style={{
                            ...z.map,
                            width: active ? 12 : 6,
                            height: active ? 12 : 6,
                            background: active ? accent : textSecondary,
                            boxShadow: active ? `0 0 12px ${accent}` : "none",
                            animation: active ? "pulse 1.6s ease-in-out infinite" : undefined,
                          }}
                        />
                      );
                    })}
                    {/* Visitor orientation pointer at active zone */}
                    {(() => {
                      const z = ZONES.find((x) => x.id === activeZone)!;
                      return (
                        <span
                          className="absolute -translate-x-1/2 -translate-y-1/2"
                          style={{
                            ...z.map,
                            width: 0,
                            height: 0,
                            borderLeft: "4px solid transparent",
                            borderRight: "4px solid transparent",
                            borderBottom: `7px solid ${accent}`,
                            transform: "translate(-50%, -140%)",
                          }}
                        />
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {selected && (
              <div
                className="absolute top-0 right-0 h-full w-full sm:w-80 backdrop-blur-md p-6 z-30 overflow-y-auto pointer-events-auto"
                style={{
                  background: isDark ? "rgba(7,10,13,0.92)" : "rgba(245,242,238,0.94)",
                  border: panelBorder,
                  borderLeft: `2px solid ${accent}`,
                  color: textPrimary,
                }}
              >
                <button
                  onClick={() => setSelected(null)}
                  aria-label="Close artwork details"
                  className="absolute top-4 right-4 transition-colors focus:outline-none focus-visible:ring-2"
                  style={{ color: textSecondary }}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
                <div className="relative w-full aspect-square mb-4" style={{ background: "#ede5db" }}>
                  <Image
                    src={selected.image}
                    alt={selected.title}
                    fill
                    sizes="320px"
                    className="object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
                    }}
                  />
                </div>
                <span className="font-label-caps text-[10px] tracking-[0.25em]" style={{ color: accent }}>
                  {selected.artist}
                </span>
                <h3 className="font-headline-sm text-xl uppercase mt-2 mb-3 tracking-wide" style={{ color: textPrimary }}>
                  {selected.title}
                </h3>
                <div className="h-px w-12 mb-3" style={{ background: accent }} />
                {(selected.year || selected.medium) && (
                  <p className="font-label-caps text-[10px] tracking-[0.15em] mb-4" style={{ color: textSecondary }}>
                    {[selected.year, selected.medium].filter(Boolean).join(" · ")}
                  </p>
                )}
                <p className="font-body-md text-sm leading-relaxed" style={{ color: textSecondary }}>
                  {selected.description}
                </p>
              </div>
            )}

          </div>
          <MobileMuseumPreview artworks={artworks} />
          </div>
        </div>
      </section>

      <section className="py-section-gap px-gutter-page bg-background text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-headline-sm text-headline-sm mb-6 uppercase tracking-widest">
            {t("Connect with the Curators")}
          </h2>
          <p className="font-body-md text-on-surface-variant mb-12">
            {t("Our curators are available for virtual consultations regarding any of the featured works in the Virtual Museum collection.")}
          </p>
        </div>
      </section>
    </main>
  );
}

export default function VirtualGalleryPage() {
  return (
    <Suspense>
      <VirtualGalleryContent />
    </Suspense>
  );
}
