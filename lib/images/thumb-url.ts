/**
 * Artwork thumbnails are stored in Supabase's public `artwork-thumbs` bucket,
 * but the site links to them as /thumbs/<id>/<version>/<640|1280>.webp
 * (app/thumbs/[...path]/route.ts). That route is cached by Vercel's CDN, so
 * Supabase sends each file about once instead of on every page view — which
 * keeps the site well inside Supabase's egress allowance.
 */
const MARKER = "/storage/v1/object/public/artwork-thumbs/";

/** Site-relative URL for a thumbs folder or file stored in Supabase. */
export function siteThumbUrl(supabaseUrl: string): string {
  const i = supabaseUrl.indexOf(MARKER);
  return i === -1 ? supabaseUrl : `/thumbs/${supabaseUrl.slice(i + MARKER.length)}`;
}

const STORAGE = "/storage/v1/object/";

/** Site-relative /media URL for any other image in Supabase storage (app/media). */
export function siteMediaUrl(url: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !url.startsWith(base + STORAGE)) return url;
  return `/media/${url.slice(base.length + STORAGE.length)}`;
}
