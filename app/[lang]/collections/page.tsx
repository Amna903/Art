import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { CollectionsView } from "@/components/sections/collections/CollectionsView";
import { getPublishedCollections } from "@/lib/data/supabase-collections";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { t } = await getI18n(params);
  return {
    title: t("Curated Collections | NUA-ARTE"),
    description: t("NUA-ARTE — contemporary African art movement."),
  };
}

// Match discover/journal — without this, cover image updates can stick until redeploy.
export const revalidate = 60;

export default async function CollectionsPage({ params }: PageProps<"/[lang]/collections">) {
  const { lang } = await getI18n(params);
  const collections = await getPublishedCollections(lang);
  return <CollectionsView initialItems={collections} />;
}
