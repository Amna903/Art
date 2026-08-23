import { geoConicEqualArea, geoPath } from "d3-geo";
import fs from "fs";

const africaGeo = JSON.parse(fs.readFileSync("lib/data/africa-geo.json", "utf8"));
const africaTs = fs.readFileSync("lib/data/africa.ts", "utf8");

// crude extraction of slug + name pairs (matches the pattern used in africa.ts)
const countryRe = /slug:\s*"([^"]+)",\s*code:\s*"[^"]+",\s*name:\s*"([^"]+)"/g;
const countries = [];
let m;
while ((m = countryRe.exec(africaTs))) {
  countries.push({ slug: m[1], name: m[2] });
}
console.error("parsed countries:", countries.length);

const W = 1000, H = 1000;
const features = africaGeo.features;

const projection = geoConicEqualArea().rotate([-20, 0]).parallels([-15, 30]);
projection.fitExtent([[40, 50], [W - 40, H - 50]], { type: "FeatureCollection", features });
const path = geoPath(projection);

const inputs = [];
for (const f of features) {
  const admin = f.properties.ADMIN;
  const c = countries.find(c => c.name === admin || c.name.toLowerCase() === admin.toLowerCase());
  if (!c) { console.error("no match for geo ADMIN:", admin); continue; }
  const d = path(f);
  if (!d) continue;
  const centroid = path.centroid(f);
  const bounds = path.bounds(f);
  if (!Number.isFinite(centroid[0]) || !Number.isFinite(bounds[0][0])) continue;
  inputs.push({ slug: c.slug, centroid, bbox: [bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1]] });
}
console.error("matched country inputs:", inputs.length);

// normalizeToBox replicate: target box (70,70)-(930,930)
const MARGIN = 70;
const box = [MARGIN, MARGIN, W - MARGIN, H - MARGIN];
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
for (const it of inputs) {
  minX = Math.min(minX, it.bbox[0]);
  minY = Math.min(minY, it.bbox[1]);
  maxX = Math.max(maxX, it.bbox[2]);
  maxY = Math.max(maxY, it.bbox[3]);
}
const sx = (box[2] - box[0]) / (maxX - minX);
const sy = (box[3] - box[1]) / (maxY - minY);
const mapX = (x) => box[0] + (x - minX) * sx;
const mapY = (y) => box[1] + (y - minY) * sy;

const out = {};
for (const it of inputs) {
  out[it.slug] = [Math.round(mapX(it.centroid[0]) * 10) / 10, Math.round(mapY(it.centroid[1]) * 10) / 10];
}
fs.writeFileSync("/tmp/current-positions.json", JSON.stringify(out, null, 2));
console.error("wrote /tmp/current-positions.json with", Object.keys(out).length, "entries");
console.log(JSON.stringify(out, null, 2));
