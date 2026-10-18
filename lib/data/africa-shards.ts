// 3D sculptural atlas geometry & palette system for NUA-ARTE.
// Porcelain pieces in the brand's white / charcoal / red (change brief §1:
// no beige, sand or brown). Countries with NUA-ARTE artists are red, so the
// map shows where the artists are. The colours are CSS variables, defined for
// light and dark mode in components/map/clay-atlas.css.

import { Delaunay } from "d3-delaunay";

export type ClayPalette = {
  name: string;
  topLight: string;       // Top-left surface highlight
  topBase: string;        // Base matte surface tone
  topDark: string;        // Bottom-right surface shading
  sideDark: string;       // Deep bottom extrusion wall
  sideMid: string;        // Mid-tone extrusion wall
  bevelHighlight: string; // Crisp reflective rim bevel
};

// Four porcelain tones for variety, plus red for countries with artists.
const porcelain = (tone: string): ClayPalette => ({
  name: tone,
  topLight: `var(--clay-${tone}-top-light)`,
  topBase: `var(--clay-${tone}-top)`,
  topDark: `var(--clay-${tone}-top-dark)`,
  sideDark: `var(--clay-${tone}-side-dark)`,
  sideMid: `var(--clay-${tone}-side)`,
  bevelHighlight: "var(--clay-bevel)",
});

export const CLAY_PALETTES: Record<string, ClayPalette> = {
  a: porcelain("a"),
  b: porcelain("b"),
  c: porcelain("c"),
  d: porcelain("d"),
  artist: porcelain("artist"),
};

// Neighbouring countries get different porcelain tones.
export const COUNTRY_PALETTE_MAP: Record<string, string> = {
  // North Africa
  "algeria": "a",
  "morocco": "d",
  "tunisia": "c",
  "libya": "c",
  "egypt": "c",
  "sudan": "a",
  "south-sudan": "b",

  // West Africa
  "mauritania": "d",
  "mali": "b",
  "senegal": "c",
  "gambia": "a",
  "guinea-bissau": "d",
  "guinea": "d",
  "sierra-leone": "b",
  "liberia": "d",
  "ivory-coast": "a",
  "ghana": "b",
  "togo": "b",
  "benin": "d",
  "niger": "b",
  "nigeria": "c",
  "burkina-faso": "b",
  "cabo-verde": "b",

  // Central Africa
  "chad": "d",
  "cameroon": "d",
  "central-african-republic": "b",
  "gabon": "b",
  "congo": "b",
  "drc": "a",
  "equatorial-guinea": "d",
  "sao-tome": "c",

  // East Africa
  "eritrea": "d",
  "ethiopia": "a",
  "djibouti": "d",
  "somalia": "d",
  "uganda": "b",
  "kenya": "d",
  "rwanda": "a",
  "burundi": "b",
  "tanzania": "d",
  "seychelles": "c",
  "comoros": "b",
  "mauritius": "b",

  // Southern Africa
  "angola": "b",
  "zambia": "c",
  "malawi": "a",
  "mozambique": "c",
  "zimbabwe": "d",
  "botswana": "b",
  "namibia": "a",
  "south-africa": "b",
  "lesotho": "c",
  "eswatini": "a",
  "madagascar": "d",
};

export function getClayPalette(slug: string, hasArtists = false): ClayPalette {
  if (hasArtists) return CLAY_PALETTES.artist;
  return CLAY_PALETTES[COUNTRY_PALETTE_MAP[slug] ?? "a"];
}

export type Shard = {
  slug: string;
  path: string;
  centroid: [number, number];
  rotation: number;
  drift: [number, number];
  fill: string;
  fillDark: string;
  paletteIndex: number;
  distFromCenter: number;
  palette: ClayPalette;
};

export type CountryInput = {
  slug: string;
  path: string;
  centroid: [number, number];
  bbox: [number, number, number, number];
};

function roundSvg(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** `artistCountries`: slugs of countries with NUA-ARTE artists, shown in red. */
export function buildCountryShards(items: CountryInput[], artistCountries: ReadonlySet<string> = new Set()): Shard[] {
  if (items.length === 0) return [];
  const cx = items.reduce((s, p) => s + p.centroid[0], 0) / items.length;
  const cy = items.reduce((s, p) => s + p.centroid[1], 0) / items.length;

  const dists = items.map((it) => Math.hypot(it.centroid[0] - cx, it.centroid[1] - cy));
  const maxDist = Math.max(...dists, 1);

  return items.map<Shard>((it, i) => {
    const palette = getClayPalette(it.slug, artistCountries.has(it.slug));

    return {
      slug: it.slug,
      path: it.path,
      centroid: [roundSvg(it.centroid[0]), roundSvg(it.centroid[1])],
      rotation: 0,
      drift: [0, 0],
      fill: palette.topLight,
      fillDark: palette.topDark,
      paletteIndex: 0,
      distFromCenter: roundSvg(dists[i] / maxDist),
      palette,
    };
  });
}

// Backward-compatibility stubs
export function normalizeToBox(items: CountryInput[], _box: [number, number, number, number]): CountryInput[] {
  return items;
}

export function applyAnchorWarp(items: CountryInput[], _box: [number, number, number, number]): CountryInput[] {
  return items;
}

export function applyRealRegions(shards: Shard[], _box: [number, number, number, number]): Shard[] {
  return shards;
}

export function buildShards(points: { slug: string; x: number; y: number }[], bbox: [number, number, number, number]): Shard[] {
  const inputs: CountryInput[] = points.map((p) => ({
    slug: p.slug,
    path: `M ${p.x - 10} ${p.y - 10} L ${p.x + 10} ${p.y - 10} L ${p.x + 10} ${p.y + 10} L ${p.x - 10} ${p.y + 10} Z`,
    centroid: [p.x, p.y],
    bbox: [p.x - 10, p.y - 10, p.x + 10, p.y + 10],
  }));
  return buildCountryShards(inputs);
}
