import sharp from "sharp";

/** 8×8 average hash → 16-char hex (64 bits). */
export async function computeAverageHash(image: Buffer | ArrayBuffer): Promise<string> {
  const input = Buffer.isBuffer(image) ? image : Buffer.from(image);
  const { data } = await sharp(input)
    .greyscale()
    .resize(8, 8, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i]!;
  const avg = sum / data.length;

  let bits = BigInt(0);
  for (let i = 0; i < data.length; i++) {
    if (data[i]! >= avg) bits |= BigInt(1) << BigInt(63 - i);
  }
  return bits.toString(16).padStart(16, "0");
}

export function hammingDistance(a: string, b: string): number {
  if (!/^[0-9a-f]{16}$/i.test(a) || !/^[0-9a-f]{16}$/i.test(b)) {
    return 64;
  }
  let x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let dist = 0;
  while (x > BigInt(0)) {
    dist += Number(x & BigInt(1));
    x >>= BigInt(1);
  }
  return dist;
}

/** Similarity 0–1 derived from hamming distance on a 64-bit hash. */
export function similarityFromDistance(distance: number): number {
  return Math.max(0, 1 - distance / 64);
}
