import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { t } = await getI18n(params);
  return {
    title: t("Search | NUA-ARTE"),
    description: t("Search artists, countries, and artworks across the NUA-ARTE Collective."),
  };
}

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
