/**
 * Site-wide next/image loader (next.config.ts `images.loaderFile`).
 *
 * Vercel's image optimizer is not used: on the Hobby plan its monthly quota
 * runs out and every optimized image then fails. Instead:
 *   - artwork thumbnails (artwork-thumbs/<id>/<version>/<640|1280>.webp) get
 *     the smallest pre-generated size that covers the requested width, so
 *     phones download the 640 px file and large screens the 1280 px one;
 *   - every other image is served exactly as stored (portraits and hero
 *     images are already compressed to WebP before upload).
 */
const THUMB = /\/(artwork-)?thumbs\/.+\/(640|1280)\.webp(\?.*)?$/;

export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }): string {
  if (THUMB.test(src)) return src.replace(/\/(640|1280)\.webp/, `/${width <= 640 ? 640 : 1280}.webp`);
  return src;
}
