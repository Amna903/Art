/**
 * Serves artwork thumbnails from Supabase storage through Vercel's CDN.
 * Every file path is versioned (a new upload gets a new folder), so responses
 * are cached for a year and Supabase is only asked on a CDN miss.
 */
const ORIGIN = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/artwork-thumbs/`;
const VALID = /^[A-Za-z0-9-]+\/[A-Za-z0-9]+\/(640|1280)\.webp$/;

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join("/");
  if (!VALID.test(path)) return new Response("Not found", { status: 404 });

  const upstream = await fetch(ORIGIN + path, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return new Response("Not found", { status: upstream.status === 404 ? 404 : 502, headers: { "Cache-Control": "no-store" } });
  }
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "CDN-Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
