import { SearchPageContent } from "@/components/sections/search/SearchPageContent";
import { getDirectoryArtists, getDirectoryArtworks } from "@/lib/data/directory";

export const revalidate = 60;

export default async function SearchPage() {
  const [artists, artworks] = await Promise.all([getDirectoryArtists(), getDirectoryArtworks()]);

  return <SearchPageContent artists={artists} artworks={artworks} />;
}
