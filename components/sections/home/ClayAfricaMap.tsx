"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { geoConicEqualArea, geoPath } from "d3-geo";
import africaGeo from "@/lib/data/africa-geo.json";
import { ISLAND_PINS, getCountryByGeoName, getCountryBySlug } from "@/lib/data/africa";
import { buildCountryShards, type CountryInput, type Shard } from "@/lib/data/africa-shards";

const W = 900;
const H = 900;

type FeatureLike = {
  type: "Feature";
  properties: { ADMIN: string; ISO_A3: string };
  geometry: GeoJSON.Geometry;
};

/**
 * A lighter, read-only sibling of the homepage AtlasMap's shard rendering —
 * same clay/sculpted-piece filter chain and earthy palette (lib/data/africa-shards.ts),
 * but without the hover-sound system. Used by the dark hero redesign.
 */
export function ClayAfricaMap({
  onHover,
  className = "",
}: {
  onHover?: (name: string | null) => void;
  className?: string;
}) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<string | null>(null);

  const features = (africaGeo as unknown as { features: FeatureLike[] }).features;

  const projection = useMemo(() => {
    const p = geoConicEqualArea().rotate([-20, 0]).parallels([-15, 30]);
    p.fitExtent(
      [
        [30, 20],
        [W - 30, H - 30],
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

  const goTo = (slug: string) => router.push(`/discover/${slug}`);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      role="img"
      aria-label="Interactive map of Africa — click a country to explore"
    >
      <defs>
        <filter id="heroShardShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0.6" dy="1.4" stdDeviation="1" floodColor="#000" floodOpacity="0.55" />
          <feDropShadow dx="1.4" dy="3.5" stdDeviation="4" floodColor="#000" floodOpacity="0.35" />
        </filter>
        <filter id="heroShardErode" x="-10%" y="-10%" width="120%" height="120%">
          <feMorphology in="SourceGraphic" operator="erode" radius="2" />
        </filter>
        <filter id="heroClayErode" x="-10%" y="-10%" width="120%" height="120%">
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
          <linearGradient key={s.slug} id={`hero-fill-${s.slug}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={s.fill} />
            <stop offset="100%" stopColor={s.fillDark} />
          </linearGradient>
        ))}
      </defs>

      {shards.map((shard) => {
        const country = getCountryBySlug(shard.slug);
        if (!country) return null;
        const isHover = hover === country.slug;
        const [dx, dy] = shard.drift;
        const transform = `translate(${dx} ${dy}) rotate(${shard.rotation} ${shard.centroid[0]} ${shard.centroid[1]})`;

        return (
          <g
            key={country.slug}
            transform={transform}
            style={{ cursor: "pointer", transition: "opacity 0.2s ease" }}
            opacity={hover && !isHover ? 0.55 : 1}
            onMouseEnter={() => {
              setHover(country.slug);
              onHover?.(country.name);
            }}
            onMouseLeave={() => {
              setHover((h) => (h === country.slug ? null : h));
              onHover?.(null);
            }}
            onClick={() => goTo(country.slug)}
            tabIndex={0}
            role="button"
            aria-label={country.name}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                goTo(country.slug);
              }
            }}
          >
            <path d={shard.path} fill="#000" opacity={0.55} filter="url(#heroShardShadow)" pointerEvents="none" />
            <path
              d={shard.path}
              fill={`url(#hero-fill-${shard.slug})`}
              stroke="rgba(0,0,0,0.6)"
              strokeWidth={0.4}
              strokeLinejoin="round"
              filter="url(#heroClayErode)"
              style={{
                transform: isHover ? "scale(1.03)" : "scale(1)",
                transformOrigin: `${shard.centroid[0]}px ${shard.centroid[1]}px`,
                transition: "transform 0.25s cubic-bezier(0.22,1,0.36,1)",
              }}
            />
          </g>
        );
      })}

      {islands.map((isle) => {
        const country = getCountryBySlug(isle.slug);
        if (!country) return null;
        const isHover = hover === isle.slug;
        return (
          <circle
            key={isle.slug}
            cx={isle.x}
            cy={isle.y}
            r={isHover ? 6 : 4.5}
            fill="#8a7a5a"
            stroke="#000"
            strokeOpacity={0.4}
            strokeWidth={0.5}
            style={{ cursor: "pointer", transition: "r 0.2s ease" }}
            onMouseEnter={() => {
              setHover(isle.slug);
              onHover?.(country.name);
            }}
            onMouseLeave={() => {
              setHover((h) => (h === isle.slug ? null : h));
              onHover?.(null);
            }}
            onClick={() => goTo(isle.slug)}
            tabIndex={0}
            role="button"
            aria-label={country.name}
          />
        );
      })}
    </svg>
  );
}
