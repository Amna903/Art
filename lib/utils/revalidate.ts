/** Pings /api/revalidate after a client-side Supabase write so cached server
 * reads (unstable_cache, 60s window) and ISR HTML pick up the change
 * immediately instead of on their next natural revalidation. Best-effort:
 * a failure here just means the change takes up to 60s to show up elsewhere. */
export async function pingRevalidate(
  tag: "journal-posts" | "exhibitions" | "artworks" | "collections" | "page-blocks",
  opts?: { page?: string },
) {
  try {
    await fetch("/api/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag, page: opts?.page }),
    });
  } catch {
    // best-effort
  }
}
