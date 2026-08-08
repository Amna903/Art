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

function roundSvg(n: number): number {
  return Math.round(n * 1000) / 1000;
}

type FeatureLike = {
  type: "Feature";
  properties: { ADMIN: string; ISO_A3: string };
  geometry: GeoJSON.Geometry;
};

// countrySlug -> set of techniques present, so the medium filter chips can
// dim out countries with no matching artists.
const TECHNIQUES_BY_COUNTRY: Record<string, Set<Technique>> = {};
for (const artist of ARTISTS) {
  const set = TECHNIQUES_BY_COUNTRY[artist.countrySlug] ?? new Set<Technique>();
  set.add(artist.technique as Technique);
  TECHNIQUES_BY_COUNTRY[artist.countrySlug] = set;
}

// Deterministic pseudo-random per slug for stable per-country sound seeds.
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Same warm pluck+drone cue as the homepage Atlas section, so hovering a
// country here feels consistent with the rest of the site.
function playCountryCue(slug: string, ctx: AudioContext, master: GainNode) {
  const seed = hashStr(slug);
  const rand = (n: number) => ((seed >> n) & 0xff) / 255;

  const scale = [130.81, 155.56, 174.61, 196.0, 233.08, 261.63, 311.13, 349.23];
  const base = scale[seed % scale.length];
  const partial = 1 + rand(3) * 0.6;
  const detune = (rand(5) - 0.5) * 12;

  const now = ctx.currentTime;
  const dur = 1.5;

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
  g.gain.exponentialRampToValueAtTime(0.5, now + 0.02);
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

  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / data.length;
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2) * 0.15;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;
  const nGain = ctx.createGain();
  nGain.gain.value = 0.12;
  const nFilt = ctx.createBiquadFilter();
  nFilt.type = "bandpass";
  nFilt.frequency.value = 1800 + rand(13) * 2000;
  nFilt.Q.value = 0.8;
  noise.connect(nFilt);
  nFilt.connect(nGain);
  nGain.connect(master);
  noise.start(now);
}

// Curated route order that flows south → east → north → west, avoiding self-crossings.
const THREAD_ROUTE = [
  "south-africa",
  "kenya",
  "ethiopia",
  "egypt",
  "morocco",
  "senegal",
  "ghana",
  "nigeria",
];

