// Procedural "shard" geometry for the abstract atlas on /discover.
// Each of the 54 African countries becomes an irregular polygon derived
// from its real centroid, tiled via a Voronoi diagram and then perturbed
// to feel hand-cut. Deterministic (seeded PRNG) so the layout is stable
// across renders and SSR.

import { Delaunay } from "d3-delaunay";

export type Shard = {
  slug: string;
  path: string;
  centroid: [number, number];
  rotation: number; // degrees, for the "distorted" feel
  drift: [number, number]; // px offset outward from continent centre
  fill: string; // top gradient stop — earthy palette
  fillDark: string; // bottom gradient stop — same hue, deeper
  paletteIndex: number;
  distFromCenter: number; // used for staggered entrance animation
};

// Curated earthy palette — clay, terracotta, ochre, olive, bronze, ivory.
// Each entry: [topLight, bottomDark] for a 135° gradient.
const EARTH_PALETTE: Array<[string, string]> = [
  ["#8a5a2c", "#4a2f16"], // deep chocolate brown
  ["#b8703a", "#6b3a18"], // terracotta
  ["#a6572a", "#5a2c10"], // burnt sienna
  ["#c48b4a", "#78471e"], // aged copper
  ["#c9a24a", "#7a5a1e"], // mustard ochre
  ["#d6b078", "#8a6a3a"], // sand beige
  ["#e0c9a0", "#9a7d4c"], // aged ivory
  ["#8a8248", "#4e4820"], // dry olive green
  ["#6f6a4a", "#3a3620"], // warm khaki
  ["#96806a", "#4e3e2c"], // warm grey
  ["#a37542", "#5a3818"], // matte bronze
  ["#7a4a2a", "#3e2110"], // dark clay
];

type Point = { slug: string; x: number; y: number };

function roundSvg(n: number): number {
  return Math.round(n * 1000) / 1000;
}

// tiny seeded PRNG
function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Build shards for all countries. `points` should contain the projected
 * centroid (SVG coords) for each of the 54 countries.
 *
 * bbox = [x, y, x+w, y+h] of the drawable canvas.
 */
export function buildShards(points: Point[], bbox: [number, number, number, number]): Shard[] {
  // Continental centre for outward drift
  const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length;

  // Actual extent of real country centroids — the ghost hull hugs this,
  // so real countries form the readable African silhouette.
  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const rX = (maxX - minX) / 2;
  const rY = (maxY - minY) / 2;

  // Africa silhouette samples, normalised offsets from continent centre.
  // dx/dy = 1 puts a ghost right at the outermost real centroid; we push
  // slightly further out (×1.18) so the boundary cells stay a plausible size.
  const HULL: Array<[number, number]> = [
    // Mediterranean north coast
    [-0.55, -1.08], [-0.20, -1.10], [0.10, -1.10], [0.40, -1.08], [0.65, -1.02],
    // NE + Red Sea + Horn
    [0.85, -0.85], [1.02, -0.55], [1.15, -0.25], [1.20, 0.05], [1.05, 0.20],
    // East coast (Somalia → Tanzania → Mozambique)
    [0.85, 0.35], [0.85, 0.55], [0.80, 0.75], [0.65, 0.95],
    // Southern tip (Cape)
    [0.35, 1.15], [0.05, 1.20], [-0.25, 1.15],
    // SW + Namibia/Angola coast
    [-0.50, 1.00], [-0.65, 0.80], [-0.65, 0.55], [-0.55, 0.35],
    // Gulf of Guinea inward notch
    [-0.42, 0.20], [-0.55, 0.05],
    // West coast bulge (Nigeria → Senegal)
    [-0.90, -0.05], [-1.10, -0.22], [-1.20, -0.45], [-1.15, -0.68],
    [-1.05, -0.88], [-0.88, -1.02],
  ];
  const ghostPoints: Point[] = HULL.map(([dx, dy], i) => ({
    slug: `__ghost_${i}`,
    x: cx + dx * rX * 1.18,
    y: cy + dy * rY * 1.18,
  }));
  const allPts = [...points, ...ghostPoints];

  // Voronoi across real + ghost points, clipped to the bbox
  const flat = new Float64Array(allPts.length * 2);
  allPts.forEach((p, i) => {
    flat[i * 2] = p.x;
    flat[i * 2 + 1] = p.y;
  });
  const delaunay = new Delaunay(flat);
  const voronoi = delaunay.voronoi(bbox);

  // First pass: geometry + per-point neighbour list (real countries only)
  type Draft = {
    slug: string;
    path: string;
    centroid: [number, number];
    rotation: number;
    drift: [number, number];
    neighbors: number[];
    distFromCenter: number;
  };
  const drafts: Draft[] = [];

  points.forEach((p, i) => {
    const poly = voronoi.cellPolygon(i);
    if (!poly) return;

    const rand = mulberry32(hashStr(p.slug));

    const shrink = 0.92 + rand() * 0.05;
    const perturbed = poly.map(([x, y]) => {
      const dx = (rand() - 0.5) * 6;
      const dy = (rand() - 0.5) * 6;
      const sx = p.x + (x - p.x) * shrink + dx;
      const sy = p.y + (y - p.y) * shrink + dy;
      return [sx, sy] as [number, number];
    });
    const path = polygonToPath(perturbed);

    const vx = p.x - cx;
    const vy = p.y - cy;
    const len = Math.hypot(vx, vy) || 1;
    const driftAmt = 1.5 + rand() * 2.5;
    const drift: [number, number] = [(vx / len) * driftAmt, (vy / len) * driftAmt];
    const rotation = (rand() - 0.5) * 4;

    const neighbors: number[] = [];
    for (const n of voronoi.neighbors(i)) {
      if (n < points.length) neighbors.push(n);
    }

    drafts.push({
      slug: p.slug,
      path,
      centroid: [p.x, p.y],
      rotation,
      drift,
      neighbors,
      distFromCenter: len,
    });
  });

  // Second pass: assign a palette index that differs from all already-assigned
  // neighbours (greedy, deterministic by slug hash order).
  const idxBySlug = new Map<string, number>();
  const paletteBySlug = new Map<string, number>();
  drafts.forEach((d, i) => idxBySlug.set(d.slug, i));

  const order = drafts
    .map((d, i) => ({ i, h: hashStr(d.slug) }))
    .sort((a, b) => a.h - b.h);

  for (const { i } of order) {
    const d = drafts[i];
    const rand = mulberry32(hashStr(d.slug));
    const start = Math.floor(rand() * EARTH_PALETTE.length);
    const used = new Set<number>();
    for (const n of d.neighbors) {
      const nSlug = points[n]?.slug;
      const p = nSlug ? paletteBySlug.get(nSlug) : undefined;
      if (p !== undefined) used.add(p);
    }
    let pick = start;
    for (let k = 0; k < EARTH_PALETTE.length; k++) {
      const cand = (start + k) % EARTH_PALETTE.length;
      if (!used.has(cand)) {
        pick = cand;
        break;
      }
    }
    paletteBySlug.set(d.slug, pick);
  }

  const maxDist = Math.max(...drafts.map((d) => d.distFromCenter), 1);

  return drafts.map<Shard>((d) => {
    const pIdx = paletteBySlug.get(d.slug) ?? 0;
    const [fill, fillDark] = EARTH_PALETTE[pIdx];
    return {
      slug: d.slug,
      path: d.path,
      centroid: [roundSvg(d.centroid[0]), roundSvg(d.centroid[1])],
      rotation: roundSvg(d.rotation),
      drift: [roundSvg(d.drift[0]), roundSvg(d.drift[1])],
      fill,
      fillDark,
      paletteIndex: pIdx,
      distFromCenter: roundSvg(d.distFromCenter / maxDist),
    };
  });
}

