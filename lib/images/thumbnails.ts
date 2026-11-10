import sharp from "sharp";
import { fetchImageBuffer, serviceClient } from "@/lib/originality/check";

/**
 * Pre-generated artwork thumbnails (640 and 1280 px WebP) in the public
 * `artwork-thumbs` bucket. Lists, cards and the 3D walls use these files
 * directly (components/ui/ArtworkImage.tsx), so they never spend Vercel's
 * per-image optimization quota.
 *
 * Files live at artwork-thumbs/<artwork id>/<version>/<640|1280>.webp and
 * artworks.thumb_base stores the public URL of <artwork id>/<version>. A new
 * version is written whenever the image changes, so browsers and CDNs can
 * cache each file forever.
 */
export const THUMB_BUCKET = "artwork-thumbs";
export const THUMB_WIDTHS = [640, 1280] as const;

type Row = { id: string; image_url: string };

async function generateOne(row: Row): Promise<string> {
  const db = serviceClient();
  const source = await fetchImageBuffer(row.image_url);
  const version = Date.now().toString(36);
  const folder = `${row.id}/${version}`;

  for (const width of THUMB_WIDTHS) {
    const file = await sharp(source)
      .rotate() // respect camera orientation
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    const { error } = await db.storage.from(THUMB_BUCKET).upload(`${folder}/${width}.webp`, file, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: true,
    });
    if (error) throw new Error(error.message);
  }

  const base = db.storage.from(THUMB_BUCKET).getPublicUrl(folder).data.publicUrl;
  const { error } = await db.from("artworks").update({ thumb_base: base }).eq("id", row.id);
  if (error) throw new Error(error.message);

  // Remove older versions of this artwork's thumbnails.
  const { data: versions } = await db.storage.from(THUMB_BUCKET).list(row.id);
  const stale = (versions ?? []).filter((v) => v.name !== version).flatMap((v) => THUMB_WIDTHS.map((w) => `${row.id}/${v.name}/${w}.webp`));
  if (stale.length) await db.storage.from(THUMB_BUCKET).remove(stale);

  return base;
}

export type ThumbResult = { id: string; ok: boolean; error?: string };

/** (Re)generates thumbnails for these artworks. */
export async function generateThumbnails(ids: string[]): Promise<ThumbResult[]> {
  if (ids.length === 0) return [];
  const { data, error } = await serviceClient().from("artworks").select("id, image_url").in("id", ids);
  if (error) throw new Error(error.message);
  const results: ThumbResult[] = [];
  for (const row of (data ?? []) as Row[]) {
    if (!row.image_url) continue;
    try {
      await generateOne(row);
      results.push({ id: row.id, ok: true });
    } catch (err) {
      results.push({ id: row.id, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return results;
}

/** Generates thumbnails for up to `limit` artworks that have none yet. */
export async function generateMissingThumbnails(limit = 20): Promise<{ done: ThumbResult[]; remaining: number }> {
  const db = serviceClient();
  const { data } = await db
    .from("artworks")
    .select("id")
    .is("thumb_base", null)
    .neq("image_url", "")
    .order("created_at", { ascending: false })
    .limit(limit);
  const done = await generateThumbnails((data ?? []).map((r) => r.id));
  const { count } = await db
    .from("artworks")
    .select("id", { count: "exact", head: true })
    .is("thumb_base", null)
    .neq("image_url", "");
  return { done, remaining: count ?? 0 };
}
