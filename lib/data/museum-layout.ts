import type { Artwork } from "@/components/three/VirtualMuseum";
import type { SupabaseArtwork } from "@/lib/data/supabase-artists";

type ZoneId = 1 | 2 | 3 | 4;

// Mirrors VirtualMuseum's ROOM geometry — each zone is one physical wall.
// `axis` is the direction frames get spaced out along; `fixed` is the
// wall's position on the other axis.
const ZONE_WALL: Record<ZoneId, { axis: "x" | "z"; fixed: number; rotationY: number }> = {
  1: { axis: "x", fixed: 11.95, rotationY: Math.PI },
  2: { axis: "z", fixed: -9.95, rotationY: Math.PI / 2 },
  3: { axis: "z", fixed: 9.95, rotationY: -Math.PI / 2 },
  4: { axis: "x", fixed: -11.95, rotationY: 0 },
};

const FRAME_WIDTH = 2.2;
const FRAME_HEIGHT = 1.8;
const SLOT_HALF_GAP = 3; // distance of the first pair of frames from wall center
const SLOT_PAIR_STEP = 6; // distance between successive pairs

// 4 zones × 4 slots/wall + 4 mid wall slots = 20 artworks total.
const MAX_ARTWORKS = 20;

// Mid partition wall (at x = -3.7, length 9.2 in z) slots: 2 on East face, 2 on West face
const MID_WALL_SLOTS: Array<{
  position: [number, number, number];
  rotationY: number;
  zone: ZoneId;
}> = [
  // Side 1 (East Face): 2 paintings facing the main central gallery hall
  { position: [-3.45, 1.9, 1.6], rotationY: Math.PI / 2, zone: 1 },
  { position: [-3.45, 1.9, 5.2], rotationY: Math.PI / 2, zone: 1 },
  // Side 2 (West Face): 2 paintings facing the west gallery wing
  { position: [-3.95, 1.9, 1.6], rotationY: -Math.PI / 2, zone: 2 },
  { position: [-3.95, 1.9, 5.2], rotationY: -Math.PI / 2, zone: 2 },
];

/**
 * No curator, no hand-picked coordinates: artworks are assigned to zones
 * purely by their position in the incoming list. Two frames per wall per
 * pass, cycling 1 → 2 → 3 → 4 → 1 → 2 … as more artworks arrive, with the
 * mid partition wall receiving 4 paintings (2 per side).
 */
function slotFor(index: number): { zone: ZoneId; slot: number } {
  const zone = ((Math.floor(index / 2) % 4) + 1) as ZoneId;
  const cyclesCompleted = Math.floor(index / 8);
  const slot = cyclesCompleted * 2 + (index % 2);
  return { zone, slot };
}

function offsetForSlot(slot: number): number {
  const sign = slot % 2 === 0 ? -1 : 1;
  return sign * (SLOT_HALF_GAP + SLOT_PAIR_STEP * Math.floor(slot / 2));
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

export function layoutArtworks(source: SupabaseArtwork[]): Artwork[] {
  // getPublishedArtworks() orders newest-first, so the first MAX_ARTWORKS
  // entries are the most recently published — the oldest overflow is
  // simply left off rather than shown badly placed.
  const visible = source.slice(0, MAX_ARTWORKS);
  const placed = visible.map((a, index) => {
    // Indices 8..11 are mounted on the mid partition wall (2 on East face, 2 on West face)
    if (index >= 8 && index < 12) {
      const mid = MID_WALL_SLOTS[index - 8];
      return {
        id: a.id,
        title: a.title,
        artist: a.artistName,
        description: a.description ?? "",
        image: a.imageUrl,
        position: mid.position,
        rotationY: mid.rotationY,
        width: FRAME_WIDTH,
        height: FRAME_HEIGHT,
        zone: mid.zone,
        year: a.year ? String(a.year) : undefined,
        medium: a.medium ?? undefined,
      };
    }

    // Outer perimeter walls (indices 0..7 and 12..19)
    const effectiveIndex = index >= 12 ? index - 4 : index;
    const { zone, slot } = slotFor(effectiveIndex);
    const wall = ZONE_WALL[zone];
    const offset = offsetForSlot(slot);
    const position: [number, number, number] =
      wall.axis === "x" ? [offset, 1.9, wall.fixed] : [wall.fixed, 1.9, offset];

    return {
      id: a.id,
      title: a.title,
      artist: a.artistName,
      description: a.description ?? "",
      image: a.imageUrl,
      position,
      rotationY: wall.rotationY,
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
      zone,
      year: a.year ? String(a.year) : undefined,
      medium: a.medium ?? undefined,
    };
  });

  // Guarantee that all 12 gallery slots (especially the 4 paintings on the mid wall)
  // remain populated so artworks never appear and disappear when partial Supabase results arrive.
  if (placed.length < FALLBACK_ARTWORKS.length) {
    const remaining = FALLBACK_ARTWORKS.slice(placed.length);
    return [...placed, ...remaining];
  }

  return placed;
}
