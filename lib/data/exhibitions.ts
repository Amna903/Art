import { unstable_cache } from "next/cache";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

export type Exhibition = Database["public"]["Tables"]["exhibitions"]["Row"];

/** Returns [] (not an error) when Supabase isn't configured or has no exhibitions yet. */
async function fetchPublishedExhibitions(): Promise<Exhibition[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from("exhibitions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) {
      if (error) console.error("[Supabase] Failed to fetch exhibitions:", error.message);
      return [];
    }
    return data;
  } catch (err) {
    console.error("[Supabase] Failed to fetch exhibitions:", err);
    return [];
  }
}

// Cached so every /exhibitions and /discover/:country page view doesn't
// each re-hit Supabase — same 60s window used for journal posts and artworks.
// Tagged so an admin publish/edit/delete can invalidate this instantly via
// revalidateTag("exhibitions") instead of waiting out the 60s window — see
// app/api/revalidate/route.ts.
export const getPublishedExhibitions = unstable_cache(fetchPublishedExhibitions, ["published-exhibitions"], {
  revalidate: 60,
  tags: ["exhibitions"],
});
