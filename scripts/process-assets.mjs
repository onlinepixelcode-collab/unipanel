// Turns the scraped swatch renders into web textures and writes src/data/catalogue.ts.
//
// For every finish it produces (in public/):
//   swatch/{id}.webp      the original product render (slab on black), for cards
//   tex/{id}.jpg          the flat door face, cropped from the render, 1024px long edge (desktop)
//   tex-sm/{id}.jpg       same, 512px (mobile / low tier)
//   thumb/{id}.webp       240px square crop for chips and the finish drawer
//   nrm/{id}.jpg          tangent-space normal map from luminance (relief finishes only)
//
// Usage: npm run assets
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "catalogue");
const PUB = path.join(ROOT, "public");

// The product renders show a door standing on black. The flat front face sits in
// this fraction of the frame on every render (checked across all 95 images).
const FACE = { left: 0.275, top: 0.27, right: 0.815, bottom: 0.975 };

const decode = (s) =>
  s
    .replace(/&#8211;/g, "–")
    .replace(/&#8217;/g, "’")
    .replace(/&amp;/g, "&")
    .trim();

const titleCase = (s) =>
  s === s.toUpperCase()
    ? s
        .toLowerCase()
        .replace(/\b([a-z])/g, (m) => m.toUpperCase())
        .replace(/\b(Ah7|Ap5|Al2|Ln01|Ln03|So71|So72|U129|Fc18|Fb38)\b/gi, (m) => m.toUpperCase())
    : s;

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const COLLECTION_MAP = {
  premium_italian_range: "premium-italian",
  matte: "matte",
  gloss: "gloss",
  metal: "metal",
  "wood-grain": "woodgrain",
  marble: "marble",
  textured: "textured",
  "real-stone": "real-stone",
  "real-glass": "real-glass",
};

function parseName(raw, cats) {
  let full = decode(raw);
  let name = full;
  let code = null;
  let metallic = /metallic/i.test(full);

  // "Black – 8102", "Silver – 85385 (Metallic)", "Grafite_85387 (Metallic)"
  name = name.replace(/\(metallic\)/i, "").replace(/_/g, " ").trim();
  const dash = name.match(/^(.*?)\s*–\s*([0-9]{3,6})$/);
  if (dash) {
    name = dash[1].trim();
    code = dash[2];
  }
  if (!code) {
    const tail = name.match(/^(.*\S)\s+([A-Z]{0,2}[0-9]{2,5}|[A-Z]{1,2}[0-9]{1,2}|[0-9]{3,5})$/i);
    if (tail && !/^0[0-9]$/.test(tail[2])) {
      name = tail[1];
      code = tail[2].toUpperCase();
    }
  }
  if (metallic && !/metallic/i.test(name)) name = `${name} Metallic`;
  name = titleCase(name).replace(/Titanium\/oxygen/i, "Titanium / Oxygen");
  full = titleCase(full.replace(/_/g, " "));

  let display = name;
  if (cats.includes("real-stone")) display = name.replace(/\s*Real Stone$/i, "");
  if (cats.includes("real-glass")) display = name.replace(/\s*(Real )?Glass$/i, "");
  return { full, name: display, code };
}

function kindOf(name, cats) {
  const n = name.toLowerCase();
  if (cats.includes("real-glass")) return n.startsWith("satin") ? "glass-satin" : "glass";
  if (cats.includes("real-stone")) return "stone";
  if (cats.includes("leather")) return "leather";
  if (/loom|tessuto|carbon weave|nadir/.test(n)) return "weave";
  if (/^titan\s|cross metal/.test(n)) return "textured-metal";
  if (/calacatta|firestone|siena|paros/.test(n)) return "marble-textured";
  if (/talco/.test(n)) return "marble-matte";
  if (/nuvola|porcelain|sierra/.test(n)) return "marble-gloss";
  if (cats.includes("wood-grain")) return "wood";
  if (cats.includes("metal")) return "metal";
  if (cats.includes("gloss")) return /metallic|kubanite|grafite|silver|titanium/.test(n) ? "gloss-metallic" : "gloss";
  return "matte";
}

// Real-world size (mm) the face texture covers on a door. Keeps grain and veins at a believable scale.
const TEX_MM = {
  wood: 520,
  "marble-textured": 900,
  "marble-gloss": 900,
  "marble-matte": 800,
  stone: 640,
  weave: 360,
  leather: 480,
  "textured-metal": 480,
  metal: 600,
  glass: 600,
  "glass-satin": 600,
  gloss: 600,
  "gloss-metallic": 520,
  matte: 600,
};
// Gloss, glass, metal and plain matte renders carry a baked studio highlight, so their
// colour is sampled from the unlit lower-left of the face and the 3D material supplies
// the reflections. Patterned finishes keep their texture, with the render's lighting
// gradient divided out ("flattened").
const FLAT = new Set(["gloss", "gloss-metallic", "glass", "glass-satin", "metal", "matte"]);
const RELIEF = new Set(["wood", "weave", "leather", "textured-metal", "stone", "marble-textured", "metal"]);

async function normalMap(input, out, strength) {
  const { data, info } = await sharp(input).greyscale().blur(0.6).raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const outBuf = Buffer.alloc(w * h * 3);
  const px = (x, y) => data[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))] / 255;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (px(x + 1, y - 1) + 2 * px(x + 1, y) + px(x + 1, y + 1) - px(x - 1, y - 1) - 2 * px(x - 1, y) - px(x - 1, y + 1)) * strength;
      const dy = (px(x - 1, y + 1) + 2 * px(x, y + 1) + px(x + 1, y + 1) - px(x - 1, y - 1) - 2 * px(x, y - 1) - px(x + 1, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 3;
      outBuf[i] = Math.round(((-dx / len) * 0.5 + 0.5) * 255);
      outBuf[i + 1] = Math.round(((dy / len) * 0.5 + 0.5) * 255);
      outBuf[i + 2] = Math.round(((1 / len) * 0.5 + 0.5) * 255);
    }
  }
  await sharp(outBuf, { raw: { width: w, height: h, channels: 3 } }).jpeg({ quality: 88 }).toFile(out);
}

