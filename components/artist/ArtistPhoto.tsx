"use client";

import { useState } from "react";
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
  const [broken, setBroken] = useState(false);
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
        className="absolute inset-0 flex items-center justify-center bg-[var(--nua-paper)] font-display text-7xl text-[var(--nua-grey)]"
      >
        {initials}
      </span>
    );
  }
  return <Image src={src} alt={alt} fill sizes={sizes} className={className} onError={() => setBroken(true)} />;
}
