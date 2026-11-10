import type { Artwork } from "@/components/three/VirtualMuseum";
import type { SupabaseArtwork } from "@/lib/data/supabase-artists";
import { normalizeCountrySlug } from "@/lib/data/africa";

type ZoneId = 1 | 2 | 3 | 4;

// Usable wall segments, in the order the guided tour walks them. Each one
// mirrors VirtualMuseum's ROOM geometry, trimmed so frames never hang over a
// corner, the entrance opening or the end of the partition wall.
type Segment = {
  zone: ZoneId;
  rotationY: number;
  // Start/end of the usable span along the wall, in world space (y ignored).
  from: [number, number];
  to: [number, number];
};

const SEGMENTS: Segment[] = [
  // South entrance wall, left wing (x -10 → -3.2), facing into the room.
  { zone: 1, rotationY: Math.PI, from: [-3.6, 11.95], to: [-9.6, 11.95] },
  // West wall
  { zone: 2, rotationY: Math.PI / 2, from: [-9.95, 11.4], to: [-9.95, -11.4] },
  // North wall
  { zone: 4, rotationY: 0, from: [-9.4, -11.95], to: [9.4, -11.95] },
  // East wall
  { zone: 3, rotationY: -Math.PI / 2, from: [9.95, -11.4], to: [9.95, 11.4] },
  // South entrance wall, right wing (x 3.2 → 10).
  { zone: 1, rotationY: Math.PI, from: [9.6, 11.95], to: [3.6, 11.95] },
  // Mid partition wall (x = -3.7, z -1.2 → 8.0): east face, then west face.
  { zone: 1, rotationY: Math.PI / 2, from: [-3.45, 7.7], to: [-3.45, -0.9] },
  { zone: 2, rotationY: -Math.PI / 2, from: [-3.95, -0.9], to: [-3.95, 7.7] },
];

const MAX_FRAME = 2.4; // largest side of a frame's bounding box (metres)
const MIN_SPACING = 1.5; // closest centre-to-centre distance between frames
const SPACINGS = [3.2, 2.8, 2.4, 2.0, 1.75, MIN_SPACING];

const segLength = (s: Segment) => Math.hypot(s.to[0] - s.from[0], s.to[1] - s.from[1]);

/** Spread `n` frames over the walls in proportion to each wall's capacity. */
function distribute(n: number, caps: number[]): number[] {
  const totalCap = caps.reduce((a, b) => a + b, 0);
  const counts = caps.map((c) => Math.min(c, Math.floor((n * c) / totalCap)));
  let left = n - counts.reduce((a, b) => a + b, 0);
  // Hand out the rest to walls in tour order that still have room.
  while (left > 0) {
    let placed = false;
    for (let i = 0; i < caps.length && left > 0; i++) {
      if (counts[i] < caps[i]) {
        counts[i] += 1;
        left -= 1;
        placed = true;
      }
    }
    if (!placed) break;
  }
  return counts;
}

type Placement = {
  position: [number, number, number];
  rotationY: number;
  zone: ZoneId;
  width: number;
  height: number;
};

/**
 * Computes a wall placement for every artwork — there is no fixed cap. Few
 * artworks get generous spacing; as more arrive the spacing tightens and,
 * past one full row, a second (upper) row is hung. `width`/`height` are the
 * bounding box; the frame itself is fitted to the image's real aspect ratio
 * at render time so nothing is cropped or stretched.
 */
