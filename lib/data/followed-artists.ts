import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

export type FollowArtistInput = {
  artistSlug: string;
  artistName: string;
  artistImage?: string | null;
  technique?: string | null;
  countryName?: string | null;
};

export type FollowedArtistRow = {
  id: string;
  user_id: string;
  artist_slug: string;
  artist_name: string;
  artist_image: string | null;
  technique: string | null;
  country_name: string | null;
  created_at: string;
};

const LOCAL_STORAGE_KEY_PREFIX = "nu_art_followed_artists_";
export const FOLLOWED_ARTISTS_EVENT = "nu_art_followed_artists_changed";

function getStorageKey(userId?: string | null): string {
  return `${LOCAL_STORAGE_KEY_PREFIX}${userId || "guest"}`;
}

function getLocalFollowedArtists(userId?: string | null): FollowedArtistRow[] {
  if (typeof window === "undefined") return [];
  try {
    const key = getStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
    if (userId) {
      const guestRaw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}guest`);
      if (guestRaw) return JSON.parse(guestRaw);
    }
  } catch (err) {
    console.error("Error reading followed artists from localStorage:", err);
  }
  return [];
}

function setLocalFollowedArtists(items: FollowedArtistRow[], userId?: string | null) {
  if (typeof window === "undefined") return;
  try {
    const key = getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(FOLLOWED_ARTISTS_EVENT, { detail: { items } }));
  } catch (err) {
    console.error("Error writing followed artists to localStorage:", err);
  }
}

export async function isArtistFollowed(userId: string | undefined | null, slug: string): Promise<boolean> {
  const localItems = getLocalFollowedArtists(userId);
  if (localItems.some((item) => item.artist_slug === slug)) {
    return true;
  }

  if (userId && isSupabaseConfigured()) {
    try {
      const { data } = await supabase
        .from("followed_artists")
        .select("id")
        .eq("user_id", userId)
        .eq("artist_slug", slug)
        .maybeSingle();
      if (data) return true;
    } catch (e) {
      // Ignore Supabase fetch errors
    }
  }

  return false;
}

export async function followArtist(userId: string | undefined | null, input: FollowArtistInput) {
  const localItems = getLocalFollowedArtists(userId);
  const exists = localItems.some((i) => i.artist_slug === input.artistSlug);

  const newRow: FollowedArtistRow = {
    id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    user_id: userId || "guest",
    artist_slug: input.artistSlug,
    artist_name: input.artistName,
    artist_image: input.artistImage ?? null,
    technique: input.technique ?? null,
    country_name: input.countryName ?? null,
    created_at: new Date().toISOString(),
  };

  if (!exists) {
    const updated = [newRow, ...localItems];
    setLocalFollowedArtists(updated, userId);
  }

  if (userId && isSupabaseConfigured()) {
    try {
      await supabase.from("followed_artists").insert({
        user_id: userId,
        artist_slug: input.artistSlug,
        artist_name: input.artistName,
        artist_image: input.artistImage ?? null,
        technique: input.technique ?? null,
        country_name: input.countryName ?? null,
      });
    } catch (e) {
      console.warn("Supabase insert error for followed_artists:", e);
    }
  }

  return { data: newRow, error: null };
}

export async function unfollowArtist(userId: string | undefined | null, slug: string) {
  const localItems = getLocalFollowedArtists(userId);
  const updated = localItems.filter((i) => i.artist_slug !== slug);
  setLocalFollowedArtists(updated, userId);

  if (userId && isSupabaseConfigured()) {
    try {
      await supabase.from("followed_artists").delete().eq("user_id", userId).eq("artist_slug", slug);
    } catch (e) {
      console.warn("Supabase delete error for followed_artists:", e);
    }
  }

  return { error: null };
}

export async function listFollowedArtists(userId: string | undefined | null): Promise<FollowedArtistRow[]> {
  const localItems = getLocalFollowedArtists(userId);

  if (!userId || !isSupabaseConfigured()) {
    return localItems;
  }

  try {
    const { data, error } = await supabase
      .from("followed_artists")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error || !data) {
      return localItems;
    }

    const mergedMap = new Map<string, FollowedArtistRow>();
    for (const item of localItems) {
      mergedMap.set(item.artist_slug, item);
    }
    for (const item of data as FollowedArtistRow[]) {
      mergedMap.set(item.artist_slug, item);
    }

    const merged = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    setLocalFollowedArtists(merged, userId);
    return merged;
  } catch (err) {
    return localItems;
  }
}

