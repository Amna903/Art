/**
 * Fills static fallback slots one-for-one with real items as they become
 * available — item 0 takes slot 0, item 1 takes slot 1, etc. Remaining
 * fallback slots stay put until replaced; once `real` outgrows `fallback`,
 * the extra real items are appended after.
 */
export function mergeSlots<T>(real: T[], fallback: T[]): T[] {
  const slots = Math.max(real.length, fallback.length);
  const merged: T[] = [];
  for (let i = 0; i < slots; i++) {
    merged.push(real[i] ?? fallback[i]);
  }
  return merged;
}
