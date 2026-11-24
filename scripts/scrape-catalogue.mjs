// Re-scrapes every finish from unipanelsa.co.za (WooCommerce Store API) and
// downloads any swatch image that is missing locally.
// Usage: npm run scrape   (then: npm run assets)
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "catalogue");
const API = "https://unipanelsa.co.za/wp-json/wc/store/v1/products";
const UA = { "User-Agent": "Mozilla/5.0 (catalogue sync)" };

const all = [];
for (let page = 1; page < 20; page++) {
  const res = await fetch(`${API}?per_page=100&page=${page}`, { headers: UA });
  if (!res.ok) throw new Error(`Store API ${res.status}`);
  const batch = await res.json();
  if (!batch.length) break;
  all.push(...batch);
}

const products = all.map((p) => ({
  wcId: p.id,
  name: p.name,
  slug: p.slug,
  permalink: p.permalink,
  categories: p.categories.map((c) => c.slug),
  image: p.images?.[0]?.src ?? null,
}));

await fs.mkdir(path.join(OUT, "swatches"), { recursive: true });
let downloaded = 0;
for (const p of products) {
  if (!p.image) continue;
  const file = path.join(OUT, "swatches", path.basename(new URL(p.image).pathname));
  try {
    await fs.access(file);
  } catch {
    const r = await fetch(p.image, { headers: UA });
    if (r.ok) {
      await fs.writeFile(file, Buffer.from(await r.arrayBuffer()));
      downloaded++;
    }
  }
}

await fs.writeFile(path.join(OUT, "products.json"), JSON.stringify(products, null, 2));
console.log(`${products.length} finishes scraped, ${downloaded} new swatch images.`);
