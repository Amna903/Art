// Curated African-first imagery library.
// Images live in /public/images and are referenced as plain URL strings
// (as opposed to the original bundler-imported asset modules) — the
// deterministic pickImage(seed, kind) API is unchanged.

export type ImageKind =
  | "artwork" // any medium — mixes painting / textile / sculpture / photography / digital / mixed
  | "painting"
  | "textile"
  | "sculpture"
  | "photography"
  | "digital"
  | "mixed"
  | "portrait" // artist portrait
  | "editorial" // journal, stories, exhibitions
  | "gallery" // interior / installation
  | "hero"; // large hero / cover

const img = (name: string) => `/images/${name}`;

const PAINTINGS = [1, 2, 3, 4, 5].map((n) => img(`art-painting-${n}.jpg`));
const TEXTILES = [1, 2, 3, 4, 5].map((n) => img(`art-textile-${n}.jpg`));
const SCULPTURES = [1, 2, 3, 4, 5].map((n) => img(`art-sculpture-${n}.jpg`));
const PHOTOGRAPHY = [1, 2, 3, 4, 5].map((n) => img(`art-photography-${n}.jpg`));
const DIGITAL = [1, 2, 3, 4].map((n) => img(`art-digital-${n}.jpg`));
const MIXED = [1, 2, 3, 4].map((n) => img(`art-mixed-${n}.jpg`));
const PORTRAITS = [1, 2, 3, 4, 5, 6].map((n) => img(`artist-portrait-${n}.jpg`));
const gallery1 = img("gallery-interior-1.jpg");
const hero1 = img("hero-editorial-1.jpg");

// All artworks combined for the generic "artwork" kind.
const ARTWORKS = [...PAINTINGS, ...TEXTILES, ...SCULPTURES, ...PHOTOGRAPHY, ...DIGITAL, ...MIXED];

const EDITORIALS = [hero1, gallery1, TEXTILES[0], PHOTOGRAPHY[0], PAINTINGS[2], MIXED[0], DIGITAL[1], PHOTOGRAPHY[3]];
const GALLERIES = [gallery1, hero1];

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickFrom<T>(pool: T[], seed: string, kind: string): T {
  const h = hash(`${kind}:${seed}`);
  return pool[h % pool.length];
}

export function pickImage(seed: string, kind: ImageKind = "artwork"): string {
  switch (kind) {
    case "painting":
      return pickFrom(PAINTINGS, seed, kind);
    case "textile":
      return pickFrom(TEXTILES, seed, kind);
    case "sculpture":
      return pickFrom(SCULPTURES, seed, kind);
    case "photography":
      return pickFrom(PHOTOGRAPHY, seed, kind);
    case "digital":
      return pickFrom(DIGITAL, seed, kind);
    case "mixed":
      return pickFrom(MIXED, seed, kind);
    case "portrait":
      return pickFrom(PORTRAITS, seed, kind);
    case "editorial":
      return pickFrom(EDITORIALS, seed, kind);
    case "gallery":
      return pickFrom(GALLERIES, seed, kind);
    case "hero":
      return hero1;
    case "artwork":
    default:
      return pickFrom(ARTWORKS, seed, "artwork");
  }
}

// Map a technique label (as used in the artist directory) to a specific
// medium pool, so an artist's featured work matches their declared practice.
export function pickImageForTechnique(seed: string, technique: string): string {
  const t = technique.toLowerCase();
  if (t.includes("paint")) return pickFrom(PAINTINGS, seed, "painting");
  if (t.includes("sculpt")) return pickFrom(SCULPTURES, seed, "sculpture");
  if (t.includes("photo")) return pickFrom(PHOTOGRAPHY, seed, "photography");
  if (t.includes("textile")) return pickFrom(TEXTILES, seed, "textile");
  if (t.includes("digital")) return pickFrom(DIGITAL, seed, "digital");
  if (t.includes("mixed")) return pickFrom(MIXED, seed, "mixed");
  return pickFrom(ARTWORKS, seed, "artwork");
}
