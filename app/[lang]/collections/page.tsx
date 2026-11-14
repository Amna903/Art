import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { CollectionsView } from "@/components/sections/collections/CollectionsView";
import { getPublishedCollections } from "@/lib/data/supabase-collections";
import { getPageBlocks, blockImage } from "@/lib/data/pageBlocks";

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
  const [collections, blocks] = await Promise.all([getPublishedCollections(lang), getPageBlocks("collections", lang)]);
  // Admins can replace this image in place (EditableImage on the page).
  const newsletterImage = blockImage(blocks, "newsletter_image", {
    src: "https://nu-artcollective.lovable.app/__l5e/assets-v1/8fb36909-f581-4701-9e44-3a179fcb76d5/afr-ceramic.jpg",
    alt: "Contemporary African ceramic vessel curated for NUA-ARTE.",
  });
  return <CollectionsView initialItems={collections} newsletterImage={newsletterImage} />;
}
