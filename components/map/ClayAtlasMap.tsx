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
        [65, 55],
        [W - 65, H - 55],
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

  const shardMap = useMemo(() => {
    const map = new Map<string, Shard>();
    shards.forEach((s) => map.set(s.slug, s));
    return map;
  }, [shards]);

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
      {/* Top Controls Bar: Search, Sound Toggle, Zoom Controls */}
      <div
        className="flex flex-wrap items-center justify-between gap-4 p-4 border rounded-sm shadow-xs transition-colors"
        style={{
          borderColor: "var(--atlas-border)",
          backgroundColor: "var(--atlas-card-bg)",
        }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <span className="material-symbols-outlined text-[19px]" style={{ color: "var(--atlas-accent)" }}>
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
              className="text-xs opacity-60 hover:opacity-100 px-1 py-0.5"
              style={{ color: "var(--atlas-fg)" }}
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
            className="inline-flex items-center gap-2 px-3.5 py-1.5 border rounded text-[10px] font-mono tracking-[0.2em] uppercase transition-all shadow-2xs"
            style={{
              borderColor: "var(--atlas-border)",
              color: soundOn ? "var(--atlas-accent)" : "var(--atlas-fg-muted)",
              backgroundColor: "var(--atlas-card-bg)",
            }}
          >
            <span className="material-symbols-outlined text-[16px]">
              {soundOn ? "volume_up" : "volume_off"}
            </span>
            <span className="font-semibold">{soundOn ? "Sound On" : "Muted"}</span>
          </button>

          <div className="flex items-center border rounded overflow-hidden shadow-2xs" style={{ borderColor: "var(--atlas-border)", backgroundColor: "var(--atlas-card-bg)" }}>
            <button
              onClick={() => setZoom((z) => Math.min(2.2, z + 0.25))}
              className="px-3 py-1 text-xs border-r font-bold hover:opacity-75"
              style={{ borderColor: "var(--atlas-border)", color: "var(--atlas-fg)" }}
              title="Zoom In"
            >
              +
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
              className="px-3 py-1 text-xs border-r font-bold hover:opacity-75"
              style={{ borderColor: "var(--atlas-border)", color: "var(--atlas-fg)" }}
              title="Zoom Out"
            >
              −
            </button>
            <button
              onClick={() => setZoom(1)}
              className="px-3 py-1 text-xs font-mono tracking-wider hover:opacity-75"
              style={{ color: "var(--atlas-fg)" }}
              title="Reset Zoom"
            >
              RESET
            </button>
          </div>
        </div>
      </div>

      {/* Main 3D Canvas */}
      <div
        className="relative overflow-hidden border rounded-sm nu-atlas-canvas min-h-[600px] flex items-center justify-center transition-colors"
        style={{ borderColor: "var(--atlas-border)" }}
        onMouseMove={updateHoverPosition}
        onMouseLeave={() => {
          setHover(null);
          setHoverPosition(null);
          handleCountryLeave();
        }}
      >
        <div
          className="w-full max-w-[960px] mx-auto p-4 md:p-8"
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
              {/* Soft Multi-Layer Drop Shadows */}
              <filter id="detailShadowDefault" x="-30%" y="-30%" width="170%" height="170%">
                <feDropShadow dx="2.5" dy="6" stdDeviation="4.5" floodColor="var(--atlas-shadow-color)" floodOpacity="var(--atlas-shadow-opacity-a)" />
                <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodColor="#000000" floodOpacity="var(--atlas-shadow-opacity-b)" />
              </filter>
              <filter id="detailShadowActive" x="-40%" y="-40%" width="190%" height="190%">
                <feDropShadow dx="5" dy="12" stdDeviation="8" floodColor="var(--atlas-shadow-color)" floodOpacity="var(--atlas-shadow-active-a)" />
                <feDropShadow dx="1" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="var(--atlas-shadow-active-b)" />
              </filter>
              <filter id="detailIslandShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="1.5" dy="3" stdDeviation="2" floodColor="var(--atlas-shadow-color)" floodOpacity="var(--atlas-shadow-opacity-a)" />
              </filter>

              {/* 135-degree Gradients */}
              {shards.map((s) => (
                <linearGradient
                  key={`detail-grad-${s.slug}`}
                  id={`detail-grad-${s.slug}`}
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

            {/* 3D Country Puzzle Blocks */}
            {shards.map((shard) => {
              const country = getCountryBySlug(shard.slug);
              if (!country) return null;
              const isHovered = hover === country.slug;
              const dimmed = isDimmed(country.slug);

              return (
                <g
                  key={country.slug}
                  className={`nu-clay-piece ${isHovered ? "is-active" : ""}`}
                  style={{
                    cursor: "pointer",
                    transformOrigin: `${shard.centroid[0]}px ${shard.centroid[1]}px`,
                    transform: isHovered ? "translateY(-6px) scale(1.02)" : "translateY(0) scale(1)",
                    filter: isHovered ? "url(#detailShadowActive)" : "url(#detailShadowDefault)",
                    opacity: dimmed ? 0.22 : 1,
                  }}
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
                  aria-label={country.name}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      enterCountry(country.slug);
                    }
                  }}
                >
                  {/* 3D Extrusion Depth Layers */}
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

                  {/* Main Top Face */}
                  <path
                    d={shard.path}
                    fill={`url(#detail-grad-${shard.slug})`}
                    stroke={isHovered ? "var(--atlas-accent)" : "rgba(25, 15, 10, 0.75)"}
                    strokeWidth={isHovered ? 2.2 : 1.2}
                    strokeLinejoin="round"
                    className="nu-clay-top"
                  />

                  {/* Chamfered Top Bevel Highlight */}
                  <path
                    d={shard.path}
                    fill="none"
                    stroke={isHovered ? "rgba(255, 255, 255, 0.85)" : shard.palette.bevelHighlight}
                    strokeWidth={0.75}
                    strokeLinejoin="round"
                    pointerEvents="none"
                  />

                  <title>{country.name}</title>
                </g>
              );
            })}

            {/* Island Droplets */}
            {islands.map((isle) => {
              const country = getCountryBySlug(isle.slug);
              if (!country) return null;
              const isHovered = hover === isle.slug;
              const dimmed = isDimmed(isle.slug);
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
                    transition: "transform 0.25s ease, opacity 0.2s ease",
                    transform: isHovered ? "translateY(-4px) scale(1.2)" : "translateY(0) scale(1)",
                    filter: isHovered ? "url(#detailShadowActive)" : "url(#detailIslandShadow)",
                    opacity: dimmed ? 0.22 : 1,
                  }}
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
                  <circle cx={isle.x} cy={isle.y + 2} r={isHovered ? 6 : 4.5} fill={palette.sideDark} pointerEvents="none" />
                  <circle
                    cx={isle.x}
                    cy={isle.y}
                    r={isHovered ? 6 : 4.5}
                    fill={palette.topBase}
                    stroke={isHovered ? "var(--atlas-accent)" : "rgba(35, 22, 14, 0.75)"}
                    strokeWidth={isHovered ? 1.4 : 1}
                  />
                  <circle
                    cx={isle.x - (isHovered ? 1.8 : 1.3)}
                    cy={isle.y - (isHovered ? 1.8 : 1.3)}
                    r={isHovered ? 1.8 : 1.3}
                    fill="rgba(255, 255, 255, 0.65)"
                    pointerEvents="none"
                  />
                  <title>{country.name}</title>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Hover Information Card */}
        {hoveredCountry && hoverPosition && (
          <div
            className="nu-atlas-hover-card absolute p-4.5 border rounded shadow-xl transition-all pointer-events-none z-30 backdrop-blur-md"
            style={{
              backgroundColor: "var(--atlas-tooltip-bg)",
              borderColor: "var(--atlas-border-strong)",
              left: hoverPosition.x,
              top: hoverPosition.y,
            }}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{hoveredCountry.flag}</span>
                <h3 className="font-serif text-xl font-bold" style={{ color: "var(--atlas-fg)" }}>
                  {hoveredCountry.name}
                </h3>
              </div>
              <span className="text-[10px] font-mono tracking-widest uppercase font-semibold text-[color:var(--atlas-accent)]">
                {hoveredCountry.region}
              </span>
            </div>
            <p className="text-xs italic leading-relaxed mb-3" style={{ color: "var(--atlas-fg-muted)" }}>
              &ldquo;{hoveredCountry.blurb}&rdquo;
            </p>
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest pt-2.5 border-t" style={{ borderColor: "var(--atlas-border)", color: "var(--atlas-accent)" }}>
              <span className="font-semibold">{hoveredStats?.artistsCount} Artists</span>
              <span className="font-semibold">{hoveredStats?.worksCount} Works</span>
            </div>
          </div>
        )}
      </div>

      {/* Medium Quick Filters Bar */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <span className="font-mono text-[10px] tracking-widest uppercase mr-2" style={{ color: "var(--atlas-fg-muted)" }}>
          Filter by Medium:
        </span>
        <button
          onClick={() => setActiveFilter(null)}
          className={`px-3.5 py-2 text-[10px] font-mono uppercase tracking-widest border rounded transition-all cursor-pointer ${
            !activeFilter
              ? "bg-[#9F0D12] text-[#F5F2EE] border-[#9F0D12] shadow-xs font-semibold"
              : "border-[color:var(--atlas-border)] hover:border-[color:var(--atlas-accent)] hover:opacity-80"
          }`}
          style={activeFilter ? { backgroundColor: "var(--atlas-card-bg)", color: "var(--atlas-fg)" } : {}}
        >
          All Mediums
        </button>
        {TECHNIQUES.map((t) => (
          <button
            key={t}
            onClick={() => setActiveFilter(activeFilter === t ? null : t)}
            className={`px-3.5 py-2 text-[10px] font-mono uppercase tracking-widest border rounded transition-all cursor-pointer ${
              activeFilter === t
                ? "bg-[#9F0D12] text-[#F5F2EE] border-[#9F0D12] shadow-xs font-semibold"
                : "border-[color:var(--atlas-border)] hover:border-[color:var(--atlas-accent)] hover:opacity-80"
            }`}
            style={activeFilter !== t ? { backgroundColor: "var(--atlas-card-bg)", color: "var(--atlas-fg)" } : {}}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
