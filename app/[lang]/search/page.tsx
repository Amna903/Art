import { SearchPageContent } from "@/components/sections/search/SearchPageContent";
import { getDirectoryArtists, getDirectoryArtworks } from "@/lib/data/directory";
import { resolveLang } from "@/lib/i18n/server";

export const revalidate = 60;

export default async function SearchPage({ params }: PageProps<"/[lang]/search">) {
  const lang = resolveLang((await params).lang);
  const [artists, artworks] = await Promise.all([getDirectoryArtists(lang), getDirectoryArtworks(lang)]);

  return <SearchPageContent artists={artists} artworks={artworks} />;
}
