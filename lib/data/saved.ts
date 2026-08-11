import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

export type SavedArtworkInput = {
  artworkSlug: string;
  artworkTitle: string;
  artistName?: string | null;
  artworkImage?: string | null;
};

export type SavedArtworkRow = {
  id: string;
  user_id: string;
  artwork_slug: string;
  artwork_title: string;
  artist_name: string | null;
  artwork_image: string | null;
  created_at: string;
};

const LOCAL_STORAGE_KEY_PREFIX = "nu_art_saved_artworks_";
export const SAVED_ARTWORKS_EVENT = "nu_art_saved_artworks_changed";

function getStorageKey(userId?: string | null): string {
  return `${LOCAL_STORAGE_KEY_PREFIX}${userId || "guest"}`;
}

function getLocalSavedArtworks(userId?: string | null): SavedArtworkRow[] {
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
    console.error("Error reading saved artworks from localStorage:", err);
  }
  return [];
}

function setLocalSavedArtworks(items: SavedArtworkRow[], userId?: string | null) {
  if (typeof window === "undefined") return;
  try {
    const key = getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(SAVED_ARTWORKS_EVENT, { detail: { items } }));
  } catch (err) {
    console.error("Error writing saved artworks to localStorage:", err);
  }
}

export async function isArtworkSaved(userId: string | undefined | null, slug: string): Promise<boolean> {
  const localItems = getLocalSavedArtworks(userId);
  if (localItems.some((item) => item.artwork_slug === slug)) {
    return true;
  }

  if (userId && isSupabaseConfigured()) {
    try {
      const { data } = await supabase
        .from("saved_artworks")
        .select("id")
        .eq("user_id", userId)
        .eq("artwork_slug", slug)
        .maybeSingle();
      if (data) return true;
    } catch (e) {
      // Ignore Supabase fetch errors
    }
  }

  return false;
}

export async function saveArtwork(userId: string | undefined | null, input: SavedArtworkInput) {
  const localItems = getLocalSavedArtworks(userId);
  const exists = localItems.some((i) => i.artwork_slug === input.artworkSlug);

  const newRow: SavedArtworkRow = {
    id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    user_id: userId || "guest",
    artwork_slug: input.artworkSlug,
    artwork_title: input.artworkTitle,
    artist_name: input.artistName ?? null,
    artwork_image: input.artworkImage ?? null,
    created_at: new Date().toISOString(),
  };

  if (!exists) {
    const updated = [newRow, ...localItems];
    setLocalSavedArtworks(updated, userId);
  }

  if (userId && isSupabaseConfigured()) {
    try {
      await supabase.from("saved_artworks").insert({
        user_id: userId,
        artwork_slug: input.artworkSlug,
        artwork_title: input.artworkTitle,
        artist_name: input.artistName ?? null,
        artwork_image: input.artworkImage ?? null,
      });
    } catch (e) {
      console.warn("Supabase insert error for saved_artworks:", e);
    }
  }

  return { data: newRow, error: null };
}

export async function unsaveArtwork(userId: string | undefined | null, slug: string) {
  const localItems = getLocalSavedArtworks(userId);
  const updated = localItems.filter((i) => i.artwork_slug !== slug);
  setLocalSavedArtworks(updated, userId);

  if (userId && isSupabaseConfigured()) {
    try {
      await supabase.from("saved_artworks").delete().eq("user_id", userId).eq("artwork_slug", slug);
    } catch (e) {
      console.warn("Supabase delete error for saved_artworks:", e);
    }
  }

  return { error: null };
}

export async function listSavedArtworks(userId: string | undefined | null): Promise<SavedArtworkRow[]> {
  let localItems = getLocalSavedArtworks(userId);

  // When a guest logs in, sync any guest localStorage items up to Supabase
  if (userId && isSupabaseConfigured() && typeof window !== "undefined") {
    try {
      const guestRaw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}guest`);
      if (guestRaw) {
        const guestItems: SavedArtworkRow[] = JSON.parse(guestRaw);
        if (guestItems.length > 0) {
          const insertPayloads = guestItems.map((g) => ({
            user_id: userId,
            artwork_slug: g.artwork_slug,
            artwork_title: g.artwork_title,
            artist_name: g.artist_name,
            artwork_image: g.artwork_image,
          }));
          await supabase.from("saved_artworks").upsert(insertPayloads, { onConflict: "user_id,artwork_slug" });
          localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}guest`);
        }
      }
    } catch {
      // Ignore migration errors
    }
  }

  let dbItems: SavedArtworkRow[] = [];
  if (userId && isSupabaseConfigured()) {
    try {
      const { data } = await supabase
        .from("saved_artworks")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (data) {
        dbItems = data as SavedArtworkRow[];
      }
    } catch {
      // Ignore fetch error
    }
  }

  const mergedMap = new Map<string, SavedArtworkRow>();
  for (const item of localItems) {
    mergedMap.set(item.artwork_slug, item);
  }
  for (const item of dbItems) {
    mergedMap.set(item.artwork_slug, item);
  }

  let merged = Array.from(mergedMap.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  // Snapshots freeze the image at save-time. Re-resolve from artworks so
  // guest and client dashboards don't keep showing replaced photos forever.
  if (isSupabaseConfigured() && merged.length > 0) {
    try {
      const slugs = merged.map((m) => m.artwork_slug);
      const { data: live } = await supabase
        .from("artworks")
        .select("slug, image_url, title")
        .in("slug", slugs);
      if (live?.length) {
        const bySlug = new Map(live.map((row) => [row.slug, row]));
        merged = merged.map((row) => {
          const current = bySlug.get(row.artwork_slug);
          if (!current) return row;
          return {
            ...row,
            artwork_image: current.image_url || row.artwork_image,
            artwork_title: current.title || row.artwork_title,
          };
        });
      }
    } catch {
      // Ignore live resolution error
    }
  }

  setLocalSavedArtworks(merged, userId);
  return merged;
}

