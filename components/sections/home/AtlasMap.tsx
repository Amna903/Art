"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { geoConicEqualArea, geoPath } from "d3-geo";
import africaGeo from "@/lib/data/africa-geo.json";
import { ISLAND_PINS, getCountryByGeoName, getCountryBySlug } from "@/lib/data/africa";
import { buildCountryShards, type CountryInput, type Shard } from "@/lib/data/africa-shards";
import { useCountrySoundUrls } from "@/lib/data/country-sounds";
import "@/components/map/clay-atlas.css";

const W = 1000;
const H = 1000;

type FeatureLike = {
  type: "Feature";
  properties: { ADMIN: string; ISO_A3: string };
  geometry: GeoJSON.Geometry;
};

// 9 Featured countries for the right directory panel
const FEATURED_SLUGS = [
  "cabo-verde",
  "senegal",
  "morocco",
  "ghana",
  "nigeria",
  "kenya",
  "south-africa",
  "ethiopia",
  "angola",
];

// Left vertical navigation links
const NAV_ITEMS = [
  { label: "EXPLORE AFRICA", href: "#atlas", active: true },
  { label: "ARTISTS", href: "/artists" },
  { label: "ARTWORKS", href: "/artists" },
  { label: "STORIES", href: "/journal" },
  { label: "EXHIBITIONS", href: "/exhibitions" },
  { label: "COLLECTORS", href: "/collections" },
  { label: "ABOUT US", href: "/about" },
];

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function playCountryCue(slug: string, ctx: AudioContext, master: GainNode) {
  const seed = hashStr(slug);
  const rand = (n: number) => ((seed >> n) & 0xff) / 255;

  const scale = [130.81, 155.56, 174.61, 196.0, 233.08, 261.63, 311.13, 349.23];
  const base = scale[seed % scale.length];
  const partial = 1 + rand(3) * 0.6;
  const detune = (rand(5) - 0.5) * 12;

  const now = ctx.currentTime;
  const dur = 1.8;

  const osc1 = ctx.createOscillator();
  osc1.type = rand(7) > 0.5 ? "triangle" : "sine";
  osc1.frequency.value = base;
  osc1.detune.value = detune;

  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.value = base * partial;
  osc2.detune.value = -detune;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.45, now + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1200 + rand(11) * 1400;
  filter.Q.value = 4;

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(g);
  g.connect(master);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + dur + 0.05);
  osc2.stop(now + dur + 0.05);
}

type AtlasStats = {
  artists: number;
  artworks: number;
};