async function flatten(buf) {
  const img = sharp(buf).removeAlpha();
  const { data, info } = await img.clone().raw().toBuffer({ resolveWithObject: true });
  const blur = await img.clone().blur(Math.max(20, info.height / 14)).raw().toBuffer();
  const n = info.width * info.height;
  const mean = [0, 0, 0];
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) mean[c] += data[i * 3 + c] / n;
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) out[i] = Math.max(0, Math.min(255, (data[i] / Math.max(4, blur[i])) * mean[i % 3]));
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toBuffer();
}

const toHex = (r, g, b) => "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

async function main() {
  const products = JSON.parse(await fs.readFile(path.join(SRC, "products.json"), "utf8"));
  for (const d of ["swatch", "tex", "tex-sm", "thumb", "nrm", "brand", "inspiration"]) {
    await fs.mkdir(path.join(PUB, d), { recursive: true });
  }

  const seen = new Map();
  const finishes = [];
  for (const p of products) {
    if (!p.image) continue;
    const cats = p.categories;
    const { full, name, code } = parseName(p.name, cats);
    const id = slugify(cats.includes("real-stone") || cats.includes("real-glass") ? `${name} ${cats.includes("real-stone") ? "real stone" : "glass"}` : full);
    if (seen.has(id)) continue; // cross-listed finishes appear once
    seen.set(id, true);

    const kind = kindOf(full, cats);
    const collections = [...new Set(cats.map((c) => COLLECTION_MAP[c]).filter(Boolean))];
    const srcFile = path.join(SRC, "swatches", path.basename(new URL(p.image).pathname));
    const meta = await sharp(srcFile).metadata();
    const crop = {
      left: Math.round(meta.width * FACE.left),
      top: Math.round(meta.height * FACE.top),
      width: Math.round(meta.width * (FACE.right - FACE.left)),
      height: Math.round(meta.height * (FACE.bottom - FACE.top)),
    };
    const rawFace = await sharp(srcFile).extract(crop).toBuffer();
    const flat = FLAT.has(kind) && !/grain/i.test(full);
    let face = rawFace;
    if (kind === "marble-gloss") {
      // keep the lower part of the face, clear of the reflection streak
      const h = Math.round(crop.height * 0.58);
      face = await sharp(rawFace).extract({ left: 0, top: crop.height - h, width: crop.width, height: h }).toBuffer();
    }
    if (!flat) face = await flatten(await sharp(face).resize({ height: 1024, withoutEnlargement: true }).toBuffer());

    await sharp(srcFile).resize({ width: 720 }).webp({ quality: 82 }).toFile(path.join(PUB, "swatch", `${id}.webp`));
    await sharp(face).resize({ height: 1024, withoutEnlargement: true }).jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(PUB, "tex", `${id}.jpg`));
    await sharp(face).resize({ height: 512 }).jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(PUB, "tex-sm", `${id}.jpg`));
    await sharp(face).resize(240, 240, { fit: "cover" }).webp({ quality: 80 }).toFile(path.join(PUB, "thumb", `${id}.webp`));
    const hasNormal = RELIEF.has(kind);
    if (hasNormal) {
      const strength = kind === "weave" || kind === "leather" ? 5 : kind === "stone" ? 4 : kind === "metal" ? 1.2 : 2.5;
      const small = await sharp(face).resize({ height: 768 }).toBuffer();
      await normalMap(small, path.join(PUB, "nrm", `${id}.jpg`), strength);
    }

    const sample = flat
      ? await sharp(rawFace).extract({ left: Math.round(crop.width * 0.04), top: Math.round(crop.height * 0.55), width: Math.round(crop.width * 0.4), height: Math.round(crop.height * 0.4) }).toBuffer()
      : face;
    const stats = await sharp(sample).stats();
    const [r, g, b] = stats.channels.map((c) => c.mean);
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const tones = [];
    tones.push(lum > 0.62 ? "light" : lum < 0.3 ? "dark" : "mid");
    if (r - b > 10) tones.push("warm");
    else if (b - r > 4 || (Math.abs(r - b) <= 10 && lum < 0.75)) tones.push("cool");
    else tones.push("warm");

    const fm = await sharp(face).metadata();
    const aspect = fm.height / fm.width;
    finishes.push({
      id,
      name,
      fullName: full,
      code,
      collections,
      kind,
      tones,
      hex: toHex(r, g, b),
      luminance: Number(lum.toFixed(3)),
      texMM: [TEX_MM[kind], Math.round(TEX_MM[kind] * aspect)],
      hasNormal,
      flat,
      source: p.permalink,
      ...(id === "white-glass" ? { note: "The live site shows the White Grey image for this finish; replace when a dedicated swatch is published." } : {}),
    });
  }

  // brand + inspiration
  for (const f of await fs.readdir(path.join(SRC, "brand"))) {
    await fs.copyFile(path.join(SRC, "brand", f), path.join(PUB, "brand", f));
  }
  for (const f of await fs.readdir(path.join(SRC, "inspiration"))) {
    const base = f.replace(/\.(jpe?g|png|webp)$/i, "");
    await sharp(path.join(SRC, "inspiration", f)).resize({ width: 1800, withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(PUB, "inspiration", `${base}.webp`));
  }

  const header = `// AUTO-GENERATED by scripts/process-assets.mjs from the live unipanelsa.co.za catalogue.
// Do not edit by hand: re-run \`npm run scrape && npm run assets\`. Curated pairings and
// copy live in src/data/catalogue-curation.ts.
import type { FinishRecord } from "./types";

export const FINISH_RECORDS: FinishRecord[] = `;
  await fs.writeFile(path.join(ROOT, "src", "data", "catalogue.records.ts"), header + JSON.stringify(finishes, null, 2) + ";\n");
  console.log(`${finishes.length} finishes written (from ${products.length} products).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
