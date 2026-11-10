import type { SupabaseArtwork } from "@/lib/data/supabase-artists";
import { getCountryDisplayName, normalizeCountrySlug } from "@/lib/data/africa";
import type { Language } from "@/lib/i18n/config";

/**
 * Virtual gallery rooms. One room holds at most ROOM_SIZE works — one
 * comfortable row around the walls — so the gallery scales to any size of
 * collection: each country gets its own room(s), split into "Room 1 of N"
 * when it has more works than one room holds, plus a "Featured" room with the
 * newest works across all countries.
 */
export const ROOM_SIZE = 24;
export const FEATURED = "featured";

export type RoomRef = {
  /** Country slug, or FEATURED. */
  country: string;
  /** 1-based room number within the country. */
  room: number;
};

export type RoomSummary = RoomRef & {
  /** Display name: the country, or "Featured". */
  label: string;
  /** Rooms this country has. */
  of: number;
  count: number;
  /** First work in the room, for the lobby card. */
  cover: string | null;
};

export type CountryRooms = {
  country: string;
  label: string;
  total: number;
  cover: string | null;
  rooms: RoomSummary[];
};

const countryOf = (a: SupabaseArtwork) => normalizeCountrySlug(a.artistCountry ?? a.country ?? "") || "other";

function chunk<T>(items: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += ROOM_SIZE) out.push(items.slice(i, i + ROOM_SIZE));
  return out;
}

/**
 * Splits the published works (newest first) into rooms. `featuredLabel` is
 * the translated "Featured" name.
 */
export function buildRooms(published: SupabaseArtwork[], lang: Language, featuredLabel: string, otherLabel: string) {
  const byCountry = new Map<string, SupabaseArtwork[]>();
  for (const a of published) {
    const key = countryOf(a);
    byCountry.set(key, [...(byCountry.get(key) ?? []), a]);
  }

  // Country cards prefer a cover that differs from the Featured room's.
  const featuredCover = published.length > ROOM_SIZE ? (published[0]?.imageUrl ?? null) : null;
  const coverOf = (works: SupabaseArtwork[]) =>
    (works.find((w) => w.imageUrl !== featuredCover) ?? works[0])?.imageUrl ?? null;

  const label = (slug: string) => (slug === "other" ? otherLabel : getCountryDisplayName(slug, lang));
  const countries: CountryRooms[] = [...byCountry.entries()]
    .map(([slug, works]) => {
      const chunks = chunk(works);
      return {
        country: slug,
        label: label(slug),
        total: works.length,
        cover: coverOf(works),
        rooms: chunks.map((c, i) => ({
          country: slug,
          room: i + 1,
          label: label(slug),
          of: chunks.length,
          count: c.length,
          cover: coverOf(c),
        })),
      };
    })
    .sort((a, b) => (a.country === "other" ? 1 : b.country === "other" ? -1 : a.label.localeCompare(b.label, lang)));

  // A Featured room only makes sense when the collection fills more than one room.
  const featured: RoomSummary | null =
    published.length > ROOM_SIZE
      ? { country: FEATURED, room: 1, label: featuredLabel, of: 1, count: ROOM_SIZE, cover: featuredCover }
      : null;

  /** Rooms in visiting order: Featured, then every country's rooms. */
  const order: RoomSummary[] = [...(featured ? [featured] : []), ...countries.flatMap((c) => c.rooms)];

  /** The works hanging in one room. */
  const worksIn = (ref: RoomRef): SupabaseArtwork[] => {
    if (ref.country === FEATURED) return published.slice(0, ROOM_SIZE);
    return chunk(byCountry.get(ref.country) ?? [])[ref.room - 1] ?? [];
  };

  /** Requested room, falling back to the first room of that country, then the first room. */
  const resolve = (country?: string, room?: number): RoomSummary | null => {
    if (country) {
      const own = order.filter((r) => r.country === country);
      if (own.length) return own.find((r) => r.room === room) ?? own[0];
    }
    return order[0] ?? null;
  };

  const neighbours = (current: RoomSummary) => {
    const i = order.findIndex((r) => r.country === current.country && r.room === current.room);
    return { previous: order[i - 1] ?? null, next: order[i + 1] ?? null };
  };

  return { countries, featured, order, worksIn, resolve, neighbours };
}

/** Query string for a room, e.g. "?country=angola&room=2". */
export function roomHref(ref: RoomRef, opts: { start?: boolean } = {}): string {
  const q = new URLSearchParams({ country: ref.country });
  if (ref.room > 1) q.set("room", String(ref.room));
  if (opts.start) q.set("start", "1");
  return `/virtual-gallery?${q.toString()}`;
}