export function computePlacements(n: number): Placement[] {
  if (n <= 0) return [];
  const lengths = SEGMENTS.map(segLength);

  let rows = 1;
  let spacing = MIN_SPACING;
  let caps: number[] = [];
  outer: for (const r of [1, 2, 3]) {
    // A single row stays comfortably spaced; past that a second row is hung
    // rather than squeezing frames into narrow slivers.
    for (const sp of r === 1 ? SPACINGS.filter((x) => x >= 2.0) : SPACINGS) {
      const c = lengths.map((l) => Math.max(0, Math.floor(l / sp)));
      if (c.reduce((a, b) => a + b, 0) * r >= n) {
        rows = r;
        spacing = sp;
        caps = c;
        break outer;
      }
    }
  }
  if (caps.length === 0) {
    // More artworks than even 3 tight rows hold: keep adding rows.
    caps = lengths.map((l) => Math.floor(l / MIN_SPACING));
    rows = Math.ceil(n / caps.reduce((a, b) => a + b, 0));
  }

  // Ceiling is 5.6 m; keep every frame (plus its plaque) between ~0.3 m and 5.3 m.
  const rowYs =
    rows === 1 ? [1.9] : rows === 2 ? [1.55, 3.75] : Array.from({ length: rows }, (_, i) => 1.0 + (i * 3.6) / (rows - 1));
  const maxH = rows === 1 ? 2.0 : rows === 2 ? 1.6 : 3.6 / (rows - 1) - 0.55;

  const counts = distribute(n, caps.map((c) => c * rows));
  const out: Placement[] = [];
  SEGMENTS.forEach((seg, si) => {
    const count = counts[si];
    if (!count) return;
    const perRow = Math.ceil(count / rows);
    const len = lengths[si];
    for (let k = 0; k < count; k++) {
      const row = Math.floor(k / perRow);
      const inRow = row === rows - 1 ? count - perRow * (rows - 1) : perRow;
      const j = k % perRow;
      const step = len / inRow;
      const t = (step * (j + 0.5)) / len;
      const x = seg.from[0] + (seg.to[0] - seg.from[0]) * t;
      const z = seg.from[1] + (seg.to[1] - seg.from[1]) * t;
      const width = Math.min(MAX_FRAME, Math.max(0.8, Math.min(step, spacing * 1.25) - 0.55));
      out.push({ position: [x, rowYs[row], z], rotationY: seg.rotationY, zone: seg.zone, width, height: maxH });
    }
  });
  return out;
}

