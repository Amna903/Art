/** Pings /api/revalidate after a client-side Supabase write so cached server
 * reads (unstable_cache, 60s window) pick up the change immediately instead
 * of on their next natural revalidation. Best-effort: a failure here just
 * means the change takes up to 60s to show up elsewhere, same as before. */
export async function pingRevalidate(tag: "journal-posts" | "exhibitions" | "artworks") {
  try {
    await fetch("/api/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag }),
    });
  } catch {
    // best-effort
  }
}