// Close a polygon with sharp corners — Voronoi cells are already convex
// enough that straight edges read as "hand-cut" once perturbed.
function polygonToPath(pts: [number, number][]): string {
  if (pts.length === 0) return "";
  const [x0, y0] = pts[0];
  let d = `M ${x0.toFixed(2)} ${y0.toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)}`;
  }
  d += " Z";
  return d;
}

// ---------------------------------------------------------------------------
// Realistic silhouette variant: builds Shard[] from real geojson-derived paths.
// Each item must already carry its projected SVG path, centroid, and bbox
// (in SVG coordinates). We only assign an earthy palette with a soft
// anti-adjacency rule based on bbox proximity.
// ---------------------------------------------------------------------------

export type CountryInput = {
  slug: string;
  path: string;
  centroid: [number, number];
  bbox: [number, number, number, number]; // [x0, y0, x1, y1]
};

export function buildCountryShards(items: CountryInput[]): Shard[] {
  if (items.length === 0) return [];
  const cx = items.reduce((s, p) => s + p.centroid[0], 0) / items.length;
  const cy = items.reduce((s, p) => s + p.centroid[1], 0) / items.length;

  // Approximate neighbour graph: two countries neighbour if their bboxes
  // overlap or are within a small tolerance of each other.
  const TOL = 4;
  const neighbours: number[][] = items.map(() => []);
  for (let i = 0; i < items.length; i++) {
    const a = items[i].bbox;
    for (let j = i + 1; j < items.length; j++) {
      const b = items[j].bbox;
      const overlaps =
        a[0] - TOL <= b[2] &&
        a[2] + TOL >= b[0] &&
        a[1] - TOL <= b[3] &&
        a[3] + TOL >= b[1];
      if (overlaps) {
        neighbours[i].push(j);
        neighbours[j].push(i);
      }
    }
  }

  // Greedy palette assignment ordered by slug hash for determinism.
  const paletteBySlug = new Map<string, number>();
  const order = items
    .map((it, i) => ({ i, h: hashStr(it.slug) }))
    .sort((a, b) => a.h - b.h);
  for (const { i } of order) {
    const it = items[i];
    const rand = mulberry32(hashStr(it.slug));
    const start = Math.floor(rand() * EARTH_PALETTE.length);
    const used = new Set<number>();
    for (const n of neighbours[i]) {
      const p = paletteBySlug.get(items[n].slug);
      if (p !== undefined) used.add(p);
    }
    let pick = start;
    for (let k = 0; k < EARTH_PALETTE.length; k++) {
      const cand = (start + k) % EARTH_PALETTE.length;
      if (!used.has(cand)) {
        pick = cand;
        break;
      }
    }
    paletteBySlug.set(it.slug, pick);
  }

  const dists = items.map((it) =>
    Math.hypot(it.centroid[0] - cx, it.centroid[1] - cy),
  );
  const maxDist = Math.max(...dists, 1);

  return items.map<Shard>((it, i) => {
    const pIdx = paletteBySlug.get(it.slug) ?? 0;
    const [fill, fillDark] = EARTH_PALETTE[pIdx];
    return {
      slug: it.slug,
      path: it.path,
      centroid: [roundSvg(it.centroid[0]), roundSvg(it.centroid[1])],
      rotation: 0,
      drift: [0, 0],
      fill,
      fillDark,
      paletteIndex: pIdx,
      distFromCenter: roundSvg(dists[i] / maxDist),
    };
  });
}
