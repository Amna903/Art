import { getCountryDisplayName, normalizeCountrySlug } from "@/lib/data/africa";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Language } from "@/lib/i18n/config";

/**
 * Virtual gallery rooms. One room holds at most ROOM_SIZE works — one
 * comfortable row around the walls — so the gallery scales to any size of
 * collection: each country gets its own room(s), split into "Room 1 of N"
 * when it has more works than one room holds, plus a "Featured" room with the
 * newest works across all countries.
 *
 * Rooms are worked out from per-country counts (one GROUP BY in the
 * database); a room's works are then fetched as one 24-row page. The
 * catalogue itself is never loaded.
 */
export const ROOM_SIZE = 24;
export const FEATURED = "featured";
export const OTHER = "other";

export type RoomRef = {
  /** Country slug, FEATURED, or OTHER (works with no recognised country). */
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
};

export type CountryRooms = {
  country: string;
  label: string;
  total: number;
  cover: string | null;
  rooms: RoomSummary[];
};

type CountryRow = { slug: string; works: number; covers: string[] };

/** Per-country work counts and two newest cover images, from the database. */
export async function fetchCountryRooms(): Promise<CountryRow[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase.rpc("published_country_rooms");
  if (error || !data) {
    if (error) console.error("[Supabase] country rooms:", error.message);
    return [];
  }
  // Several stored spellings can map to one country ("Congo", "Republic of the Congo"…).
  const bySlug = new Map<string, CountryRow>();
  for (const row of data) {
    const slug = normalizeCountrySlug(row.country ?? "") || OTHER;
    const entry = bySlug.get(slug) ?? { slug, works: 0, covers: [] };
    entry.works += Number(row.works);
    entry.covers.push(...(row.covers ?? []));
    bySlug.set(slug, entry);
  }
  return [...bySlug.values()];
}

/**
 * The room plan for the whole gallery, from per-country counts.
 * `newestCover` is the newest work's image (the Featured room's cover).
 */
export function planRooms(
  countries: CountryRow[],
  lang: Language,
  labels: { featured: string; other: string },
  newestCover: string | null,
) {
  const total = countries.reduce((sum, c) => sum + c.works, 0);
  const label = (slug: string) => (slug === OTHER ? labels.other : getCountryDisplayName(slug, lang));
  const featuredCover = total > ROOM_SIZE ? newestCover : null;

  const byCountry: CountryRooms[] = countries
    .filter((c) => c.works > 0)
    .map((c) => {
      const of = Math.ceil(c.works / ROOM_SIZE);
      return {
        country: c.slug,
        label: label(c.slug),
        total: c.works,
        // Prefer a cover that differs from the Featured card's.
        cover: c.covers.find((u) => u !== featuredCover) ?? c.covers[0] ?? null,
        rooms: Array.from({ length: of }, (_, i) => ({
          country: c.slug,
          room: i + 1,
          label: label(c.slug),
          of,
          count: i < of - 1 ? ROOM_SIZE : c.works - ROOM_SIZE * (of - 1),
        })),
      };
    })
    .sort((a, b) => (a.country === OTHER ? 1 : b.country === OTHER ? -1 : a.label.localeCompare(b.label, lang)));

  // A Featured room only makes sense when the collection fills more than one room.
  const featured: (RoomSummary & { cover: string | null }) | null =
    total > ROOM_SIZE
      ? { country: FEATURED, room: 1, label: labels.featured, of: 1, count: ROOM_SIZE, cover: featuredCover }
      : null;

  /** Rooms in visiting order: Featured, then every country's rooms. */
  const order: RoomSummary[] = [...(featured ? [featured] : []), ...byCountry.flatMap((c) => c.rooms)];

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

  return { countries: byCountry, featured, order, resolve, neighbours, total };
}

/** The page of works hanging in a room: newest first, ROOM_SIZE per room. */
export function roomQuery(ref: RoomRef): { country?: string; offset: number; limit: number } {
  if (ref.country === FEATURED) return { offset: 0, limit: ROOM_SIZE };
  return { country: ref.country, offset: (ref.room - 1) * ROOM_SIZE, limit: ROOM_SIZE };
}

/** Query string for a room, e.g. "?country=angola&room=2". */
export function roomHref(ref: RoomRef, opts: { start?: boolean } = {}): string {
  const q = new URLSearchParams({ country: ref.country });
  if (ref.room > 1) q.set("room", String(ref.room));
  if (opts.start) q.set("start", "1");
  return `/virtual-gallery?${q.toString()}`;
}
