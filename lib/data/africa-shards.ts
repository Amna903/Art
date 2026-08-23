// 3D Sculptural Clay/Wood Atlas geometry & palette system for NU-ART.
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
    topLight: "#C5917D",
    topBase: "#B58770",
    topDark: "#9C6E59",
    sideDark: "#2F1B14",
    sideMid: "#4A2B20",
    bevelHighlight: "rgba(255, 240, 235, 0.4)",
  },
  // 2. Golden Sahara Ochre Tan (Mali, South Africa, Angola, Ghana)
  ochre_tan: {
    name: "Sahara Ochre",
    topLight: "#E8C59A",
    topBase: "#DEB484",
    topDark: "#C69966",
    sideDark: "#342215",
    sideMid: "#523722",
    bevelHighlight: "rgba(255, 250, 240, 0.45)",
  },
  // 3. Light Honey Sand (Egypt, Libya, Senegal, Mozambique, Tunisia)
  honey_sand: {
    name: "Honey Sand",
    topLight: "#E2C4A2",
    topBase: "#D7B690",
    topDark: "#BD9970",
    sideDark: "#362417",
    sideMid: "#543A26",
    bevelHighlight: "rgba(255, 248, 238, 0.45)",
  },
  // 4. Caramel Butterscotch (Morocco, Madagascar, Somalia, Cameroon)
  caramel: {
    name: "Caramel Butterscotch",
    topLight: "#D6A57B",
    topBase: "#C2916B",
    topDark: "#A9754E",
    sideDark: "#321E11",
    sideMid: "#4E311B",
    bevelHighlight: "rgba(255, 246, 235, 0.4)",
  },
  // 5. Muted Sage Olive (Niger, Botswana, Gabon, Congo, CAR, Uganda, Chad)
  olive_sage: {
    name: "Sage Olive",
    topLight: "#B3B09C",
    topBase: "#9E9A86",
    topDark: "#83806C",
    sideDark: "#26251C",
    sideMid: "#3E3C2E",
    bevelHighlight: "rgba(250, 252, 245, 0.4)",
  },
  // 6. Dusty Cocoa Mauve (Nigeria, Zambia, Sierra Leone)
  cocoa_mauve: {
    name: "Cocoa Mauve",
    topLight: "#B4998B",
    topBase: "#9F8477",
    topDark: "#84695D",
    sideDark: "#2A1C15",
    sideMid: "#432D22",
    bevelHighlight: "rgba(252, 244, 240, 0.4)",
  },
  // 7. Taupe Stone (Mauritania, Tanzania, Zimbabwe, Namibia, Benin, Guinea, Liberia)
  taupe_stone: {
    name: "Taupe Stone",
    topLight: "#C0B3A3",
    topBase: "#A89C8C",
    topDark: "#8B7F6F",
    sideDark: "#2C2620",
    sideMid: "#463D34",
    bevelHighlight: "rgba(252, 250, 248, 0.4)",
  },
};

// Hand-tuned mapping for all 54 African countries matching the reference photo color distribution
export const COUNTRY_PALETTE_MAP: Record<string, string> = {
  // North Africa
  "algeria": "terracotta",        // Large terracotta NW piece (#B58770)
  "morocco": "caramel",           // Caramel tan NW tip (#C2916B)
  "tunisia": "honey_sand",        // Honey sand North piece (#D7B690)
  "libya": "honey_sand",          // Light honey sand North piece (#D7B690 / #C59570)
  "egypt": "honey_sand",          // Creamy camel sand NE piece (#D7B690)
  "sudan": "terracotta",          // Soft terracotta mauve piece (#AC7E6A)
  "south-sudan": "olive_sage",    // Muted sage piece south of Sudan (#9E9A86)

  // West Africa
  "mauritania": "taupe_stone",    // Taupe stone piece (#A89C8C)
  "mali": "ochre_tan",            // Bright ochre tan piece (#DEB484)
  "senegal": "honey_sand",        // Honey sand west tip (#D7B690)
  "gambia": "terracotta",         // Terracotta accent strip (#B58770)
  "guinea-bissau": "taupe_stone", // Taupe stone piece (#A89C8C)
  "guinea": "taupe_stone",        // Taupe stone piece (#A89C8C)
  "sierra-leone": "olive_sage",   // Olive sage piece (#9E9A86)
  "liberia": "taupe_stone",       // Taupe stone piece (#A89C8C)
  "ivory-coast": "terracotta",    // Terracotta piece (#B58770)
  "ghana": "ochre_tan",           // Ochre tan piece (#DEB484)
  "togo": "olive_sage",           // Olive sage strip (#9E9A86)
  "benin": "taupe_stone",         // Taupe stone strip (#A89C8C)
  "niger": "olive_sage",          // Olive/sage green-grey piece (#9E9A86)
  "nigeria": "cocoa_mauve",       // Cocoa mauve brown piece (#9F8477)
  "burkina-faso": "olive_sage",   // Olive sage piece (#9E9A86)
  "cabo-verde": "ochre_tan",      // Ochre droplet pin (#DEB484)

  // Central Africa
  "chad": "taupe_stone",          // Taupe mineral grey piece (#A89C8C)
  "cameroon": "caramel",          // Caramel tan piece (#C2916B)
  "central-african-republic": "olive_sage", // Olive sage piece (#9E9A86)
  "gabon": "olive_sage",          // Olive sage piece (#9E9A86)
  "congo": "olive_sage",          // Olive sage piece (#9E9A86)
  "drc": "terracotta",            // Huge terracotta block in the center (#B58770)
  "equatorial-guinea": "caramel", // Caramel tan piece (#C2916B)
  "sao-tome": "cocoa_mauve",      // Cocoa droplet pin (#9F8477)

  // East Africa
  "eritrea": "taupe_stone",       // Taupe stone piece (#A89C8C)
  "ethiopia": "terracotta",       // Large terracotta Horn piece (#B58770)
  "djibouti": "caramel",          // Caramel tan strip (#C2916B)
  "somalia": "caramel",           // Long caramel tan strip along the coast (#C2916B)
  "uganda": "olive_sage",         // Olive sage piece (#9E9A86)
  "kenya": "taupe_stone",         // Taupe stone piece (#A89C8C)
  "rwanda": "terracotta",         // Terracotta piece (#B58770)
  "burundi": "olive_sage",        // Olive sage piece (#9E9A86)
  "tanzania": "taupe_stone",      // Taupe mineral grey piece (#A89C8C)
  "seychelles": "honey_sand",     // Honey sand droplet (#D7B690)
  "comoros": "olive_sage",        // Olive droplet (#9E9A86)
  "mauritius": "ochre_tan",       // Ochre droplet (#DEB484)

  // Southern Africa
  "angola": "ochre_tan",          // Light ochre sand piece (#DEB484)
  "zambia": "cocoa_mauve",        // Cocoa mauve brown piece (#9F8477)
  "malawi": "terracotta",         // Terracotta strip (#B58770)
  "mozambique": "honey_sand",     // Honey sand coastal piece (#D7B690)
  "zimbabwe": "taupe_stone",      // Taupe mineral grey piece (#A89C8C)
  "botswana": "olive_sage",       // Olive sage green piece (#9E9A86)
  "namibia": "terracotta",        // Soft terracotta brown SW piece (#B58770)
  "south-africa": "ochre_tan",    // Large ochre tan piece at the bottom (#DEB484)
  "lesotho": "cocoa_mauve",       // Enclave pebble (#9F8477)
  "eswatini": "terracotta",       // Enclave pebble (#B58770)
  "madagascar": "caramel",        // Butterscotch caramel island piece (#C2916B)
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
