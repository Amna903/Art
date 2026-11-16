/**
 * Serves Supabase storage images (artist portraits, hero images, full-size
 * artworks) through Vercel's CDN, like app/thumbs does for thumbnails.
 * /media/<public|sign>/<bucket>/<path>[?token=…] mirrors
 * <supabase>/storage/v1/object/<public|sign>/<bucket>/<path>[?token=…].
 * Signed links carry their own token, which Supabase still checks; every
 * stored file has a unique path, so responses are cached for a year and
 * Supabase is only asked on a CDN miss.
 */
const ORIGIN = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/`;
const VALID = /^(public|sign)\/[A-Za-z0-9_-]+\/[^?#]+\.(webp|jpe?g|png|gif|avif)$/i;

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.map(encodeURIComponent).join("/");
  if (!VALID.test(path) || path.includes("..")) return new Response("Not found", { status: 404 });
  const token = new URL(req.url).searchParams.get("token");
  if (path.startsWith("sign/") && !token) return new Response("Not found", { status: 404 });

  const upstream = await fetch(ORIGIN + path + (token ? `?token=${encodeURIComponent(token)}` : ""), { cache: "no-store" });
  const type = upstream.headers.get("content-type") ?? "";
  if (!upstream.ok || !upstream.body || !type.startsWith("image/")) {
    return new Response("Not found", { status: upstream.status === 404 ? 404 : 502, headers: { "Cache-Control": "no-store" } });
  }
  return new Response(upstream.body, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "CDN-Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
