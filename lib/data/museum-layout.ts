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

// 4 zones × 4 slots/wall is as many frames as fit before offsetForSlot()
// pushes a frame past the room's walls. Beyond that, drop the oldest
// overflow rather than let frames clip through walls or float outside them.
const MAX_ARTWORKS = 16;

/**
 * No curator, no hand-picked coordinates: artworks are assigned to zones
 * purely by their position in the incoming list. Two frames per wall per
 * pass, cycling 1 → 2 → 3 → 4 → 1 → 2 … as more artworks arrive.
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

export function layoutArtworks(source: SupabaseArtwork[]): Artwork[] {
  // getPublishedArtworks() orders newest-first, so the first MAX_ARTWORKS
  // entries are the most recently published — the oldest overflow is
  // simply left off rather than shown badly placed.
  const visible = source.slice(0, MAX_ARTWORKS);
  return visible.map((a, index) => {
    const { zone, slot } = slotFor(index);
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
}
