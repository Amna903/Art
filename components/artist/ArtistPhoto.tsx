"use client";

import { useBrokenImage } from "@/lib/utils/use-broken-image";
import Image from "next/image";

/** Fills its (relative) parent with an artist's photo, or their initials on
 * --nua-paper when the photo is missing or fails to load (change brief §8:
 * never an empty or broken box). */
export function ArtistPhoto({
  src,
  name,
  alt,
  sizes,
  className = "object-cover",
}: {
  src?: string | null;
  name: string;
  alt: string;
  sizes: string;
  className?: string;
}) {
  const { broken, ref, onError } = useBrokenImage();
  if (!src?.trim() || broken) {
    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("");
    return (
      <span
        role="img"
        aria-label={alt}
        className="absolute inset-0 flex items-center justify-center bg-surface-container-low font-display text-7xl text-[var(--nua-grey)]"
      >
        {initials}
      </span>
    );
  }
  return <Image ref={ref} src={src} alt={alt} fill sizes={sizes} className={className} onError={onError} />;
}
