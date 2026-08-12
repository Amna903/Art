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

// 9 Featured countries matching the right panel in the reference design image
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

// Left vertical navigation links matching reference design image
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

// Procedural audio pluck cue fallback if no custom sound uploaded
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

export function AfricaMapSection() {
  const router = useRouter();
  const features = (africaGeo as unknown as { features: FeatureLike[] }).features;

  const projection = useMemo(() => {
    const p = geoConicEqualArea()
      .rotate([-20, 0])
      .parallels([-15, 30]);
    p.fitExtent(
      [
        [50, 50],
        [W - 50, H - 50],
      ],
      { type: "FeatureCollection", features } as unknown as GeoJSON.FeatureCollection,
    );
    return p;
  }, [features]);
  const path = useMemo(() => geoPath(projection), [projection]);

  // Build continental country 3D shards
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

  // Build island pins (e.g. Cabo Verde, Sao Tome, Seychelles)
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
      className="nu-atlas relative w-screen mx-[calc(50%-50vw)] py-10 md:py-16 overflow-hidden font-sans select-none"
      style={{
        backgroundColor: "var(--atlas-bg)",
        color: "var(--atlas-fg)",
      }}
    >
      {/* Theme-aware background radial spotlight */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none nu-atlas-bg"
      />

      {/* Main Container */}
      <div className="relative max-w-[1440px] mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-[250px_1fr_340px] gap-6 lg:gap-10 items-center min-h-[660px]">
        
        {/* LEFT COLUMN: Logo, Vertical Navigation & Floating Callout */}
        <div className="flex flex-col justify-between h-full space-y-8 z-10 self-stretch py-2">
          {/* Logo Branding */}
          <div>
            <h2 className="font-serif text-2xl md:text-3xl tracking-[0.25em] font-light uppercase" style={{ color: "var(--atlas-fg)" }}>
              NU <span className="inline-block mx-1 text-xs opacity-50 font-sans">—</span> ART
            </h2>
            <span
              className="block font-mono text-[9px] tracking-[0.45em] uppercase mt-1"
              style={{ color: "var(--atlas-accent)" }}
            >
              COLLECTIVE
            </span>
          </div>

          {/* Left Vertical Navigation Menu with Timeline Line */}
          <div className="relative flex flex-col space-y-5 my-auto pl-2">
            <div
              className="absolute left-[7.5px] top-2 bottom-2 w-px pointer-events-none"
              style={{ backgroundColor: "var(--atlas-border)" }}
            />

            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="group flex items-center gap-3 text-[11px] tracking-[0.24em] uppercase font-mono transition-colors relative z-10"
              >
                {/* Dot Indicator */}
                <span
                  className="w-3 h-3 rounded-full transition-all duration-300 flex items-center justify-center border"
                  style={{
                    backgroundColor: item.active ? "var(--atlas-accent)" : "transparent",
                    borderColor: item.active ? "var(--atlas-accent)" : "var(--atlas-border)",
                  }}
                >
                  {item.active && <span className="w-1 h-1 rounded-full" style={{ backgroundColor: "var(--atlas-bg)" }} />}
                </span>

                <span
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

          {/* Floating Pointer Callout Box for Active / Hovered Country */}
          <div className="pt-4 border-t transition-all duration-300" style={{ borderColor: "var(--atlas-border)" }}>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-[0.22em] uppercase mb-1.5" style={{ color: "var(--atlas-accent)" }}>
              <span className="text-base leading-none">⤤</span>
              <span className="font-semibold">{activeCountry.name}</span>
            </div>
            <p className="text-xs leading-relaxed font-light italic min-h-[50px]" style={{ color: "var(--atlas-fg-muted)" }}>
              &ldquo;{activeCountry.blurb}&rdquo;
            </p>
          </div>
        </div>

        {/* CENTER COLUMN: 3D Sculptural Clay/Wooden Africa Map */}
        <div className="relative flex items-center justify-center w-full h-full min-h-[520px] lg:min-h-[640px]">
          {/* Audio Mute/Unmute Control */}
          <button
            type="button"
            onClick={toggleSound}
            aria-label={soundOn ? "Mute audio" : "Unmute audio"}
            className="absolute top-0 right-0 z-20 flex items-center gap-2 px-3 py-1.5 border rounded text-[10px] font-mono tracking-[0.2em] uppercase transition-colors backdrop-blur-sm"
            style={{
              backgroundColor: "var(--atlas-tooltip-bg)",
              borderColor: "var(--atlas-border)",
              color: "var(--atlas-accent)",
            }}
          >
            <span className="material-symbols-outlined text-[15px]">
              {soundOn ? "volume_up" : "volume_off"}
            </span>
            <span>{soundOn ? "Sound On" : "Muted"}</span>
          </button>

          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto max-h-[640px] block select-none"
            role="img"
            aria-label="3D Sculptural Interactive Map of Africa"
            onMouseLeave={() => {
              handleCountryLeave();
            }}
          >
            <defs>
              {/* 3D Clay Texture & Specular Lighting Filter */}
              <filter id="clay3dExtrude" x="-20%" y="-20%" width="140%" height="140%">
                <feMorphology in="SourceGraphic" operator="erode" radius="2" result="eroded" />
                <feMorphology in="SourceAlpha" operator="erode" radius="2" result="erodedAlpha" />
                <feGaussianBlur in="erodedAlpha" stdDeviation="0.9" result="blurA" />
                <feSpecularLighting
                  in="blurA"
                  surfaceScale="4"
                  specularConstant="0.65"
                  specularExponent="22"
                  lightingColor="#fff4e0"
                  result="spec"
                >
                  <feDistantLight azimuth="135" elevation="55" />
                </feSpecularLighting>
                <feComposite in="spec" in2="erodedAlpha" operator="in" result="specMasked" />
                <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="7" result="grain" />
                <feColorMatrix
                  in="grain"
                  type="matrix"
                  values="0 0 0 0 0.06
                          0 0 0 0 0.04
                          0 0 0 0 0.02
                          0 0 0 0.15 0"
                  result="grainDark"
                />
                <feComposite in="grainDark" in2="erodedAlpha" operator="in" result="grainMasked" />
                <feMerge>
                  <feMergeNode in="eroded" />
                  <feMergeNode in="grainMasked" />
                  <feMergeNode in="specMasked" />
                </feMerge>
              </filter>

              {/* Heavy 3D Drop Shadow for Depth & Extrusion */}
              <filter id="clay3dShadow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="2" dy="4" stdDeviation="2" floodColor="#000000" floodOpacity="0.75" />
                <feDropShadow dx="6" dy="12" stdDeviation="8" floodColor="#000000" floodOpacity="0.45" />
              </filter>

              {/* Shard Gradients matching warm earthy palette */}
              {shards.map((s) => (
                <linearGradient key={s.slug} id={`shard-clay-${s.slug}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={s.fill} />
                  <stop offset="100%" stopColor={s.fillDark} />
                </linearGradient>
              ))}

              {/* Active Highlight Gradient */}
              <linearGradient id="activeGoldFill" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#e8c794" />
                <stop offset="100%" stopColor="#b3874b" />
              </linearGradient>
            </defs>

            {/* Connecting Pointer Line from active country centroid to floating left callout */}
            {activePoint && (
              <g pointerEvents="none" className="transition-all duration-300">
                <path
                  d={`M ${activePoint.x} ${activePoint.y} L ${Math.max(60, activePoint.x - 120)} ${activePoint.y + 40} L 20 ${activePoint.y + 40}`}
                  fill="none"
                  stroke="var(--atlas-accent)"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                  opacity={0.7}
                />
                <circle cx={activePoint.x} cy={activePoint.y} r={3.5} fill="var(--atlas-accent)" />
              </g>
            )}

            {/* Render 3D Continental Shards */}
            {shards.map((shard) => {
              const country = getCountryBySlug(shard.slug);
              if (!country) return null;
              const isActive = activeSlug === country.slug;
              const [dx, dy] = shard.drift;
              const transform = `translate(${dx} ${dy}) rotate(${shard.rotation} ${shard.centroid[0]} ${shard.centroid[1]})`;

              return (
                <g
                  key={country.slug}
                  transform={transform}
                  style={{
                    cursor: "pointer",
                    transition: "transform 0.3s ease",
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
                  {/* 3D Extrusion Side Wall Layer */}
                  <path
                    d={shard.path}
                    transform="translate(3, 5)"
                    fill="#18130e"
                    opacity={0.85}
                    filter="url(#clay3dShadow)"
                    pointerEvents="none"
                  />

                  {/* Top Face 3D Clay Body */}
                  <path
                    d={shard.path}
                    fill={isActive ? "url(#activeGoldFill)" : `url(#shard-clay-${shard.slug})`}
                    stroke={isActive ? "var(--atlas-accent)" : "rgba(0,0,0,0.6)"}
                    strokeWidth={isActive ? 1.4 : 0.4}
                    strokeLinejoin="round"
                    filter="url(#clay3dExtrude)"
                    style={{
                      transform: isActive ? "translate(-2px, -4px) scale(1.04)" : "translate(0, 0) scale(1)",
                      transformOrigin: `${shard.centroid[0]}px ${shard.centroid[1]}px`,
                      transition: "transform 0.25s cubic-bezier(0.22,1,0.36,1), fill 0.25s ease",
                    }}
                  />
                  <title>{country.name}</title>
                </g>
              );
            })}

            {/* Island Pins */}
            {islands.map((isle) => {
              const country = getCountryBySlug(isle.slug);
              if (!country) return null;
              const isActive = activeSlug === isle.slug;
              return (
                <g
                  key={isle.slug}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => handleCountryHover(isle.slug)}
                  onMouseLeave={handleCountryLeave}
                  onClick={() => enterCountry(isle.slug)}
                  tabIndex={0}
                  role="button"
                  aria-label={country.name}
                >
                  <circle cx={isle.x} cy={isle.y} r={14} fill="transparent" />
                  <circle
                    cx={isle.x + 2}
                    cy={isle.y + 3}
                    r={isActive ? 7 : 5}
                    fill="#0c0a08"
                    opacity={0.8}
                    pointerEvents="none"
                  />
                  <circle
                    cx={isle.x}
                    cy={isle.y}
                    r={isActive ? 6.5 : 4.5}
                    fill={isActive ? "var(--atlas-accent)" : "#998363"}
                    stroke="#000000"
                    strokeWidth={0.8}
                    filter="url(#clay3dExtrude)"
                    style={{ transition: "r 0.2s ease, fill 0.2s ease" }}
                  />
                  <title>{country.name}</title>
                </g>
              );
            })}
          </svg>
        </div>

        {/* RIGHT COLUMN: Kicker, Headline, Paragraph, Country List Menu */}
        <div className="flex flex-col justify-between h-full space-y-5 z-10 self-stretch py-2">
          {/* Header */}
          <div>
            {/* Kicker */}
            <div className="mb-2">
              <span className="text-[9px] tracking-[0.38em] uppercase font-mono block" style={{ color: "var(--atlas-accent)" }}>
                ONE CONTINENT.
              </span>
              <span className="text-[9px] tracking-[0.38em] uppercase font-mono block mt-0.5" style={{ color: "var(--atlas-accent)" }}>
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

          {/* Interactive Country List with Mini 3D Shape Thumbnails */}
          <div className="flex flex-col space-y-1 my-1">
            {featuredCountries.map((country) => {
              const isActive = activeSlug === country.slug;
              const shard = shardMap.get(country.slug);

              return (
                <div
                  key={country.slug}
                  onMouseEnter={() => handleCountryHover(country.slug)}
                  onMouseLeave={handleCountryLeave}
                  onClick={() => enterCountry(country.slug)}
                  className="group flex items-center justify-between py-2 px-2.5 rounded transition-all cursor-pointer"
                  style={{
                    backgroundColor: isActive ? "var(--atlas-hover)" : "transparent",
                    borderLeft: isActive ? "2px solid var(--atlas-accent)" : "2px solid transparent",
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Active Dot Indicator */}
                    <span
                      className={`w-2 h-2 rounded-full transition-all ${
                        isActive ? "scale-110" : "opacity-40"
                      }`}
                      style={{
                        backgroundColor: isActive ? "var(--atlas-accent)" : "var(--atlas-border)",
                      }}
                    />

                    {/* Mini 3D Shape Thumbnail */}
                    {shard ? (
                      <div className="w-6 h-6 flex items-center justify-center shrink-0 opacity-85 group-hover:opacity-100 transition-opacity">
                        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
                          <path
                            d={shard.path}
                            fill={isActive ? "var(--atlas-accent)" : shard.fill}
                            stroke="rgba(0,0,0,0.6)"
                            strokeWidth={4}
                          />
                        </svg>
                      </div>
                    ) : (
                      <span className="text-sm">{country.flag}</span>
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
            className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.25em] uppercase transition-colors pt-2"
            style={{ color: "var(--atlas-accent)" }}
          >
            VIEW ALL COUNTRIES
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>

      </div>

      {/* BOTTOM DIVIDED STATS BAR */}
      <div
        className="mt-12 pt-8 border-t max-w-[1440px] mx-auto px-6 md:px-12 grid grid-cols-2 md:grid-cols-5 gap-6 text-center md:text-left"
        style={{ borderColor: "var(--atlas-border)" }}
      >
        {/* Stat 1 */}
        <div className="flex flex-col md:flex-row items-center gap-3 md:pr-4 md:border-r" style={{ borderColor: "var(--atlas-border)" }}>
          <div
            className="w-10 h-10 rounded-full border flex items-center justify-center shrink-0"
            style={{ borderColor: "var(--atlas-border)", color: "var(--atlas-accent)" }}
          >
            <span className="material-symbols-outlined text-[20px]">person</span>
          </div>
          <div>
            <div className="font-mono text-[9px] tracking-[0.25em] uppercase" style={{ color: "var(--atlas-fg-muted)" }}>
              ARTISTS REPRESENTED
            </div>
            <div className="font-serif text-2xl md:text-3xl font-light mt-0.5" style={{ color: "var(--atlas-fg)" }}>
              120+
            </div>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="flex flex-col md:flex-row items-center gap-3 md:px-4 md:border-r" style={{ borderColor: "var(--atlas-border)" }}>
          <div
            className="w-10 h-10 rounded-full border flex items-center justify-center shrink-0"
            style={{ borderColor: "var(--atlas-border)", color: "var(--atlas-accent)" }}
          >
            <span className="material-symbols-outlined text-[20px]">crop_square</span>
          </div>
          <div>
            <div className="font-mono text-[9px] tracking-[0.25em] uppercase" style={{ color: "var(--atlas-fg-muted)" }}>
              ARTWORKS AVAILABLE
            </div>
            <div className="font-serif text-2xl md:text-3xl font-light mt-0.5" style={{ color: "var(--atlas-fg)" }}>
              350+
            </div>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="flex flex-col md:flex-row items-center gap-3 md:px-4 md:border-r" style={{ borderColor: "var(--atlas-border)" }}>
          <div
            className="w-10 h-10 rounded-full border flex items-center justify-center shrink-0"
            style={{ borderColor: "var(--atlas-border)", color: "var(--atlas-accent)" }}
          >
            <span className="material-symbols-outlined text-[20px]">language</span>
          </div>
          <div>
            <div className="font-mono text-[9px] tracking-[0.25em] uppercase" style={{ color: "var(--atlas-fg-muted)" }}>
              COUNTRIES
            </div>
            <div className="font-serif text-2xl md:text-3xl font-light mt-0.5" style={{ color: "var(--atlas-fg)" }}>
              54
            </div>
          </div>
        </div>

        {/* Stat 4 */}
        <div className="flex flex-col md:flex-row items-center gap-3 md:px-4 md:border-r" style={{ borderColor: "var(--atlas-border)" }}>
          <div
            className="w-10 h-10 rounded-full border flex items-center justify-center shrink-0"
            style={{ borderColor: "var(--atlas-border)", color: "var(--atlas-accent)" }}
          >
            <span className="material-symbols-outlined text-[20px]">groups</span>
          </div>
          <div>
            <div className="font-mono text-[9px] tracking-[0.25em] uppercase" style={{ color: "var(--atlas-fg-muted)" }}>
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
            className="w-10 h-10 rounded-full border flex items-center justify-center shrink-0 animate-bounce"
            style={{ borderColor: "var(--atlas-border)", color: "var(--atlas-fg)" }}
          >
            <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
          </div>
          <div className="font-mono text-[9px] tracking-[0.25em] uppercase text-left leading-tight" style={{ color: "var(--atlas-fg-muted)" }}>
            SCROLL TO <br /> EXPLORE
          </div>
        </div>
      </div>
    </section>
  );
}