export const FALLBACK_ARTWORKS: Artwork[] = [
  {
    id: "a1", title: "Adire Reverie", artist: "Fatoumata Niang", year: "2024", medium: "Indigo on cotton",
    description: "Indigo on cotton — reinterpreting ancestral resist-dye techniques.",
    image: "https://nu-artcollective.lovable.app/__l5e/assets-v1/cd429143-8a30-4fcf-ad79-d9a3d5093892/afr-textile.jpg",
    position: [-3, 1.9, 11.95], rotationY: Math.PI, width: 2.4, height: 1.6, zone: 1,
  },
  {
    id: "a2", title: "Sahel Light", artist: "Amadou Fall", year: "2023", medium: "Earth pigment on linen",
    description: "A study in earth pigment and Sahel light.",
    image: "https://nu-artcollective.lovable.app/__l5e/assets-v1/a820f217-1476-433e-9017-b7e8bc4d6e4b/afr-painting-abstract.jpg",
    position: [3, 1.9, 11.95], rotationY: Math.PI, width: 1.8, height: 2.4, zone: 1,
  },
  {
    id: "a3", title: "Lagos Nocturne", artist: "Moussa Sene", year: "2024", medium: "Archival pigment print",
    description: "Photographic study of urban rhythm after dark.",
    image: "https://nu-artcollective.lovable.app/__l5e/assets-v1/cd429143-8a30-4fcf-ad79-d9a3d5093892/afr-textile.jpg",
    position: [-9.95, 1.9, -4], rotationY: Math.PI / 2, width: 2.2, height: 1.8, zone: 2,
  },
  {
    id: "a4", title: "City Pulse", artist: "Amina Diallo", year: "2023", medium: "Mixed media on canvas",
    description: "Night life along a modern African corniche.",
    image: "https://nu-artcollective.lovable.app/__l5e/assets-v1/cd429143-8a30-4fcf-ad79-d9a3d5093892/afr-textile.jpg",
    position: [-9.95, 1.9, 4], rotationY: Math.PI / 2, width: 2.2, height: 1.8, zone: 2,
  },
  {
    id: "a5", title: "Bogolan Geometry", artist: "Issa Diop", year: "2024", medium: "Algorithmic print on cotton",
    description: "Algorithmic art inspired by Mud cloth symbolism.",
    image: "https://nu-artcollective.lovable.app/__l5e/assets-v1/8170e7d1-3e87-4dfd-984d-5c50a5625187/afr-gallery-room.jpg",
    position: [9.95, 1.9, -4], rotationY: -Math.PI / 2, width: 2, height: 2, zone: 3,
  },
  {
    id: "a6", title: "Indigo Threads", artist: "Kadiatou Touré", year: "2023", medium: "Generative textile",
    description: "Generative interpretation of resist-dye patterns.",
    image: "https://nu-artcollective.lovable.app/__l5e/assets-v1/8170e7d1-3e87-4dfd-984d-5c50a5625187/afr-gallery-room.jpg",
    position: [9.95, 1.9, 4], rotationY: -Math.PI / 2, width: 2, height: 2, zone: 3,
  },
  {
    id: "a7", title: "Horizon Codex", artist: "Amadou Fall", year: "2024", medium: "Wood carving with digital scan",
    description: "Woodcraft heritage meets minimalist modernism.",
    image: "https://nu-artcollective.lovable.app/__l5e/assets-v1/3b671063-daed-4dec-a143-5219ad0ec512/afr-fabric-macro.jpg",
    position: [-3, 1.9, -11.95], rotationY: 0, width: 2.2, height: 2, zone: 4,
  },
  {
    id: "a8", title: "Digital Ancestry", artist: "Thandiwe Mbeki", year: "2024", medium: "Raking light photography",
    description: "Carved memory, rendered in raking light.",
    image: "https://nu-artcollective.lovable.app/__l5e/assets-v1/3b671063-daed-4dec-a143-5219ad0ec512/afr-fabric-macro.jpg",
    position: [3, 1.9, -11.95], rotationY: 0, width: 2.2, height: 2, zone: 4,
  },
  // Mid Wall — East Face (2 paintings facing into the main gallery hall)
  {
    id: "a9",
    title: "Golden Grace",
    artist: "Kofi Mensah",
    year: "2024",
    medium: "Oil and gold leaf on linen",
    description: "A luminescent portrait exploring dignity, quiet strength, and contemporary African identity.",
    image: "/images/art-painting-1.jpg",
    position: [-3.45, 1.9, 1.6],
    rotationY: Math.PI / 2,
    width: 2.0,
    height: 2.0,
    zone: 1,
  },
  {
    id: "a10",
    title: "Matriarch's Horizon",
    artist: "Folashade Adeyemi",
    year: "2023",
    medium: "Acrylic and ochre on canvas",
    description: "Honoring ancestral matriarchy and cultural memory through deep warm ochre palettes.",
    image: "/images/art-painting-2.jpg",
    position: [-3.45, 1.9, 5.2],
    rotationY: Math.PI / 2,
    width: 2.0,
    height: 2.0,
    zone: 1,
  },
  // Mid Wall — West Face (2 paintings facing into the west gallery corridor)
  {
    id: "a11",
    title: "Harmattan Composition",
    artist: "Kwame Osei",
    year: "2024",
    medium: "Textured pigment and terra cotta on wood",
    description: "Geometric abstraction capturing seasonal earth pigments and architectural shadows.",
    image: "/images/art-painting-3.jpg",
    position: [-3.95, 1.9, 1.6],
    rotationY: -Math.PI / 2,
    width: 2.0,
    height: 2.0,
    zone: 2,
  },
  {
    id: "a12",
    title: "Nocturne in Cobalt",
    artist: "Zainab Diakité",
    year: "2024",
    medium: "Oil on canvas",
    description: "Luminous profile portrait set against deep indigo and sweeping brush strokes.",
    image: "/images/art-painting-4.jpg",
    position: [-3.95, 1.9, 5.2],
    rotationY: -Math.PI / 2,
    width: 2.0,
    height: 2.0,
    zone: 2,
  },
];

function details(a: SupabaseArtwork) {
  return {
    id: a.id,
    title: a.title,
    artist: a.artistName,
    description: a.description ?? "",
    image: a.imageUrl,
    thumb: a.thumbUrl ?? undefined,
    year: a.year ? String(a.year) : undefined,
    medium: a.medium ?? undefined,
    dimensions: a.dimensions ?? undefined,
    slug: a.slug,
    artistSlug: a.artistSlug,
    country: normalizeCountrySlug(a.artistCountry ?? a.country ?? "") || undefined,
  };
}

/**
 * Places every published artwork (newest first) on a wall of the 3D room.
 * Every artwork gets a real wall position, so the guided tour can visit all
 * of them. Sample artworks are never mixed in with real ones.
 */
export function layoutArtworks(source: SupabaseArtwork[]): Artwork[] {
  const placements = computePlacements(source.length);
  return groupByCountry(source.map(details)).map((a, index) => ({ ...a, ...placements[index] }));
}

/**
 * Keeps each country's works together (countries in order of their newest
 * work, works newest first within a country), so the tour moves country by
 * country and each soundtrack plays through instead of flipping per painting.
 */
function groupByCountry<T extends { country?: string }>(items: T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = item.country ?? "";
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return [...groups.values()].flat();
}
