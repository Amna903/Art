"use client";

import Image, { type ImageProps } from "next/image";

/**
 * next/image for artwork pictures. Artwork thumbnails are pre-generated at
 * upload (640 / 1280 px WebP, lib/images/thumbnails.ts) and served straight
 * from storage, so lists, cards and the 3D walls never spend Vercel's
 * per-image optimization quota (Hobby: 5,000 a month). Anything that is not a
 * thumbnail goes through the normal optimizer.
 */
const THUMB = /\/artwork-thumbs\/.+\/(640|1280)\.webp(\?.*)?$/;

export function isThumbnail(src: unknown): src is string {
  return typeof src === "string" && THUMB.test(src);
}

/** The smallest pre-generated size that covers the requested width. */
function thumbLoader({ src, width }: { src: string; width: number }): string {
  return src.replace(/\/(640|1280)\.webp/, `/${width <= 640 ? 640 : 1280}.webp`);
}

export function ArtworkImage(props: ImageProps) {
  // eslint-disable-next-line jsx-a11y/alt-text -- alt is passed through in props
  return isThumbnail(props.src) ? <Image {...props} loader={thumbLoader} /> : <Image {...props} />;
}
