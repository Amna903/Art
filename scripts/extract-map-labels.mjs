// Finds the real text labels baked into public/map/map.svg (small
// multi-letter path groups, distinct from the map's decorative shapes),
// computes each one's center as a fraction of the artwork's viewBox, and
// prints a ready-to-paste ANCHOR_TARGETS object for lib/data/africa-shards.ts.
//
// Run with: node scripts/extract-map-labels.mjs
//
// After adding more <path fill="black" .../> country-name labels to
// public/map/map.svg (same pattern as the existing "Ethiopia"/"Burundi"
// labels — a small vectorized text path positioned at that country's spot),
// re-run this script and paste the slugs you can identify into
// ANCHOR_TARGETS. It only reports position + a size hint; you still need to
// eyeball each rendered label to confirm which country it names (see the
// crop-and-render technique below if a position is ambiguous).

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SVG_PATH = path.join(__dirname, "..", "public", "map", "map.svg");

function bboxOf(d) {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
  let i = 0;
  let cx = 0;
  let cy = 0;
  let cmd = null;
  const argCounts = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const upd = (x, y) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };
  const isCmd = (t) => /^[a-zA-Z]$/.test(t);
  while (i < tokens.length) {
    if (isCmd(tokens[i])) {
      cmd = tokens[i];
      i++;
    }
    const upper = cmd.toUpperCase();
    const rel = cmd === cmd.toLowerCase();
    if (upper === "Z") continue;
    const n = argCounts[upper];
    const args = [];
    for (let k = 0; k < n; k++) args.push(parseFloat(tokens[i++]));
    if (upper === "M" || upper === "L" || upper === "T") {
      cx = rel ? cx + args[0] : args[0];
      cy = rel ? cy + args[1] : args[1];
    } else if (upper === "H") {
      cx = rel ? cx + args[0] : args[0];
    } else if (upper === "V") {
      cy = rel ? cy + args[0] : args[0];
    } else if (upper === "C") {
      cx = rel ? cx + args[4] : args[4];
      cy = rel ? cy + args[5] : args[5];
    } else if (upper === "S" || upper === "Q") {
      cx = rel ? cx + args[2] : args[2];
      cy = rel ? cy + args[3] : args[3];
    } else if (upper === "A") {
      cx = rel ? cx + args[5] : args[5];
      cy = rel ? cy + args[6] : args[6];
    }
    upd(cx, cy);
    if (upper === "M") cmd = rel ? "l" : "L";
  }
  return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY };
}

const svg = fs.readFileSync(SVG_PATH, "utf8");
const viewBoxMatch = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
const vbW = parseFloat(viewBoxMatch[1]);
const vbH = parseFloat(viewBoxMatch[2]);

const lines = svg.split("\n");
const results = [];
lines.forEach((line, idx) => {
  const m = line.match(/<path d="([^"]+)"/);
  if (!m) return;
  const mCount = (m[1].match(/M/g) || []).length;
  if (mCount < 3) return; // need several letters to look like a word
  const bb = bboxOf(m[1]);
  if (bb.w > 10 && bb.w < 200 && bb.h > 5 && bb.h < 30) {
    const cx = (bb.minX + bb.maxX) / 2;
    const cy = (bb.minY + bb.maxY) / 2;
    results.push({ line: idx + 1, cx, cy, fx: cx / vbW, fy: cy / vbH, w: bb.w, h: bb.h });
  }
});

console.log(`Found ${results.length} label-like path(s) in ${SVG_PATH}\n`);
for (const r of results) {
  console.log(`line ${r.line}: center=(${r.cx.toFixed(1)}, ${r.cy.toFixed(1)})  fraction=(${r.fx.toFixed(4)}, ${r.fy.toFixed(4)})  size=${r.w.toFixed(0)}x${r.h.toFixed(0)}`);
}

console.log("\n// Paste into ANCHOR_TARGETS (lib/data/africa-shards.ts) after identifying each slug:");
console.log("{");
for (const r of results) {
  console.log(`  "<slug>": [${r.fx.toFixed(4)}, ${r.fy.toFixed(4)}], // line ${r.line}, verify text`);
}
console.log("}");
