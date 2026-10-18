// 3D sculptural clay atlas geometry & palette system for NUA-ARTE.
// Red clay tones (blush, rose, brick, oxblood) so the map keeps its sculpted,
// earthy feel within the white / charcoal / red identity (change brief §1),
// with countries that have NUA-ARTE artists in the brand red.

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

export const CLAY_PALETTES: Record<string, ClayPalette> = {
  // Countries with NUA-ARTE artists: the brand red, so the map shows where
  // the artists are.
  artist: {
    name: "NUA-ARTE Red",
    topLight: "#FF4D57",
    topBase: "#D7141E",
    topDark: "#B0000E",
    sideDark: "#4A1013",
    sideMid: "#7A0A10",
    bevelHighlight: "rgba(255, 235, 236, 0.45)",
  },
  terracotta: {
    name: "Brick Clay",
    topLight: "#C98A80",
    topBase: "#B87268",
    topDark: "#9C5A51",
    sideDark: "#3A1A16",
    sideMid: "#5A2A24",
    bevelHighlight: "rgba(255, 240, 238, 0.4)",
  },
  ochre_tan: {
    name: "Rose Clay",
    topLight: "#E3B9B0",
    topBase: "#D6A49A",
    topDark: "#BE887E",
    sideDark: "#3E201B",
    sideMid: "#5E342D",
    bevelHighlight: "rgba(255, 245, 243, 0.45)",
  },
  honey_sand: {
    name: "Blush Clay",
    topLight: "#EED3CC",
    topBase: "#E4C0B7",
    topDark: "#CDA298",
    sideDark: "#40241F",
    sideMid: "#603A33",
    bevelHighlight: "rgba(255, 248, 246, 0.45)",
  },
  caramel: {
    name: "Coral Clay",
    topLight: "#D99A8C",
    topBase: "#C9837A",
    topDark: "#AD6A60",
    sideDark: "#3A1C17",
    sideMid: "#58302A",
    bevelHighlight: "rgba(255, 242, 240, 0.4)",
  },
  olive_sage: {
    name: "Ash Rose",
    topLight: "#CDB8B4",
    topBase: "#BBA39F",
    topDark: "#9F8783",
    sideDark: "#2C2220",
    sideMid: "#463634",
    bevelHighlight: "rgba(252, 246, 245, 0.4)",
  },
  cocoa_mauve: {
    name: "Oxblood Clay",
    topLight: "#A86A66",
    topBase: "#955754",
    topDark: "#7A4341",
    sideDark: "#2A1312",
    sideMid: "#44201E",
    bevelHighlight: "rgba(252, 238, 236, 0.35)",
  },
  taupe_stone: {
    name: "Stone Rose",
    topLight: "#D8C6C2",
    topBase: "#C8B3AE",
    topDark: "#AE9893",
    sideDark: "#2E2523",
    sideMid: "#4A3B38",
    bevelHighlight: "rgba(252, 249, 248, 0.4)",
  },
};

// Hand-tuned mapping for all 54 African countries matching the reference photo color distribution
export const COUNTRY_PALETTE_MAP: Record<string, string> = {
  // North Africa
  "algeria": "terracotta",
  "morocco": "caramel",
  "tunisia": "honey_sand",
  "libya": "honey_sand",
  "egypt": "honey_sand",
  "sudan": "terracotta",
  "south-sudan": "olive_sage",

  // West Africa
  "mauritania": "taupe_stone",
  "mali": "ochre_tan",
  "senegal": "honey_sand",
  "gambia": "terracotta",
  "guinea-bissau": "taupe_stone",
  "guinea": "taupe_stone",
  "sierra-leone": "olive_sage",
  "liberia": "taupe_stone",
  "ivory-coast": "terracotta",
  "ghana": "ochre_tan",
  "togo": "olive_sage",
  "benin": "taupe_stone",
  "niger": "olive_sage",
  "nigeria": "cocoa_mauve",
  "burkina-faso": "olive_sage",
  "cabo-verde": "ochre_tan",

  // Central Africa
  "chad": "taupe_stone",
  "cameroon": "caramel",
  "central-african-republic": "olive_sage",
  "gabon": "olive_sage",
  "congo": "olive_sage",
  "drc": "terracotta",
  "equatorial-guinea": "caramel",
  "sao-tome": "cocoa_mauve",

  // East Africa
  "eritrea": "taupe_stone",
  "ethiopia": "terracotta",
  "djibouti": "caramel",
  "somalia": "caramel",
  "uganda": "olive_sage",
  "kenya": "taupe_stone",
  "rwanda": "terracotta",
  "burundi": "olive_sage",
  "tanzania": "taupe_stone",
  "seychelles": "honey_sand",
  "comoros": "olive_sage",
  "mauritius": "ochre_tan",

  // Southern Africa
  "angola": "ochre_tan",
  "zambia": "cocoa_mauve",
  "malawi": "terracotta",
  "mozambique": "honey_sand",
  "zimbabwe": "taupe_stone",
  "botswana": "olive_sage",
  "namibia": "terracotta",
  "south-africa": "ochre_tan",
  "lesotho": "cocoa_mauve",
  "eswatini": "terracotta",
  "madagascar": "caramel",
};

export function getClayPalette(slug: string, hasArtists = false): ClayPalette {
  if (hasArtists) return CLAY_PALETTES.artist;
  const key = COUNTRY_PALETTE_MAP[slug] ?? "ochre_tan";
  return CLAY_PALETTES[key] ?? CLAY_PALETTES.ochre_tan;
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
