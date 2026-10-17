import { unstable_cache } from "next/cache";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/types";
import type { Language } from "@/lib/i18n/config";
import { localized } from "@/lib/i18n/content";

/**
 * Hero images an admin replaces from the dashboard ("Hero images"), without a
 * deploy (change brief, section 7). One active row per page key:
 * "home", "virtual-gallery", "exhibitions", "about", "country:<slug>".
 */
export type SiteHero = {
  imageDesktop: string;
  imageMobile: string | null;
  alt: string;
  credit: string | null;
  focalPoint: string;
};

export const HERO_PAGES = ["home", "virtual-gallery", "exhibitions", "about"] as const;

type Row = {
  page: string;
  image_desktop: string;
  image_mobile: string | null;
  alt_text: string;
  credit: string | null;
  focal_point: string;
  translations: Json;
};

async function fetchActiveHeroes(): Promise<Row[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from("site_heroes")
    .select("page, image_desktop, image_mobile, alt_text, credit, focal_point, translations")
    .eq("active", true);
  if (error) {
    // The table arrives with migration 20261018000000; until it is run, pages
    // keep their built-in hero.
    if (error.code !== "42P01" && error.code !== "PGRST205") console.error("[Supabase] Failed to fetch site heroes:", error.message);
    return [];
  }
  return (data ?? []) as Row[];
}

const getActiveHeroes = unstable_cache(fetchActiveHeroes, ["site-heroes"], {
  revalidate: 60,
  tags: ["site-heroes"],
});

/** The active hero for `page`; country pages fall back to the homepage hero. */
export async function getSiteHero(page: string, lang: Language = "en"): Promise<SiteHero | null> {
  const rows = await getActiveHeroes();
  const row =
    rows.find((r) => r.page === page) ?? (page.startsWith("country:") ? rows.find((r) => r.page === "home") : undefined);
  if (!row) return null;
  return {
    imageDesktop: row.image_desktop,
    imageMobile: row.image_mobile,
    alt: localized(row.translations, "alt_text", lang, row.alt_text) ?? row.alt_text,
    credit: localized(row.translations, "credit", lang, row.credit) ?? row.credit,
    focalPoint: row.focal_point || "50% 50%",
  };
}