export function ClayAtlasMap() {
  const router = useRouter();
  const features = (africaGeo as unknown as { features: FeatureLike[] }).features;

  const projection = useMemo(() => {
    // Conic Equal Area centred on Africa — silhouette reads faithfully,
    // North Africa isn't stretched the way Mercator flattens it.
    const p = geoConicEqualArea()
      .rotate([-20, 0])
      .parallels([-15, 30]);
    p.fitExtent(
      [
        [40, 50],
        [W - 40, H - 60],
      ],
      { type: "FeatureCollection", features } as unknown as GeoJSON.FeatureCollection,
    );
    return p;
  }, [features]);
  const path = useMemo(() => geoPath(projection), [projection]);

  // Continental country shards — real geojson geometry, earthy palette.
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

  // Small island pins projected in the same space — Cabo Verde, São Tomé,
  // Comoros, Mauritius, Seychelles. Madagascar comes from the geojson above.
  const islands = useMemo(() => {
    return Object.entries(ISLAND_PINS)
      .map(([slug, [lon, lat]]) => {
        const pt = projection([lon, lat]);
        if (!pt) return null;
        const seed = slug.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
        return { slug, x: pt[0], y: pt[1], seed };
      })
      .filter((isle): isle is { slug: string; x: number; y: number; seed: number } => Boolean(isle))
      .map((isle) => ({
        ...isle,
        x: roundSvg(isle.x),
        y: roundSvg(isle.y),
      }));
  }, [projection]);

  const centroids = useMemo(() => {
    const out = new Map<string, [number, number]>();
    shards.forEach((s) => out.set(s.slug, s.centroid));
    islands.forEach((i) => out.set(i.slug, [i.x, i.y]));
    return out;
  }, [shards, islands]);

  const [hover, setHover] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [soundOn, setSoundOn] = useState(false);
  const [activeFilter, setActiveFilter] = useState<Technique | null>(null);
  const [zoom, setZoom] = useState(1);
  const ZOOM_MIN = 1;
  const ZOOM_MAX = 2.5;
  const ZOOM_STEP = 0.5;
  const zoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, roundSvg(z + ZOOM_STEP)));
  const zoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, roundSvg(z - ZOOM_STEP)));
  const zoomReset = () => setZoom(1);
  const audioRef = useRef<{ ctx: AudioContext; master: GainNode } | null>(null);
  const lastHoverRef = useRef<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
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
    master.gain.value = 0.35;
    master.connect(ctx.destination);
    audioRef.current = { ctx, master };
    return audioRef.current;
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    if (next) {
      const a = ensureAudio();
      if (a?.ctx.state === "suspended") a.ctx.resume();
    } else if (htmlAudioRef.current) {
      htmlAudioRef.current.pause();
    }
  };

  const triggerCue = (slug: string) => {
    if (!soundOn) return;
    const uploaded = uploadedSounds[slug];
    if (uploaded) {
      if (htmlAudioRef.current) {
        htmlAudioRef.current.pause();
      }
      const el = new Audio(uploaded);
      el.volume = 0.7;
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
    setVisited((v) => {
      if (v.has(slug)) return v;
      const n = new Set(v);
      n.add(slug);
      return n;
    });
    router.push(`/discover/${slug}`);
  };

  const isDimmed = (slug: string) => !!activeFilter && !TECHNIQUES_BY_COUNTRY[slug]?.has(activeFilter);

  const threadPoints = useMemo(() => {
    const pts: { slug: string; x: number; y: number }[] = [];
    THREAD_ROUTE.forEach((slug) => {
      const c = centroids.get(slug);
      if (c) pts.push({ slug, x: c[0], y: c[1] });
    });
    return pts;
  }, [centroids]);

  // Build a smooth Catmull-Rom path with a hand-drawn wobble on the control points.
  const threadPath = useMemo(() => {
    if (threadPoints.length < 2) return "";
    const p = threadPoints;
    const seedRand = (i: number) => {
      const s = Math.sin(i * 91.37 + 12.9898) * 43758.5453;
      return (s - Math.floor(s)) * 2 - 1; // -1..1
    };
    let d = `M ${p[0].x.toFixed(2)} ${p[0].y.toFixed(2)}`;
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[i - 1] ?? p[i];
      const p1 = p[i];
      const p2 = p[i + 1];
      const p3 = p[i + 2] ?? p2;
      let c1x = p1.x + (p2.x - p0.x) / 6;
      let c1y = p1.y + (p2.y - p0.y) / 6;
      let c2x = p2.x - (p3.x - p1.x) / 6;
      let c2y = p2.y - (p3.y - p1.y) / 6;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const amp = Math.min(28, len * 0.14);
      c1x += nx * amp * seedRand(i * 2 + 1);
      c1y += ny * amp * seedRand(i * 2 + 1);
      c2x += nx * amp * seedRand(i * 2 + 2);
      c2y += ny * amp * seedRand(i * 2 + 2);
      d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    return d;
  }, [threadPoints]);

  const hoveredCountry = hover ? getCountryBySlug(hover) : null;
  const hoveredStats = hover ? getStats(hover) : null;

  return (
    <div className="nu-atlas">
      <div className="flex justify-end mb-4">
        <button
          onClick={toggleSound}
          aria-pressed={soundOn}
          className="inline-flex items-center gap-2 px-4 py-2 border border-[color:var(--atlas-border)] text-[color:var(--atlas-fg)] font-label-caps text-[10px] tracking-[0.28em] uppercase hover:border-[#D4AF78] hover:text-[#D4AF78] transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">
            {soundOn ? "volume_up" : "volume_off"}
          </span>
          {soundOn ? "Sound On" : "Sound Off"}
        </button>
      </div>

      <div
        ref={mapContainerRef}
        className="relative rounded-sm overflow-auto border border-[color:var(--atlas-border)] nu-atlas-canvas"
        onMouseLeave={() => {
          setHover(null);
          setTooltip(null);
        }}
      >
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "50% 50%",
            transition: "transform 250ms ease",
          }}
        >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto block select-none"
          role="img"
          aria-label="Interactive sculptural map of the 54 African countries"
        >
          <defs>
            <radialGradient id="atlasVignetteFull" cx="50%" cy="45%" r="70%">
              <stop offset="0%" stopColor="var(--atlas-vignette-in)" />
              <stop offset="55%" stopColor="rgba(0,0,0,0)" />
              <stop offset="100%" stopColor="var(--atlas-vignette-out)" />
            </radialGradient>

            <filter id="clayFull" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="0.6" result="blurA" />
              <feSpecularLighting
                in="blurA"
                surfaceScale="3"
                specularConstant="0.55"
                specularExponent="18"
                lightingColor="#fff2dc"
                result="spec"
              >
                <feDistantLight azimuth="135" elevation="55" />
              </feSpecularLighting>
              <feComposite in="spec" in2="SourceAlpha" operator="in" result="specMasked" />
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="grain" />
              <feColorMatrix
                in="grain"
                type="matrix"
                values="0 0 0 0 0.05
                        0 0 0 0 0.03
                        0 0 0 0 0.02
                        0 0 0 0.12 0"
                result="grainDark"
              />
              <feComposite in="grainDark" in2="SourceAlpha" operator="in" result="grainMasked" />
              <feMerge>
                <feMergeNode in="SourceGraphic" />
                <feMergeNode in="grainMasked" />
                <feMergeNode in="specMasked" />
              </feMerge>
            </filter>

            <filter id="shardShadowFull" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0.6" dy="1.2" stdDeviation="0.9" floodColor="#000" floodOpacity="0.55" />
              <feDropShadow dx="1.2" dy="3" stdDeviation="3.5" floodColor="#000" floodOpacity="0.35" />
            </filter>

            <filter id="shardErodeFull" x="-10%" y="-10%" width="120%" height="120%">
              <feMorphology in="SourceGraphic" operator="erode" radius="2" />
            </filter>

            <filter id="clayErodeFull" x="-10%" y="-10%" width="120%" height="120%">
              <feMorphology in="SourceGraphic" operator="erode" radius="2" result="eroded" />
              <feMorphology in="SourceAlpha" operator="erode" radius="2" result="erodedAlpha" />
              <feGaussianBlur in="erodedAlpha" stdDeviation="0.6" result="blurA" />
              <feSpecularLighting
                in="blurA"
                surfaceScale="3"
                specularConstant="0.55"
                specularExponent="18"
                lightingColor="#fff2dc"
                result="spec"
              >
                <feDistantLight azimuth="135" elevation="55" />
              </feSpecularLighting>
              <feComposite in="spec" in2="erodedAlpha" operator="in" result="specMasked" />
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="grain" />
              <feColorMatrix
                in="grain"
                type="matrix"
                values="0 0 0 0 0.05
                        0 0 0 0 0.03
                        0 0 0 0 0.02
                        0 0 0 0.12 0"
                result="grainDark"
              />
              <feComposite in="grainDark" in2="erodedAlpha" operator="in" result="grainMasked" />
              <feMerge>
                <feMergeNode in="eroded" />
                <feMergeNode in="grainMasked" />
                <feMergeNode in="specMasked" />
              </feMerge>
            </filter>

            {shards.map((s) => (
              <linearGradient key={s.slug} id={`full-fill-${s.slug}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={s.fill} />
                <stop offset="100%" stopColor={s.fillDark} />
              </linearGradient>
            ))}
          </defs>

          <rect width={W} height={H} fill="url(#atlasVignetteFull)" />

          {shards.map((shard) => {
            const country = getCountryBySlug(shard.slug);
            if (!country) return null;
            const isHover = hover === country.slug;
            const isVisited = visited.has(country.slug);
            const dimmed = isDimmed(country.slug);
            const stats = getStats(country.slug);
            const [dx, dy] = shard.drift;
            const centroidX = roundSvg(shard.centroid[0]);
            const centroidY = roundSvg(shard.centroid[1]);
            const transform = `translate(${roundSvg(dx)} ${roundSvg(dy)}) rotate(${roundSvg(shard.rotation)} ${centroidX} ${centroidY})`;
            const delay = (0.15 + shard.distFromCenter * 0.9).toFixed(2);

            return (
              <g
                key={country.slug}
                transform={transform}
                className={`nu-shard${isHover ? " is-hover" : ""}${isVisited ? " is-visited" : ""}${dimmed ? " is-dimmed" : ""}`}
                style={{ cursor: "pointer", animationDelay: `${delay}s` } as React.CSSProperties}
                onMouseEnter={(e) => {
                  setHover(country.slug);
                  const rect = mapContainerRef.current!.getBoundingClientRect();
                  setTooltip({
                    x: ((e.clientX - rect.left) / rect.width) * 100,
                    y: ((e.clientY - rect.top) / rect.height) * 100,
                  });
                  if (lastHoverRef.current !== country.slug) {
                    lastHoverRef.current = country.slug;
                    triggerCue(country.slug);
                  }
                }}
                onMouseMove={(e) => {
                  const rect = mapContainerRef.current!.getBoundingClientRect();
                  setTooltip({
                    x: ((e.clientX - rect.left) / rect.width) * 100,
                    y: ((e.clientY - rect.top) / rect.height) * 100,
                  });
                }}
                onMouseLeave={() => {
                  if (lastHoverRef.current === country.slug) lastHoverRef.current = null;
                }}
                onClick={() => enterCountry(country.slug)}
                tabIndex={0}
                role="button"
                aria-label={`${country.name} — ${stats.artistsCount} artists`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    triggerCue(country.slug);
                    enterCountry(country.slug);
                  }
                }}
              >
                <path
                  d={shard.path}
                  fill="#000"
                  opacity={0.55}
                  filter="url(#shardShadowFull)"
                  pointerEvents="none"
                />
                <path
                  d={shard.path}
                  fill={`url(#full-fill-${shard.slug})`}
                  stroke="rgba(0,0,0,0.6)"
                  strokeWidth={0.4}
                  strokeLinejoin="round"
                  filter="url(#clayErodeFull)"
                />
                <path
                  d={shard.path}
                  className="nu-shard-hover-wash"
                  fill="#f2c078"
                  filter="url(#shardErodeFull)"
                  pointerEvents="none"
                />
                <path
                  d={shard.path}
                  className="nu-shard-select-rim"
                  fill="none"
                  stroke="#D4AF78"
                  strokeWidth={1.4}
                  strokeLinejoin="round"
                  filter="url(#shardErodeFull)"
                  pointerEvents="none"
                />
                {stats.hasNew && (
                  <circle
                    cx={centroidX}
                    cy={roundSvg(centroidY - 6)}
                    r={3}
                    fill="#9F0D12"
                    stroke="#F5F2EE"
                    strokeWidth={0.6}
                    pointerEvents="none"
                  />
                )}
                <title>{country.name}</title>
              </g>
            );
          })}

          {islands.map((isle) => {
            const country = getCountryBySlug(isle.slug);
            if (!country) return null;
            const isHover = hover === isle.slug;
            const isVisited = visited.has(isle.slug);
            const dimmed = isDimmed(isle.slug);
            const stats = getStats(isle.slug);
            const palette = [
              ["#b8703a", "#6b3a18"],
              ["#c9a24a", "#7a5a1e"],
              ["#a37542", "#5a3818"],
              ["#d6b078", "#8a6a3a"],
              ["#8a5a2c", "#4a2f16"],
            ];
            const [fill, fillDark] = palette[isle.seed % palette.length];
            const gradId = `full-fill-isle-${isle.slug}`;
            const r = 4.5;
            const delay = (0.7 + (isle.seed % 5) * 0.08).toFixed(2);
            return (
              <g
                key={isle.slug}
                className={`nu-shard nu-island${isHover ? " is-hover" : ""}${isVisited ? " is-visited" : ""}${dimmed ? " is-dimmed" : ""}`}
                style={{ cursor: "pointer", animationDelay: `${delay}s` } as React.CSSProperties}
                onMouseEnter={(e) => {
                  setHover(isle.slug);
                  const rect = mapContainerRef.current!.getBoundingClientRect();
                  setTooltip({
                    x: ((e.clientX - rect.left) / rect.width) * 100,
                    y: ((e.clientY - rect.top) / rect.height) * 100,
                  });
                  if (lastHoverRef.current !== isle.slug) {
                    lastHoverRef.current = isle.slug;
                    triggerCue(isle.slug);
                  }
                }}
                onMouseMove={(e) => {
                  const rect = mapContainerRef.current!.getBoundingClientRect();
                  setTooltip({
                    x: ((e.clientX - rect.left) / rect.width) * 100,
                    y: ((e.clientY - rect.top) / rect.height) * 100,
                  });
                }}
                onMouseLeave={() => {
                  if (lastHoverRef.current === isle.slug) lastHoverRef.current = null;
                }}
                onClick={() => enterCountry(isle.slug)}
                tabIndex={0}
                role="button"
                aria-label={`${country.name} — ${stats.artistsCount} artists`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    triggerCue(isle.slug);
                    enterCountry(isle.slug);
                  }
                }}
              >
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={fill} />
                    <stop offset="100%" stopColor={fillDark} />
                  </linearGradient>
                </defs>
                <circle cx={isle.x} cy={isle.y} r={15} fill="transparent" />
                <circle
                  cx={isle.x}
                  cy={isle.y}
                  r={r}
                  fill={`url(#${gradId})`}
                  stroke="rgba(0,0,0,0.6)"
                  strokeWidth={0.8}
                  filter="url(#clayFull)"
                  pointerEvents="none"
                />
                <circle
                  cx={isle.x}
                  cy={isle.y}
                  r={r}
                  className="nu-shard-select-rim"
                  fill="none"
                  stroke="#D4AF78"
                  strokeWidth={1.2}
                  pointerEvents="none"
                />
                <title>{country.name}</title>
              </g>
            );
          })}

          {/* Hand-drawn red thread — subtly animated, connects curated hubs */}
          {threadPath && (
            <g pointerEvents="none" className="nu-thread-route" aria-hidden="true">
              <path
                d={threadPath}
                fill="none"
                stroke="#9F0D12"
                strokeOpacity={0.14}
                strokeWidth={5}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: "blur(2px)" }}
              />
              <path
                className="nu-thread-line"
                d={threadPath}
                fill="none"
                stroke="#9F0D12"
                strokeWidth={1.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {threadPoints.map((pt, i) => (
                <circle
                  key={pt.slug}
                  className="nu-thread-node"
                  cx={roundSvg(pt.x)}
                  cy={roundSvg(pt.y)}
                  r={2.4}
                  fill="#F5F2EE"
                  stroke="#9F0D12"
                  strokeWidth={1.1}
                  style={{ animationDelay: `${1.6 + i * 0.18}s` }}
                />
              ))}
            </g>
          )}
        </svg>
        </div>

        <div className="absolute top-4 right-4 flex flex-col border backdrop-blur-sm" style={{ background: "var(--atlas-tooltip-bg)", borderColor: "var(--atlas-border)" }}>
          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom >= ZOOM_MAX}
            aria-label="Zoom in"
            className="material-symbols-outlined w-10 h-10 flex items-center justify-center text-[color:var(--atlas-fg)] hover:text-[#D4AF78] disabled:opacity-30 transition-colors border-b"
            style={{ borderColor: "var(--atlas-border)" }}
          >
            add
          </button>
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom <= ZOOM_MIN}
            aria-label="Zoom out"
            className="material-symbols-outlined w-10 h-10 flex items-center justify-center text-[color:var(--atlas-fg)] hover:text-[#D4AF78] disabled:opacity-30 transition-colors border-b"
            style={{ borderColor: "var(--atlas-border)" }}
          >
            remove
          </button>
          <button
            type="button"
            onClick={zoomReset}
            disabled={zoom === 1}
            aria-label="Reset zoom"
            className="material-symbols-outlined w-10 h-10 flex items-center justify-center text-[color:var(--atlas-fg)] hover:text-[#D4AF78] disabled:opacity-30 transition-colors"
          >
            filter_center_focus
          </button>
        </div>

        {hoveredCountry && tooltip && (
          <div
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full"
            style={{
              left: `${tooltip.x}%`,
              top: `${tooltip.y}%`,
              marginTop: "-14px",
            }}
          >
            <div
              className="px-3 py-2 border backdrop-blur-md shadow-2xl min-w-[180px]"
              style={{ background: "var(--atlas-tooltip-bg)", borderColor: "var(--atlas-border)" }}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{hoveredCountry.flag}</span>
                <span className="font-display text-sm" style={{ color: "var(--atlas-fg)" }}>
                  {hoveredCountry.name}
                </span>
              </div>
              <div
                className="mt-1 font-label-caps text-[9px] tracking-[0.24em] uppercase"
                style={{ color: "var(--atlas-accent)" }}
              >
                {hoveredStats?.artistsCount} Artists · {hoveredStats?.worksCount} Works
              </div>
            </div>
          </div>
        )}

        <div
          className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 border backdrop-blur-sm"
          style={{ background: "var(--atlas-tooltip-bg)", borderColor: "var(--atlas-border)" }}
        >
          <span className="font-display text-lg leading-none" style={{ color: "var(--atlas-accent)" }}>
            54
          </span>
          <span
            className="font-label-caps text-[9px] tracking-[0.28em] uppercase"
            style={{ color: "var(--atlas-fg-muted)" }}
          >
            Countries
          </span>
        </div>
      </div>

      {/* Quick filters by medium */}
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveFilter(null)}
          className={`px-3 py-2 min-h-[40px] font-label-caps text-[10px] uppercase tracking-widest border transition-colors ${
            !activeFilter
              ? "bg-[#9F0D12] text-[#F5F2EE] border-[#9F0D12]"
              : "border-[color:var(--atlas-border)] text-[color:var(--atlas-fg)] hover:border-[#D4AF78]"
          }`}
        >
          All
        </button>
        {TECHNIQUES.map((t) => (
          <button
            key={t}
            onClick={() => setActiveFilter(activeFilter === t ? null : t)}
            className={`px-3 py-2 min-h-[40px] font-label-caps text-[10px] uppercase tracking-widest border transition-colors ${
              activeFilter === t
                ? "bg-[#9F0D12] text-[#F5F2EE] border-[#9F0D12]"
                : "border-[color:var(--atlas-border)] text-[color:var(--atlas-fg)] hover:border-[#D4AF78]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
