// 3D Sculptural Clay/Wood Atlas geometry & palette system for NUA-ARTE.
// Direct pixel-accurate color sampling from the reference image:
// Soft dusty terracotta, honey sand tan, golden ochre, muted sage olive,
// dusty cocoa mauve, caramel butterscotch, and warm taupe stone.

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

// Exact color swatches sampled directly from the reference image
export const CLAY_PALETTES: Record<string, ClayPalette> = {
  // 1. Soft Dusty Terracotta (Algeria, Sudan, Ethiopia, DRC, Ivory Coast, Rwanda, Malawi)
  terracotta: {
    name: "Dusty Terracotta",
    topLight: "#9B9B9B",
    topBase: "#8F8F8F",
    topDark: "#767676",
    sideDark: "#1F1F1F",
    sideMid: "#313131",
    bevelHighlight: "rgba(255, 255, 255, 0.4)",
  },
  // 2. Golden Sahara Ochre Tan (Mali, South Africa, Angola, Ghana)
  ochre_tan: {
    name: "Sahara Ochre",
    topLight: "#C9C9C9",
    topBase: "#B9B9B9",
    topDark: "#9F9F9F",
    sideDark: "#252525",
    sideMid: "#3B3B3B",
    bevelHighlight: "rgba(255, 255, 255, 0.45)",
  },
  // 3. Light Honey Sand (Egypt, Libya, Senegal, Mozambique, Tunisia)
  honey_sand: {
    name: "Honey Sand",
    topLight: "#C8C8C8",
    topBase: "#BABABA",
    topDark: "#9E9E9E",
    sideDark: "#272727",
    sideMid: "#3E3E3E",
    bevelHighlight: "rgba(255, 255, 255, 0.45)",
  },
  // 4. Caramel Butterscotch (Morocco, Madagascar, Somalia, Cameroon)
  caramel: {
    name: "Caramel Butterscotch",
    topLight: "#FF4D57",
    topBase: "#999999",
    topDark: "#7D7D7D",
    sideDark: "#212121",
    sideMid: "#363636",
    bevelHighlight: "rgba(255, 255, 255, 0.4)",
  },
  // 5. Muted Sage Olive (Niger, Botswana, Gabon, Congo, CAR, Uganda, Chad)
  olive_sage: {
    name: "Sage Olive",
    topLight: "#AFAFAF",
    topBase: "#999999",
    topDark: "#7F7F7F",
    sideDark: "#252525",
    sideMid: "#3B3B3B",
    bevelHighlight: "rgba(255, 255, 255, 0.4)",
  },
  // 6. Dusty Cocoa Mauve (Nigeria, Zambia, Sierra Leone)
  cocoa_mauve: {
    name: "Cocoa Mauve",
    topLight: "#9E9E9E",
    topBase: "#898989",
    topDark: "#6E6E6E",
    sideDark: "#1E1E1E",
    sideMid: "#313131",
    bevelHighlight: "rgba(255, 255, 255, 0.4)",
  },
  // 7. Taupe Stone (Mauritania, Tanzania, Zimbabwe, Namibia, Benin, Guinea, Liberia)
  taupe_stone: {
    name: "Taupe Stone",
    topLight: "#B5B5B5",
    topBase: "#9D9D9D",
    topDark: "#808080",
    sideDark: "#272727",
    sideMid: "#3E3E3E",
    bevelHighlight: "rgba(255, 255, 255, 0.4)",
  },
};

