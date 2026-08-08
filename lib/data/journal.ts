import { unstable_cache } from "next/cache";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

export type JournalPost = Database["public"]["Tables"]["journal_posts"]["Row"];

/** Returns [] (not an error) when Supabase isn't configured or has no posts yet. */
async function fetchPublishedJournalPosts(): Promise<JournalPost[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from("journal_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) {
      if (error) console.error("[Supabase] Failed to fetch journal posts:", error.message);
      return [];
    }
    return data;
  } catch (err) {
    console.error("[Supabase] Failed to fetch journal posts:", err);
    return [];
  }
}

async function fetchPublishedJournalPostBySlug(slug: string): Promise<JournalPost | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.from("journal_posts").select("*").eq("slug", slug).maybeSingle();
    if (error || !data) return null;
    return data;
  } catch (err) {
    console.error("[Supabase] Failed to fetch journal post by slug:", err);
    return null;
  }
}

// Cached at the module boundary (not per-call-site) so every reader — the
// /journal listing, the "Latest from the Journal" grid, and /discover/:country
// — shares one 60s-fresh result instead of each re-hitting Supabase.
// Tagged so an admin action (publish, edit, pin) can invalidate this
// instantly via revalidateTag("journal-posts") instead of waiting out the
// 60s window — see app/api/revalidate/route.ts.
export const getPublishedJournalPosts = unstable_cache(fetchPublishedJournalPosts, ["published-journal-posts"], {
  revalidate: 60,
  tags: ["journal-posts"],
});

export const getPublishedJournalPostBySlug = unstable_cache(
  fetchPublishedJournalPostBySlug,
  ["published-journal-post-by-slug"],
  { revalidate: 60, tags: ["journal-posts"] },
);
