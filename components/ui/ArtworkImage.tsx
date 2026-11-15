"use client";

import Image, { type ImageProps } from "next/image";
import { useCallback, useState } from "react";

/**
 * next/image for artwork pictures. Artwork thumbnails are pre-generated at
 * upload (640 / 1280 px WebP, lib/images/thumbnails.ts) and served straight
 * from storage; the site-wide loader (lib/images/loader.ts) picks the size.
 *
 * A picture that fails to load never stays a broken-image icon. It steps down:
 *   1. `src` (usually the thumbnail);
 *   2. `fallbackSrc` (the original upload), e.g. when a thumbnail file is
 *      missing;
 *   3. a neutral paper-coloured box.
 */

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
  if (stage >= 2 || (stage === 1 && !retry) || !srcKey.trim()) {
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
    // The fallback picture, exactly as stored.
    // eslint-disable-next-line jsx-a11y/alt-text -- alt is passed through in props
    return <Image key="retry" {...props} src={retry!} unoptimized ref={refFor(1)} onError={() => failAt(1)} />;
  }

  // eslint-disable-next-line jsx-a11y/alt-text -- alt is passed through in props
  return <Image key="first" {...props} ref={refFor(0)} onError={() => failAt(0)} />;
}
