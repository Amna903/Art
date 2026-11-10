import type { Metadata } from "next";
import { VirtualGallery } from "@/components/gallery/VirtualGallery";
import { unstable_cache } from "next/cache";
import { listPublishedArtworks } from "@/lib/data/supabase-artists-cached";
import { getPageBlocks } from "@/lib/data/pageBlocks";
import { getSiteHero } from "@/lib/data/site-heroes";
import { layoutArtworks, FALLBACK_ARTWORKS } from "@/lib/data/museum-layout";
import { fetchCountryRooms, FEATURED, planRooms, roomHref, roomQuery, type RoomSummary } from "@/lib/data/gallery-rooms";
import { normalizeCountrySlug } from "@/lib/data/africa";
import { getI18n } from "@/lib/i18n/server";

export const revalidate = 60;

// Per-country counts and covers for the room plan: one small GROUP BY result
// (a row per country), cached like the other listings.
const getCountryRooms = unstable_cache(fetchCountryRooms, ["gallery-country-rooms"], {
  revalidate: 60,
  tags: ["artworks"],
});

export async function generateMetadata({ params }: PageProps<"/[lang]/virtual-gallery">): Promise<Metadata> {
  const { t } = await getI18n(params);
  return {
    title: t("Virtual gallery"),
    description: t("Take your time with the work: a guided tour of the NUA-ARTE collection, one artwork at a time."),
  };
}

export default async function VirtualGalleryPage({ params, searchParams }: PageProps<"/[lang]/virtual-gallery">) {
  const { lang, t } = await getI18n(params);
  const query = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  const requestedCountry = one(query.country);
  const requestedRoom = Number(one(query.room)) || 1;
  // "Next room" links carry ?start=1 so the tour continues straight away.
  const autoStart = one(query.start) === "1";

  const [countryRooms, newest, blocks, hero] = await Promise.all([
    getCountryRooms(),
    listPublishedArtworks({ lang, limit: 1 }),
    getPageBlocks("virtual-gallery", lang),
    getSiteHero("virtual-gallery", lang),
  ]);

  // Rooms of at most ROOM_SIZE works: per country (Room 1 of N…) plus a
  // Featured room, planned from counts. Only the current room's works are
  // fetched — one 24-row page — and sent to the browser.
  const rooms = planRooms(countryRooms, lang, { featured: t("Featured"), other: t("Other works") }, newest.items[0]?.imageUrl ?? null);
  const countrySlug =
    requestedCountry === FEATURED ? FEATURED : normalizeCountrySlug(requestedCountry ?? "") || requestedCountry;
  const current = rooms.resolve(countrySlug, requestedRoom);
  const { previous, next } = current ? rooms.neighbours(current) : { previous: null, next: null };

  // Sample artworks only appear in local development (to work on the tour
  // before real works are published); a live site with nothing published
  // shows an empty state instead.
  const roomWorks = current ? (await listPublishedArtworks({ lang, ...roomQuery(current) })).items : [];
  const artworks = roomWorks.length
    ? layoutArtworks(roomWorks)
    : process.env.NODE_ENV === "development"
      ? FALLBACK_ARTWORKS
      : [];

  const roomTitles = Object.fromEntries(
    [1, 2, 3, 4].map((n) => [n, blocks[`room_title_${n}`]?.value?.trim() || ""]),
  ) as Record<1 | 2 | 3 | 4, string>;

  // Only show room names once there is more than one room.
  const multipleRooms = rooms.order.length > 1;
  const roomLabel = (r: RoomSummary) =>
    r.of > 1 ? t("{name} · Room {n} of {total}", { name: r.label, n: r.room, total: r.of }) : r.label;
  const link = (r: RoomSummary | null, start = false) => (r ? { href: roomHref(r, { start }), label: roomLabel(r) } : null);

  return (
    <VirtualGallery
      // A new room is a fresh visit: reset the tour and reload the 3D room.
      key={current ? `${current.country}-${current.room}` : "empty"}
      artworks={artworks}
      roomTitles={roomTitles}
      hero={hero}
      countryLabel={current && multipleRooms ? roomLabel(current) : null}
      autoStart={autoStart && artworks.length > 0}
      rooms={
        multipleRooms
          ? {
              current: current ? { country: current.country, room: current.room } : null,
              featured: rooms.featured ? { href: roomHref(rooms.featured), label: rooms.featured.label, count: rooms.featured.count, cover: rooms.featured.cover } : null,
              countries: rooms.countries.map((c) => ({
                country: c.country,
                label: c.label,
                total: c.total,
                cover: c.cover,
                rooms: c.rooms.map((r) => ({ room: r.room, href: roomHref(r), count: r.count })),
              })),
              previous: link(previous),
              next: link(next, true),
            }
          : null
      }
    />
  );
}