export function AfricaMapSection({ stats }: { stats: AtlasStats }) {
  const router = useRouter();
  const features = (africaGeo as unknown as { features: FeatureLike[] }).features;

  const projection = useMemo(() => {
    const p = geoConicEqualArea()
      .rotate([-20, 0])
      .parallels([-15, 30]);
    p.fitExtent(
      [
        [65, 55],
        [W - 65, H - 55],
      ],
      { type: "FeatureCollection", features } as unknown as GeoJSON.FeatureCollection,
    );
    return p;
  }, [features]);
  const path = useMemo(() => geoPath(projection), [projection]);

  // Build continental country 3D pieces with exact borders and custom reference palettes
  const shards = useMemo<Shard[]>(() => {
    const inputs: CountryInput[] = [];
    features.forEach((f) => {
      const c = getCountryByGeoName(f.properties.ADMIN);
      if (!c) return;
      const d = path(f as unknown as GeoJSON.Feature);
      if (!d) return;
      const centroid = path.centroid(f as unknown as GeoJSON.Feature);
      const bounds = path.bounds(f as unknown as GeoJSON.Feature);
      if (!Number.isFinite(centroid[0]) || !Number.isFinite(bounds[0][0])) return;
      inputs.push({
        slug: c.slug,
        path: d,
        centroid: [centroid[0], centroid[1]],
        bbox: [bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1]],
      });
    });
    return buildCountryShards(inputs);
  }, [features, path]);

  // Island droplet pins
  const islands = useMemo(() => {
    return Object.entries(ISLAND_PINS)
      .map(([slug, [lon, lat]]) => {
        const pt = projection([lon, lat]);
        if (!pt) return null;
        const seed = slug.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
        return { slug, x: pt[0], y: pt[1], seed };
      })
      .filter(Boolean) as { slug: string; x: number; y: number; seed: number }[];
  }, [projection]);

  const shardMap = useMemo(() => {
    const map = new Map<string, Shard>();
    shards.forEach((s) => map.set(s.slug, s));
    return map;
  }, [shards]);

  // Active hovered/selected country slug (defaults to Cabo Verde)
  const [activeSlug, setActiveSlug] = useState<string>("cabo-verde");
  const [soundOn, setSoundOn] = useState(true);
  const audioRef = useRef<{ ctx: AudioContext; master: GainNode } | null>(null);
  const lastHoverRef = useRef<string | null>(null);
  const uploadedSounds = useCountrySoundUrls();
  const htmlAudioRef = useRef<HTMLAudioElement | null>(null);

  const ensureAudio = () => {
    if (audioRef.current) return audioRef.current;
    if (typeof window === "undefined") return null;
    const AC =
      (window.AudioContext as typeof AudioContext) ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = 0.4;
    master.connect(ctx.destination);
    audioRef.current = { ctx, master };
    return audioRef.current;
  };

  const stopUploadedAudio = () => {
    if (!htmlAudioRef.current) return;
    htmlAudioRef.current.pause();
    htmlAudioRef.current.currentTime = 0;
    htmlAudioRef.current = null;
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    if (!next) stopUploadedAudio();
  };

  const triggerCue = (slug: string) => {
    if (!soundOn) return;
    stopUploadedAudio();

    const uploaded = uploadedSounds[slug];
    if (uploaded) {
      const el = new Audio(uploaded);
      el.volume = 0.8;
      el.play().catch(() => {});
      htmlAudioRef.current = el;
      return;
    }

    const a = ensureAudio();
    if (!a) return;
    if (a.ctx.state === "suspended") a.ctx.resume();
    playCountryCue(slug, a.ctx, a.master);
  };

  const handleCountryHover = (slug: string) => {
    setActiveSlug(slug);
    if (lastHoverRef.current !== slug) {
      lastHoverRef.current = slug;
      triggerCue(slug);
    }
  };

  const handleCountryLeave = () => {
    lastHoverRef.current = null;
    stopUploadedAudio();
  };

  const enterCountry = (slug: string) => {
    stopUploadedAudio();
    router.push(`/discover/${slug}`);
  };

  const activeCountry = getCountryBySlug(activeSlug) || getCountryBySlug("cabo-verde")!;
  const activeShard = shardMap.get(activeSlug);

  const featuredCountries = FEATURED_SLUGS.map((slug) => getCountryBySlug(slug)).filter(
    (c): c is NonNullable<typeof c> => Boolean(c)
  );

  const activePoint = useMemo(() => {
    if (activeShard) {
      return { x: activeShard.centroid[0], y: activeShard.centroid[1] };
    }
    const island = islands.find((i) => i.slug === activeSlug);
    if (island) {
      return { x: island.x, y: island.y };
    }
    return { x: 180, y: 440 };
  }, [activeShard, islands, activeSlug]);

  return (
    <section
      id="atlas"
      className="nu-atlas relative w-screen mx-[calc(50%-50vw)] py-12 md:py-20 overflow-hidden font-sans select-none"
      style={{
        backgroundColor: "var(--atlas-bg)",
        color: "var(--atlas-fg)",
      }}
    >
      {/* Soft Background Radial Lighting */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none nu-atlas-bg"
      />

      {/* Main Container */}
      <div className="relative max-w-[1440px] mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-[260px_1fr_340px] gap-8 lg:gap-12 items-center min-h-[700px]">
        
        {/* LEFT COLUMN: Brand Identity, Vertical Timeline Navigation & Country Callout */}
        <div className="flex flex-col justify-between h-full space-y-8 z-10 self-stretch py-2">
          {/* Logo Branding */}
          <div>
            <h2 className="font-serif text-2xl md:text-3xl tracking-[0.25em] font-light uppercase" style={{ color: "var(--atlas-fg)" }}>
              NU <span className="inline-block mx-1 text-xs opacity-40 font-sans">—</span> ARTE
            </h2>
            <span
              className="block font-mono text-[9px] tracking-[0.45em] uppercase mt-1 font-semibold"
              style={{ color: "var(--atlas-accent)" }}
            >
              CURATED AFRICAN ART
            </span>
          </div>

          {/* Left Vertical Timeline Navigation */}
          <div className="relative flex flex-col space-y-5 my-auto pl-2">
            <div
              className="absolute left-[7.5px] top-2 bottom-2 w-px pointer-events-none"
              style={{ backgroundColor: "var(--atlas-border-strong)" }}
            />

            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="group flex items-center gap-3.5 text-[11px] tracking-[0.24em] uppercase font-mono transition-all relative z-10"
              >
                {/* Dot Indicator */}
                <span
                  className="w-3.5 h-3.5 rounded-full transition-all duration-300 flex items-center justify-center border shadow-xs"
                  style={{
                    backgroundColor: item.active ? "var(--atlas-accent)" : "var(--atlas-card-bg)",
                    borderColor: item.active ? "var(--atlas-accent)" : "var(--atlas-border-strong)",
                  }}
                >
                  {item.active && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--atlas-bg)" }} />}
                </span>

                <span
                  className="transition-colors"
                  style={{
                    color: item.active ? "var(--atlas-accent)" : "var(--atlas-fg-muted)",
                    fontWeight: item.active ? 600 : 400,
                  }}
                >
                  {item.label}
                </span>
              </a>
            ))}
          </div>

          {/* Floating Callout Card for Active Country */}
          <div
            className="p-4 border rounded-sm transition-all duration-300 shadow-xs"
            style={{
              borderColor: "var(--atlas-border-strong)",
              backgroundColor: "var(--atlas-card-bg)",
            }}
          >
            <div className="flex items-center justify-between text-[11px] font-mono tracking-[0.22em] uppercase mb-2" style={{ color: "var(--atlas-accent)" }}>
              <div className="flex items-center gap-2 font-bold">
                <span className="text-base leading-none">⤤</span>
                <span>{activeCountry.name}</span>
              </div>
              <span className="text-sm">{activeCountry.flag}</span>
            </div>
            <p className="text-xs leading-relaxed font-light italic min-h-[48px]" style={{ color: "var(--atlas-fg-muted)" }}>
              &ldquo;{activeCountry.blurb}&rdquo;
            </p>
            <button
              type="button"
              onClick={() => enterCountry(activeCountry.slug)}
              className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-mono tracking-[0.2em] uppercase font-semibold transition-colors hover:underline"
              style={{ color: "var(--atlas-accent)" }}
            >
              Explore Artists & Works →
            </button>
          </div>
        </div>

        {/* CENTER COLUMN: 3D Sculptural Africa Relief Map */}
        <div className="relative flex items-center justify-center w-full h-full min-h-[560px] lg:min-h-[680px]">
          {/* Audio Control */}
          <button
            type="button"
            onClick={toggleSound}
            aria-label={soundOn ? "Mute audio" : "Unmute audio"}
            className="absolute top-0 right-0 z-20 flex items-center gap-2 px-3.5 py-1.5 border rounded text-[10px] font-mono tracking-[0.2em] uppercase transition-all shadow-xs backdrop-blur-sm"
            style={{
              backgroundColor: "var(--atlas-card-bg)",
              borderColor: "var(--atlas-border)",
              color: soundOn ? "var(--atlas-accent)" : "var(--atlas-fg-muted)",
            }}
          >
            <span className="material-symbols-outlined text-[15px]">
              {soundOn ? "volume_up" : "volume_off"}
            </span>
            <span className="font-medium">{soundOn ? "Sound On" : "Muted"}</span>
          </button>

          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto max-h-[680px] block select-none"
            role="img"
            aria-label="3D Sculptural Clay & Wood Map of Africa"
            onMouseLeave={handleCountryLeave}
          >
            <defs>
              {/* Soft Multi-Layer Cast Drop Shadows */}
              <filter id="clayShadowDefault" x="-30%" y="-30%" width="170%" height="170%">
                <feDropShadow dx="2.5" dy="6" stdDeviation="4.5" floodColor="var(--atlas-shadow-color)" floodOpacity="var(--atlas-shadow-opacity-a)" />
                <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodColor="#000000" floodOpacity="var(--atlas-shadow-opacity-b)" />
              </filter>
              <filter id="clayShadowActive" x="-40%" y="-40%" width="190%" height="190%">
                <feDropShadow dx="5" dy="12" stdDeviation="8" floodColor="var(--atlas-shadow-color)" floodOpacity="var(--atlas-shadow-active-a)" />
                <feDropShadow dx="1" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="var(--atlas-shadow-active-b)" />
              </filter>
              <filter id="islandShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="1.5" dy="3" stdDeviation="2" floodColor="var(--atlas-shadow-color)" floodOpacity="var(--atlas-shadow-opacity-a)" />
              </filter>

              {/* 135-degree Light Gradients for All Countries */}
              {shards.map((s) => (
                <linearGradient
                  key={`grad-${s.slug}`}
                  id={`clay-grad-${s.slug}`}
                  x1="15%"
                  y1="10%"
                  x2="85%"
                  y2="90%"
                >
                  <stop offset="0%" stopColor={s.palette.topLight} />
                  <stop offset="45%" stopColor={s.palette.topBase} />
                  <stop offset="100%" stopColor={s.palette.topDark} />
                </linearGradient>
              ))}
            </defs>

            {/* Connecting Pointer Line from active country centroid to floating left callout */}
            {activePoint && (
              <g pointerEvents="none" className="transition-all duration-300">
                <path
                  d={`M ${activePoint.x} ${activePoint.y} L ${Math.max(60, activePoint.x - 130)} ${activePoint.y + 45} L 15 ${activePoint.y + 45}`}
                  fill="none"
                  stroke="var(--atlas-accent)"
                  strokeWidth="1.4"
                  strokeDasharray="4 4"
                  opacity={0.8}
                />
                <circle cx={activePoint.x} cy={activePoint.y} r={4} fill="var(--atlas-accent)" />
                <circle cx={activePoint.x} cy={activePoint.y} r={7.5} fill="none" stroke="var(--atlas-accent)" strokeWidth="1" opacity={0.5} />
              </g>
            )}

            {/* 3D Relief Country Puzzle Pieces */}
            {shards.map((shard) => {
              const country = getCountryBySlug(shard.slug);
              if (!country) return null;
              const isActive = activeSlug === country.slug;

              return (
                <g
                  key={country.slug}
                  className={`nu-clay-piece ${isActive ? "is-active" : ""}`}
                  style={{
                    cursor: "pointer",
                    transformOrigin: `${shard.centroid[0]}px ${shard.centroid[1]}px`,
                    transform: isActive ? "translateY(-6px) scale(1.02)" : "translateY(0) scale(1)",
                    filter: isActive ? "url(#clayShadowActive)" : "url(#clayShadowDefault)",
                  }}
                  onMouseEnter={() => handleCountryHover(country.slug)}
                  onMouseLeave={handleCountryLeave}
                  onClick={() => enterCountry(country.slug)}
                  tabIndex={0}
                  role="button"
                  aria-label={country.name}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      enterCountry(country.slug);
                    }
                  }}
                >
                  {/* 3D Extrusion Side Walls */}
                  <path
                    d={shard.path}
                    transform="translate(0, 6)"
                    fill={shard.palette.sideDark}
                    stroke={shard.palette.sideDark}
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                    pointerEvents="none"
                  />
                  <path
                    d={shard.path}
                    transform="translate(0, 4)"
                    fill={shard.palette.sideMid}
                    stroke={shard.palette.sideMid}
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                    pointerEvents="none"
                  />
                  <path
                    d={shard.path}
                    transform="translate(0, 2)"
                    fill={shard.palette.sideMid}
                    stroke={shard.palette.sideMid}
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                    pointerEvents="none"
                  />
                  <path
                    d={shard.path}
                    transform="translate(0, 1)"
                    fill={shard.palette.sideMid}
                    stroke={shard.palette.sideMid}
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                    pointerEvents="none"
                  />

                  {/* Main Top Face with Reference Matte Finish */}
                  <path
                    d={shard.path}
                    fill={`url(#clay-grad-${shard.slug})`}
                    stroke={isActive ? "var(--atlas-accent)" : "rgba(25, 15, 10, 0.75)"}
                    strokeWidth={isActive ? 2.2 : 1.2}
                    strokeLinejoin="round"
                    className="nu-clay-top"
                  />

                  {/* Top Bevel Highlight (Reflective Rim) */}
                  <path
                    d={shard.path}
                    fill="none"
                    stroke={isActive ? "rgba(255, 255, 255, 0.85)" : shard.palette.bevelHighlight}
                    strokeWidth={0.75}
                    strokeLinejoin="round"
                    pointerEvents="none"
                  />

                  <title>{country.name}</title>
                </g>
              );
            })}

            {/* Island Droplet Pebble Pins */}
            {islands.map((isle) => {
              const country = getCountryBySlug(isle.slug);
              if (!country) return null;
              const isActive = activeSlug === isle.slug;
              const palette = shardMap.get(isle.slug)?.palette || {
                topLight: "#E8C59A",
                topBase: "#DEB484",
                topDark: "#C69966",
                sideDark: "#342215",
              };

              return (
                <g
                  key={isle.slug}
                  style={{
                    cursor: "pointer",
                    transformOrigin: `${isle.x}px ${isle.y}px`,
                    transition: "transform 0.25s ease",
                    transform: isActive ? "translateY(-4px) scale(1.2)" : "translateY(0) scale(1)",
                    filter: isActive ? "url(#clayShadowActive)" : "url(#islandShadow)",
                  }}
                  onMouseEnter={() => handleCountryHover(isle.slug)}
                  onMouseLeave={handleCountryLeave}
                  onClick={() => enterCountry(isle.slug)}
                  tabIndex={0}
                  role="button"
                  aria-label={country.name}
                >
                  <circle cx={isle.x} cy={isle.y} r={14} fill="transparent" />
                  {/* Bottom extrusion */}
                  <circle cx={isle.x} cy={isle.y + 2} r={isActive ? 6 : 4.5} fill={palette.sideDark} pointerEvents="none" />
                  {/* Top face */}
                  <circle
                    cx={isle.x}
                    cy={isle.y}
                    r={isActive ? 6 : 4.5}
                    fill={palette.topBase}
                    stroke={isActive ? "var(--atlas-accent)" : "rgba(35, 22, 14, 0.75)"}
                    strokeWidth={isActive ? 1.4 : 1}
                  />
                  {/* Specular highlight */}
                  <circle
                    cx={isle.x - (isActive ? 1.8 : 1.3)}
                    cy={isle.y - (isActive ? 1.8 : 1.3)}
                    r={isActive ? 1.8 : 1.3}
                    fill="rgba(255, 255, 255, 0.65)"
                    pointerEvents="none"
                  />
                  <title>{country.name}</title>
                </g>
              );
            })}
          </svg>
        </div>

        {/* RIGHT COLUMN: Kicker, Headline, Paragraph, Country Directory */}
        <div className="flex flex-col justify-between h-full space-y-6 z-10 self-stretch py-2">
          {/* Header */}
          <div>
            {/* Kicker */}
            <div className="mb-2">
              <span className="text-[9px] tracking-[0.38em] uppercase font-mono block font-bold" style={{ color: "var(--atlas-accent)" }}>
                ONE CONTINENT.
              </span>
              <span className="text-[9px] tracking-[0.38em] uppercase font-mono block mt-0.5 font-bold" style={{ color: "var(--atlas-accent)" }}>
                INFINITE VOICES.
              </span>
              <hr className="border-t w-8 mt-2" style={{ borderColor: "var(--atlas-accent)" }} />
            </div>

            {/* Title */}
            <h1 className="font-serif text-3xl lg:text-4xl leading-[1.15] font-light mt-3" style={{ color: "var(--atlas-fg)" }}>
              Explore Africa. <br />
              <span className="italic font-normal">Discover Art.</span>
            </h1>

            {/* Paragraph */}
            <p className="text-xs leading-relaxed mt-3 max-w-xs font-light" style={{ color: "var(--atlas-fg-muted)" }}>
              A curated platform dedicated to contemporary African artists. Each country, each culture, each story.
            </p>
          </div>

          <hr className="border-t" style={{ borderColor: "var(--atlas-border)" }} />

          {/* Interactive Country Directory List */}
          <div className="flex flex-col space-y-1.5 my-1">
            {featuredCountries.map((country) => {
              const isActive = activeSlug === country.slug;
              const shard = shardMap.get(country.slug);

              return (
                <div
                  key={country.slug}
                  onMouseEnter={() => handleCountryHover(country.slug)}
                  onMouseLeave={handleCountryLeave}
                  onClick={() => enterCountry(country.slug)}
                  className="group flex items-center justify-between py-2 px-3 rounded-sm transition-all cursor-pointer shadow-2xs"
                  style={{
                    backgroundColor: isActive ? "var(--atlas-card-bg-hover)" : "var(--atlas-card-bg)",
                    borderLeft: isActive ? "3px solid var(--atlas-accent)" : "3px solid transparent",
                    borderTop: "1px solid var(--atlas-border)",
                    borderRight: "1px solid var(--atlas-border)",
                    borderBottom: "1px solid var(--atlas-border)",
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Active Indicator Dot */}
                    <span
                      className={`w-2 h-2 rounded-full transition-all ${
                        isActive ? "scale-125" : "opacity-40"
                      }`}
                      style={{
                        backgroundColor: isActive ? "var(--atlas-accent)" : "var(--atlas-border-strong)",
                      }}
                    />

                    {/* Mini 3D Badge Shape */}
                    {shard ? (
                      <div className="w-5 h-5 flex items-center justify-center shrink-0 opacity-90 group-hover:opacity-100 transition-opacity">
                        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
                          <path
                            d={shard.path}
                            fill={isActive ? "var(--atlas-accent)" : shard.palette.topBase}
                            stroke="rgba(35, 22, 14, 0.65)"
                            strokeWidth={4}
                          />
                        </svg>
                      </div>
                    ) : (
                      <span className="text-xs">{country.flag}</span>
                    )}

                    <span
                      className="font-mono text-[11px] tracking-[0.2em] uppercase truncate transition-colors"
                      style={{
                        color: isActive ? "var(--atlas-fg)" : "var(--atlas-fg-muted)",
                        fontWeight: isActive ? 600 : 400,
                      }}
                    >
                      {country.name}
                    </span>
                  </div>

                  <span
                    className={`material-symbols-outlined text-[16px] transition-transform ${
                      isActive ? "translate-x-1" : "group-hover:translate-x-1"
                    }`}
                    style={{ color: "var(--atlas-accent)" }}
                  >
                    arrow_forward
                  </span>
                </div>
              );
            })}
          </div>

          {/* Bottom link: View All Countries */}
          <Link
            href="/map"
            className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.25em] uppercase transition-colors pt-2 font-semibold hover:underline"
            style={{ color: "var(--atlas-accent)" }}
          >
            VIEW ALL COUNTRIES
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>

      </div>

      {/* BOTTOM DIVIDED STATS BAR */}
      <div
        className="mt-14 pt-8 border-t max-w-[1440px] mx-auto px-6 md:px-12 grid grid-cols-2 md:grid-cols-5 gap-6 text-center md:text-left"
        style={{ borderColor: "var(--atlas-border)" }}
      >
        {/* Stat 1 */}
        <div className="flex flex-col md:flex-row items-center gap-3.5 md:pr-4 md:border-r" style={{ borderColor: "var(--atlas-border)" }}>
          <div
            className="w-10 h-10 rounded-full border flex items-center justify-center shrink-0 shadow-xs"
            style={{ borderColor: "var(--atlas-border)", color: "var(--atlas-accent)", backgroundColor: "var(--atlas-card-bg)" }}
          >
            <span className="material-symbols-outlined text-[20px]">person</span>
          </div>
          <div>
            <div className="font-mono text-[9px] tracking-[0.25em] uppercase font-medium" style={{ color: "var(--atlas-fg-muted)" }}>
              ARTISTS REPRESENTED
            </div>
            <div className="font-serif text-2xl md:text-3xl font-light mt-0.5" style={{ color: "var(--atlas-fg)" }}>
              {stats.artists.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="flex flex-col md:flex-row items-center gap-3.5 md:px-4 md:border-r" style={{ borderColor: "var(--atlas-border)" }}>
          <div
            className="w-10 h-10 rounded-full border flex items-center justify-center shrink-0 shadow-xs"
            style={{ borderColor: "var(--atlas-border)", color: "var(--atlas-accent)", backgroundColor: "var(--atlas-card-bg)" }}
          >
            <span className="material-symbols-outlined text-[20px]">crop_square</span>
          </div>
          <div>
            <div className="font-mono text-[9px] tracking-[0.25em] uppercase font-medium" style={{ color: "var(--atlas-fg-muted)" }}>
              ARTWORKS AVAILABLE
            </div>
            <div className="font-serif text-2xl md:text-3xl font-light mt-0.5" style={{ color: "var(--atlas-fg)" }}>
              {stats.artworks.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="flex flex-col md:flex-row items-center gap-3.5 md:px-4 md:border-r" style={{ borderColor: "var(--atlas-border)" }}>
          <div
            className="w-10 h-10 rounded-full border flex items-center justify-center shrink-0 shadow-xs"
            style={{ borderColor: "var(--atlas-border)", color: "var(--atlas-accent)", backgroundColor: "var(--atlas-card-bg)" }}
          >
            <span className="material-symbols-outlined text-[20px]">language</span>
          </div>
          <div>
            <div className="font-mono text-[9px] tracking-[0.25em] uppercase font-medium" style={{ color: "var(--atlas-fg-muted)" }}>
              COUNTRIES
            </div>
            <div className="font-serif text-2xl md:text-3xl font-light mt-0.5" style={{ color: "var(--atlas-fg)" }}>
              54
            </div>
          </div>
        </div>

        {/* Stat 4 */}
        <div className="flex flex-col md:flex-row items-center gap-3.5 md:px-4 md:border-r" style={{ borderColor: "var(--atlas-border)" }}>
          <div
            className="w-10 h-10 rounded-full border flex items-center justify-center shrink-0 shadow-xs"
            style={{ borderColor: "var(--atlas-border)", color: "var(--atlas-accent)", backgroundColor: "var(--atlas-card-bg)" }}
          >
            <span className="material-symbols-outlined text-[20px]">groups</span>
          </div>
          <div>
            <div className="font-mono text-[9px] tracking-[0.25em] uppercase font-medium" style={{ color: "var(--atlas-fg-muted)" }}>
              COLLECTORS WORLDWIDE
            </div>
            <div className="font-serif text-2xl md:text-3xl font-light mt-0.5" style={{ color: "var(--atlas-fg)" }}>
              1,000+
            </div>
          </div>
        </div>

        {/* Stat 5: Scroll Indicator */}
        <div className="flex items-center justify-center md:justify-end gap-3 col-span-2 md:col-span-1">
          <div
            className="w-10 h-10 rounded-full border flex items-center justify-center shrink-0 animate-bounce shadow-xs"
            style={{ borderColor: "var(--atlas-border)", color: "var(--atlas-fg)", backgroundColor: "var(--atlas-card-bg)" }}
          >
            <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
          </div>
          <div className="font-mono text-[9px] tracking-[0.25em] uppercase text-left leading-tight font-medium" style={{ color: "var(--atlas-fg-muted)" }}>
            SCROLL TO <br /> EXPLORE
          </div>
        </div>
      </div>
    </section>
  );
}
