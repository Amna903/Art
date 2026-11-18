import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { LOCALES, REVIEWED, localizePath } from "@/lib/i18n/config";
import { listPublishedArtworks, getRealArtists } from "@/lib/data/supabase-artists-cached";

export const revalidate = 3600;

const STATIC_PATHS = [
  "/", "/artists", "/collections", "/exhibitions", "/journal", "/virtual-gallery", "/about", "/faq",
  "/privacy", "/terms", "/cookies", "/returns", "/shipping",
];

/** One entry per page (English URL) with hreflang alternates for each public language. */
function entry(path: string, lastModified?: Date): MetadataRoute.Sitemap[number] {
  const languages = Object.fromEntries(
    LOCALES.filter((l) => REVIEWED[l]).map((l) => [l, SITE_URL + localizePath(path, l)]),
  );
  return { url: SITE_URL + localizePath(path, "en"), lastModified, alternates: { languages } };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [artworks, artists] = await Promise.all([
    listPublishedArtworks({ lang: "en", limit: 5000 }).then((p) => p.items).catch(() => []),
    getRealArtists("en").catch(() => []),
  ]);
  return [
    ...STATIC_PATHS.map((p) => entry(p)),
    ...artists.map((a) => entry(`/artists/${a.slug}`)),
    ...artworks.map((w) => entry(`/artworks/${w.slug}`)),
  ];
}