// Hand-tuned mapping for all 54 African countries matching the reference photo color distribution
export const COUNTRY_PALETTE_MAP: Record<string, string> = {
  // North Africa
  "algeria": "terracotta",        // Large terracotta NW piece (#8F8F8F)
  "morocco": "caramel",           // Caramel tan NW tip (#999999)
  "tunisia": "honey_sand",        // Honey sand North piece (#BABABA)
  "libya": "honey_sand",          // Light honey sand North piece (#BABABA / #9D9D9D)
  "egypt": "honey_sand",          // Creamy camel sand NE piece (#BABABA)
  "sudan": "terracotta",          // Soft terracotta mauve piece (#868686)
  "south-sudan": "olive_sage",    // Muted sage piece south of Sudan (#999999)

  // West Africa
  "mauritania": "taupe_stone",    // Taupe stone piece (#9D9D9D)
  "mali": "ochre_tan",            // Bright ochre tan piece (#B9B9B9)
  "senegal": "honey_sand",        // Honey sand west tip (#BABABA)
  "gambia": "terracotta",         // Terracotta accent strip (#8F8F8F)
  "guinea-bissau": "taupe_stone", // Taupe stone piece (#9D9D9D)
  "guinea": "taupe_stone",        // Taupe stone piece (#9D9D9D)
  "sierra-leone": "olive_sage",   // Olive sage piece (#999999)
  "liberia": "taupe_stone",       // Taupe stone piece (#9D9D9D)
  "ivory-coast": "terracotta",    // Terracotta piece (#8F8F8F)
  "ghana": "ochre_tan",           // Ochre tan piece (#B9B9B9)
  "togo": "olive_sage",           // Olive sage strip (#999999)
  "benin": "taupe_stone",         // Taupe stone strip (#9D9D9D)
  "niger": "olive_sage",          // Olive/sage green-grey piece (#999999)
  "nigeria": "cocoa_mauve",       // Cocoa mauve brown piece (#898989)
  "burkina-faso": "olive_sage",   // Olive sage piece (#999999)
  "cabo-verde": "ochre_tan",      // Ochre droplet pin (#B9B9B9)

  // Central Africa
  "chad": "taupe_stone",          // Taupe mineral grey piece (#9D9D9D)
  "cameroon": "caramel",          // Caramel tan piece (#999999)
  "central-african-republic": "olive_sage", // Olive sage piece (#999999)
  "gabon": "olive_sage",          // Olive sage piece (#999999)
  "congo": "olive_sage",          // Olive sage piece (#999999)
  "drc": "terracotta",            // Huge terracotta block in the center (#8F8F8F)
  "equatorial-guinea": "caramel", // Caramel tan piece (#999999)
  "sao-tome": "cocoa_mauve",      // Cocoa droplet pin (#898989)

  // East Africa
  "eritrea": "taupe_stone",       // Taupe stone piece (#9D9D9D)
  "ethiopia": "terracotta",       // Large terracotta Horn piece (#8F8F8F)
  "djibouti": "caramel",          // Caramel tan strip (#999999)
  "somalia": "caramel",           // Long caramel tan strip along the coast (#999999)
  "uganda": "olive_sage",         // Olive sage piece (#999999)
  "kenya": "taupe_stone",         // Taupe stone piece (#9D9D9D)
  "rwanda": "terracotta",         // Terracotta piece (#8F8F8F)
  "burundi": "olive_sage",        // Olive sage piece (#999999)
  "tanzania": "taupe_stone",      // Taupe mineral grey piece (#9D9D9D)
  "seychelles": "honey_sand",     // Honey sand droplet (#BABABA)
  "comoros": "olive_sage",        // Olive droplet (#999999)
  "mauritius": "ochre_tan",       // Ochre droplet (#B9B9B9)

  // Southern Africa
  "angola": "ochre_tan",          // Light ochre sand piece (#B9B9B9)
  "zambia": "cocoa_mauve",        // Cocoa mauve brown piece (#898989)
  "malawi": "terracotta",         // Terracotta strip (#8F8F8F)
  "mozambique": "honey_sand",     // Honey sand coastal piece (#BABABA)
  "zimbabwe": "taupe_stone",      // Taupe mineral grey piece (#9D9D9D)
  "botswana": "olive_sage",       // Olive sage green piece (#999999)
  "namibia": "terracotta",        // Soft terracotta brown SW piece (#8F8F8F)
  "south-africa": "ochre_tan",    // Large ochre tan piece at the bottom (#B9B9B9)
  "lesotho": "cocoa_mauve",       // Enclave pebble (#898989)
  "eswatini": "terracotta",       // Enclave pebble (#8F8F8F)
  "madagascar": "caramel",        // Butterscotch caramel island piece (#999999)
};

export function getClayPalette(slug: string): ClayPalette {
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

export function buildCountryShards(items: CountryInput[]): Shard[] {
  if (items.length === 0) return [];
  const cx = items.reduce((s, p) => s + p.centroid[0], 0) / items.length;
  const cy = items.reduce((s, p) => s + p.centroid[1], 0) / items.length;

  const dists = items.map((it) => Math.hypot(it.centroid[0] - cx, it.centroid[1] - cy));
  const maxDist = Math.max(...dists, 1);

  return items.map<Shard>((it, i) => {
    const palette = getClayPalette(it.slug);

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
