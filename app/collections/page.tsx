import type { Metadata } from "next";
import { CollectionsView } from "@/components/sections/collections/CollectionsView";
import { getPublishedCollections } from "@/lib/data/supabase-collections";

export const metadata: Metadata = {
  title: "Curated Collections | NU-ART",
  description: "NU-ART — contemporary African art movement.",
};

export default async function CollectionsPage() {
  const collections = await getPublishedCollections();
  return <CollectionsView initialItems={collections} />;
}
