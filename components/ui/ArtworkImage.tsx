"use client";

import Image, { type ImageProps } from "next/image";
import { useCallback, useState } from "react";

/**
 * next/image for artwork pictures. Artwork thumbnails are pre-generated at
 * upload (640 / 1280 px WebP, lib/images/thumbnails.ts) and served straight
 * from storage, so lists, cards and the 3D walls never spend Vercel's
 * per-image optimization quota (Hobby: 5,000 a month). Anything that is not a
 * thumbnail goes through the normal optimizer.
 *
 * A picture that fails to load never stays a broken-image icon. It steps down:
 *   1. the thumbnail, or the optimized original;
 *   2. `fallbackSrc` (the original upload) or the same picture without the
 *      optimizer — covers a missing thumbnail file, an optimizer error or an
 *      exhausted optimization quota, and very large or unusual uploads the
 *      optimizer refuses;
 *   3. a neutral paper-coloured box.
 */
const THUMB = /\/artwork-thumbs\/.+\/(640|1280)\.webp(\?.*)?$/;

export function isThumbnail(src: unknown): src is string {
  return typeof src === "string" && THUMB.test(src);
}

/** The smallest pre-generated size that covers the requested width. */
function thumbLoader({ src, width }: { src: string; width: number }): string {
  return src.replace(/\/(640|1280)\.webp/, `/${width <= 640 ? 640 : 1280}.webp`);
}

type Props = ImageProps & {
  /** The original upload, tried when the thumbnail (src) cannot be loaded. */
  fallbackSrc?: string | null;
};

export function ArtworkImage({ fallbackSrc, ...props }: Props) {
  const srcKey = typeof props.src === "string" ? props.src : "";
  // Failures are counted per picture, so a new src starts from the first stage.
  const [failures, setFailures] = useState<{ src: string; stage: number }>({ src: srcKey, stage: 0 });
  const stage = failures.src === srcKey ? failures.stage : 0;

  // `from` is the stage that failed, so the same failure reported twice (by
  // onError and by the ref check) only steps down once.
  const failAt = useCallback(
    (from: number) =>
      setFailures((f) => {
        const current = f.src === srcKey ? f.stage : 0;
        return current === from ? { src: srcKey, stage: from + 1 } : f;
      }),
    [srcKey],
  );
  // onError alone misses images that fail before React hydrates (the browser
  // fires the event before the handler is attached), so also check an image
  // that has already finished loading with nothing to show.
  const refFor = (from: number) => (img: HTMLImageElement | null) => {
    if (img && img.complete && img.naturalWidth === 0 && img.getAttribute("src")) failAt(from);
  };

  const retry = fallbackSrc?.trim() && fallbackSrc !== srcKey ? fallbackSrc.trim() : null;
  const canRetry = !!retry || !isThumbnail(props.src);

  if (stage >= 2 || (stage === 1 && !canRetry) || !srcKey.trim()) {
    return (
      <span
        role="img"
        aria-label={typeof props.alt === "string" ? props.alt : ""}
        className={`${props.fill ? "absolute inset-0" : "inline-block"} bg-surface-container-low`}
        style={props.fill ? undefined : { width: props.width, height: props.height }}
      />
    );
  }

  if (stage === 1) {
    // Straight from storage, no optimizer and no thumbnail loader.
    // eslint-disable-next-line jsx-a11y/alt-text -- alt is passed through in props
    return <Image key="retry" {...props} src={retry ?? props.src} unoptimized loader={undefined} ref={refFor(1)} onError={() => failAt(1)} />;
  }

  return isThumbnail(props.src) ? (
    // eslint-disable-next-line jsx-a11y/alt-text -- alt is passed through in props
    <Image key="first" {...props} loader={thumbLoader} ref={refFor(0)} onError={() => failAt(0)} />
  ) : (
    // eslint-disable-next-line jsx-a11y/alt-text -- alt is passed through in props
    <Image key="first" {...props} ref={refFor(0)} onError={() => failAt(0)} />
  );
}
