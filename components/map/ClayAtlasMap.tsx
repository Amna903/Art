"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { geoConicEqualArea, geoPath } from "d3-geo";
import africaGeo from "@/lib/data/africa-geo.json";
import { ISLAND_PINS, getCountryByGeoName, getCountryBySlug } from "@/lib/data/africa";
import { getStats } from "@/lib/data/africa-map";
import { buildCountryShards, type CountryInput, type Shard } from "@/lib/data/africa-shards";
import { useCountrySoundUrls } from "@/lib/data/country-sounds";
import { ARTISTS, TECHNIQUES, type Technique } from "@/lib/data/artists";
import "@/components/map/clay-atlas.css";

const W = 1000;
const H = 1000;

type FeatureLike = {
  type: "Feature";
  properties: { ADMIN: string; ISO_A3: string };
  geometry: GeoJSON.Geometry;
};

// Map country -> set of techniques
const TECHNIQUES_BY_COUNTRY: Record<string, Set<Technique>> = {};
for (const artist of ARTISTS) {
  const set = TECHNIQUES_BY_COUNTRY[artist.countrySlug] ?? new Set<Technique>();
  set.add(artist.technique as Technique);
  TECHNIQUES_BY_COUNTRY[artist.countrySlug] = set;
}

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

export function ClayAtlasMap() {
  const router = useRouter();
  const features = (africaGeo as unknown as { features: FeatureLike[] }).features;

  const projection = useMemo(() => {
    const p = geoConicEqualArea()
      .rotate([-20, 0])
      .parallels([-15, 30]);
    p.fitExtent(
      [
        [40, 50],
        [W - 40, H - 50],
      ],
      { type: "FeatureCollection", features } as unknown as GeoJSON.FeatureCollection,
    );
    return p;
  }, [features]);
  const path = useMemo(() => geoPath(projection), [projection]);

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

  const [hover, setHover] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [search, setSearch] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  const [activeFilter, setActiveFilter] = useState<Technique | null>(null);
  const [zoom, setZoom] = useState(1);

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

  const enterCountry = (slug: string) => {
    stopUploadedAudio();
    router.push(`/discover/${slug}`);
  };

  const handleCountryLeave = () => {
    lastHoverRef.current = null;
    stopUploadedAudio();
  };

  const isDimmed = (slug: string) => {
    if (search && !getCountryBySlug(slug)?.name.toLowerCase().includes(search.toLowerCase())) {
      return true;
    }
    if (activeFilter && !TECHNIQUES_BY_COUNTRY[slug]?.has(activeFilter)) {
      return true;
    }
    return false;
  };

  const hoveredCountry = hover ? getCountryBySlug(hover) : null;
  const hoveredStats = hover ? getStats(hover) : null;

  const updateHoverPosition = (event: React.MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const cardWidth = Math.min(320, bounds.width - 32);
    const cardHeight = 180;
    const pointerX = event.clientX - bounds.left;
    const pointerY = event.clientY - bounds.top;
    const showToLeft = pointerX > bounds.width / 2;

    setHoverPosition({
      x: Math.max(16, Math.min(showToLeft ? pointerX - cardWidth - 16 : pointerX + 16, bounds.width - cardWidth - 16)),
      y: Math.max(16, Math.min(pointerY + 16, bounds.height - cardHeight - 16)),
    });
  };

  return (
    <div
      className="nu-atlas space-y-6"
      style={{
        backgroundColor: "var(--atlas-bg)",
        color: "var(--atlas-fg)",
      }}
    >
      {/* Top Bar: Search, Sound Toggle, Zoom Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 border" style={{ borderColor: "var(--atlas-border)", backgroundColor: "var(--atlas-hover)" }}>
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <span className="material-symbols-outlined text-[18px]" style={{ color: "var(--atlas-accent)" }}>
            search
          </span>
          <input
            type="text"
            placeholder="Search 54 African countries…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent font-mono text-xs uppercase tracking-widest focus:outline-none w-full"
            style={{ color: "var(--atlas-fg)" }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-xs opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSound}
            aria-label={soundOn ? "Mute sound" : "Unmute sound"}
            className="inline-flex items-center gap-2 px-3 py-1.5 border text-[10px] font-mono tracking-[0.2em] uppercase transition-colors"
            style={{ borderColor: "var(--atlas-border)", color: "var(--atlas-accent)" }}
          >
            <span className="material-symbols-outlined text-[16px]">
              {soundOn ? "volume_up" : "volume_off"}
            </span>
            {soundOn ? "Sound On" : "Muted"}
          </button>

          <div className="flex items-center border" style={{ borderColor: "var(--atlas-border)" }}>
            <button
              onClick={() => setZoom((z) => Math.min(2.2, z + 0.3))}
              className="px-2.5 py-1 text-xs border-r hover:opacity-70"
              style={{ borderColor: "var(--atlas-border)" }}
              title="Zoom In"
            >
              +
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(1, z - 0.3))}
              className="px-2.5 py-1 text-xs border-r hover:opacity-70"
              style={{ borderColor: "var(--atlas-border)" }}
              title="Zoom Out"
            >
              -
            </button>
            <button
              onClick={() => setZoom(1)}
              className="px-2.5 py-1 text-xs hover:opacity-70"
              title="Reset Zoom"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Main 3D Canvas */}
      <div
        className="relative overflow-hidden border nu-atlas-canvas min-h-[580px]"
        style={{ borderColor: "var(--atlas-border)" }}
        onMouseMove={updateHoverPosition}
        onMouseLeave={() => {
          setHover(null);
          setHoverPosition(null);
          handleCountryLeave();
        }}
      >
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "50% 50%",
            transition: "transform 0.3s ease",
          }}
        >
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto block select-none"
            role="img"
            aria-label="3D Interactive Atlas of Africa"
          >
            <defs>
              <filter id="clay3dExtrudeFull" x="-20%" y="-20%" width="140%" height="140%">
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

              <filter id="clay3dShadowFull" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="2" dy="4" stdDeviation="2" floodColor="#000000" floodOpacity="0.8" />
                <feDropShadow dx="6" dy="12" stdDeviation="8" floodColor="#000000" floodOpacity="0.5" />
              </filter>

              {shards.map((s) => (
                <linearGradient key={s.slug} id={`full-shard-clay-${s.slug}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={s.fill} />
                  <stop offset="100%" stopColor={s.fillDark} />
                </linearGradient>
              ))}

              <linearGradient id="fullActiveGoldFill" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#e8c794" />
                <stop offset="100%" stopColor="#b3874b" />
              </linearGradient>
            </defs>

            {shards.map((shard) => {
              const country = getCountryBySlug(shard.slug);
              if (!country) return null;
              const isHover = hover === country.slug;
              const dimmed = isDimmed(country.slug);
              const stats = getStats(country.slug);
              const [dx, dy] = shard.drift;
              const transform = `translate(${dx} ${dy}) rotate(${shard.rotation} ${shard.centroid[0]} ${shard.centroid[1]})`;

              return (
                <g
                  key={country.slug}
                  transform={transform}
                  className={`nu-shard${isHover ? " is-hover" : ""}${dimmed ? " is-dimmed" : ""}`}
                  style={{ cursor: "pointer", opacity: dimmed ? 0.2 : 1 }}
                  onMouseEnter={() => {
                    setHover(country.slug);
                    if (lastHoverRef.current !== country.slug) {
                      lastHoverRef.current = country.slug;
                      triggerCue(country.slug);
                    }
                  }}
                  onMouseLeave={handleCountryLeave}
                  onClick={() => enterCountry(country.slug)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${country.name} — ${stats.artistsCount} artists`}
                >
                  <path
                    d={shard.path}
                    transform="translate(3, 5)"
                    fill="#18130e"
                    opacity={0.85}
                    filter="url(#clay3dShadowFull)"
                    pointerEvents="none"
                  />
                  <path
                    d={shard.path}
                    fill={isHover ? "url(#fullActiveGoldFill)" : `url(#full-shard-clay-${shard.slug})`}
                    stroke={isHover ? "var(--atlas-accent)" : "rgba(0,0,0,0.6)"}
                    strokeWidth={isHover ? 1.4 : 0.4}
                    strokeLinejoin="round"
                    filter="url(#clay3dExtrudeFull)"
                    style={{
                      transform: isHover ? "translate(-2px, -4px) scale(1.04)" : "translate(0, 0) scale(1)",
                      transformOrigin: `${shard.centroid[0]}px ${shard.centroid[1]}px`,
                      transition: "transform 0.25s cubic-bezier(0.22,1,0.36,1), fill 0.25s ease",
                    }}
                  />
                  <title>{country.name}</title>
                </g>
              );
            })}

            {islands.map((isle) => {
              const country = getCountryBySlug(isle.slug);
              if (!country) return null;
              const isHover = hover === isle.slug;
              const dimmed = isDimmed(isle.slug);
              return (
                <g
                  key={isle.slug}
                  style={{ cursor: "pointer", opacity: dimmed ? 0.2 : 1 }}
                  onMouseEnter={() => {
                    setHover(isle.slug);
                    if (lastHoverRef.current !== isle.slug) {
                      lastHoverRef.current = isle.slug;
                      triggerCue(isle.slug);
                    }
                  }}
                  onMouseLeave={handleCountryLeave}
                  onClick={() => enterCountry(isle.slug)}
                  tabIndex={0}
                  role="button"
                  aria-label={country.name}
                >
                  <circle cx={isle.x} cy={isle.y} r={14} fill="transparent" />
                  <circle
                    cx={isle.x}
                    cy={isle.y}
                    r={isHover ? 6.5 : 4.5}
                    fill={isHover ? "var(--atlas-accent)" : "#998363"}
                    stroke="#000000"
                    strokeWidth={0.8}
                    filter="url(#clay3dExtrudeFull)"
                  />
                  <title>{country.name}</title>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Hover Information Spotlight Box */}
        {hoveredCountry && hoverPosition && (
          <div
            className="nu-atlas-hover-card absolute p-4 border backdrop-blur-md shadow-2xl transition-all pointer-events-none"
            style={{
              backgroundColor: "var(--atlas-tooltip-bg)",
              borderColor: "var(--atlas-border)",
              left: hoverPosition.x,
              top: hoverPosition.y,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{hoveredCountry.flag}</span>
              <h3 className="font-serif text-lg font-bold" style={{ color: "var(--atlas-fg)" }}>
                {hoveredCountry.name}
              </h3>
            </div>
            <p className="text-xs italic leading-relaxed mb-3" style={{ color: "var(--atlas-fg-muted)" }}>
              &ldquo;{hoveredCountry.blurb}&rdquo;
            </p>
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest pt-2 border-t" style={{ borderColor: "var(--atlas-border)", color: "var(--atlas-accent)" }}>
              <span>{hoveredStats?.artistsCount} Artists</span>
              <span>{hoveredStats?.worksCount} Works</span>
            </div>
          </div>
        )}
      </div>

      {/* Medium Quick Filters */}
      <div className="flex flex-wrap gap-2 pt-2">
        <button
          onClick={() => setActiveFilter(null)}
          className={`px-3 py-2 text-[10px] font-mono uppercase tracking-widest border transition-colors ${
            !activeFilter
              ? "bg-[#9F0D12] text-[#F5F2EE] border-[#9F0D12]"
              : "border-[color:var(--atlas-border)] hover:border-[color:var(--atlas-accent)]"
          }`}
        >
          All Mediums
        </button>
        {TECHNIQUES.map((t) => (
          <button
            key={t}
            onClick={() => setActiveFilter(activeFilter === t ? null : t)}
            className={`px-3 py-2 text-[10px] font-mono uppercase tracking-widest border transition-colors ${
              activeFilter === t
                ? "bg-[#9F0D12] text-[#F5F2EE] border-[#9F0D12]"
                : "border-[color:var(--atlas-border)] hover:border-[color:var(--atlas-accent)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
