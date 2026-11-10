import { SearchPageContent } from "@/components/sections/search/SearchPageContent";
import { getDirectoryArtists, searchDirectoryArtworks } from "@/lib/data/directory";
import { resolveLang } from "@/lib/i18n/server";

export const revalidate = 60;

/** Search runs on the server: artworks are matched in the database and only
 * the results (at most 12 of each kind) are sent to the browser. */
export default async function SearchPage({ params, searchParams }: PageProps<"/[lang]/search">) {
  const lang = resolveLang((await params).lang);
  const raw = (await searchParams).q;
  const q = (typeof raw === "string" ? raw : "").trim().slice(0, 100);
  const needle = q.toLowerCase();

  const [artists, artworks] = needle
    ? await Promise.all([getDirectoryArtists(lang), searchDirectoryArtworks(needle, lang, 12)])
    : [[], []];
  const artistResults = artists
    .filter((a) => `${a.name} ${a.countryName} ${a.city} ${a.technique}`.toLowerCase().includes(needle))
    .slice(0, 12);

  return <SearchPageContent q={q} artists={artistResults} artworks={artworks} />;
}
