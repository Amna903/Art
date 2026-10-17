/**
 * Resizes an image in the browser so its longest constraint fits
 * `maxWidth` × `maxHeight` and re-encodes it as WebP, lowering quality until
 * the file is at most `maxBytes`. Used for hero uploads (change brief §7:
 * desktop ≤ 400 KB, mobile ≤ 250 KB) and artist photos (§8).
 */
export async function compressImage(
  file: File,
  { maxWidth, maxHeight, maxBytes }: { maxWidth: number; maxHeight: number; maxBytes: number },
): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process the image.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let blob: Blob | null = null;
  for (const quality of [0.86, 0.8, 0.72, 0.64, 0.56, 0.48, 0.4]) {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (blob && blob.size <= maxBytes) break;
  }
  if (!blob) throw new Error("Could not process the image.");
  if (blob.size > maxBytes) throw new Error("The image is still too large after compression. Try a smaller image.");

  const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
  return new File([blob], name, { type: "image/webp" });
}

/** Artist photos (change brief §8): files over 5 MB are rejected; the rest are
 * stored as a 1200 px WebP (profile page). Cards get their 600 px version from
 * next/image, which resizes on request. */
export const MAX_ARTIST_PHOTO_BYTES = 5 * 1024 * 1024;

export async function prepareArtistPhoto(file: File): Promise<File> {
  if (file.size > MAX_ARTIST_PHOTO_BYTES) throw new Error("Photos must be 5 MB or smaller.");
  return compressImage(file, { maxWidth: 1200, maxHeight: 1200, maxBytes: 350 * 1024 });
}
