import type { Metadata } from "next";
import { CollectionsView } from "@/components/sections/collections/CollectionsView";
import { getPublishedCollections } from "@/lib/data/supabase-collections";

export const metadata: Metadata = {
  title: "Curated Collections | NU-ART",
  description: "NU-ART — contemporary African art movement.",
};

// Match discover/journal — without this, cover image updates can stick until redeploy.
export const revalidate = 60;

export default async function CollectionsPage() {
  const collections = await getPublishedCollections();
  return <CollectionsView initialItems={collections} />;
}
