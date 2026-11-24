/**
 * Builds the downloadable UnipanelSA Product Catalogue and the flip-book page images.
 *
 *   npm run catalogue
 *
 * 1. Writes a designed, print-ready HTML document (A4 landscape) from the live
 *    catalogue data, the swatch renders and the specs published in the brochure.
 * 2. Prints it to PDF with headless Google Chrome (vector text).
 * 3. Renders every page to JPEG with macOS PDFKit for the 3D flip book.
 *
 * Output: public/catalogue/UnipanelSA-Product-Catalogue.pdf and public/catalogue/pages/p-XX.jpg
 */
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { COLLECTIONS } from "../src/data/collections.ts";
import { BROCHURE_SPECS, COLLECTION_NOTES } from "../src/data/brochure-specs.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUB = path.join(ROOT, "public");
const OUT = path.join(PUB, "catalogue");
const WORK = path.join(ROOT, "catalogue", "print");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const YEAR = new Date().getFullYear();

type Rec = { id: string; name: string; code: string | null; collections: string[]; kind: string; tones: string[]; hex: string; flat: boolean };
const src = await fs.readFile(path.join(ROOT, "src/data/catalogue.records.ts"), "utf8");
const RECORDS: Rec[] = JSON.parse(src.slice(src.indexOf("= [") + 2, src.lastIndexOf("]") + 1));

import sharp from "sharp";
const IMG = path.join(ROOT, "catalogue", "print", "img");
await fs.mkdir(IMG, { recursive: true });
const used = new Set<string>();
/** Every image goes into the PDF as a compact JPEG sized for print at A4. */
const file = (p: string) => {
  used.add(p);
  return "file://" + path.join(IMG, p.replace(/^\//, "").replace(/\//g, "__").replace(/\.(webp|png|jpg)$/, ".jpg"));
};
async function writeImages() {
  for (const p of used) {
    const out = path.join(IMG, p.replace(/^\//, "").replace(/\//g, "__").replace(/\.(webp|png|jpg)$/, ".jpg"));
    const isLogo = p.includes("/brand/");
    if (isLogo) {
      await sharp(path.join(PUB, p)).flatten({ background: "#0f0f0e" }).jpeg({ quality: 92 }).toFile(out);
      continue;
    }
    const w = p.startsWith("/tex/") ? 1100 : 620;
    await sharp(path.join(PUB, p)).resize({ width: w, withoutEnlargement: true }).flatten({ background: "#000" }).jpeg({ quality: 78, mozjpeg: true }).toFile(out);
  }
}
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const KIND: Record<string, string> = {
  matte: "Soft-touch matte", gloss: "High gloss", "gloss-metallic": "Gloss metallic", metal: "Brushed metal", wood: "Woodgrain",
  "marble-gloss": "Gloss marble", "marble-matte": "Matte marble", "marble-textured": "Textured marble", weave: "Woven texture",
  leather: "Leather texture", "textured-metal": "Textured metal", stone: "Real stone", glass: "Real glass", "glass-satin": "Satin real glass",
};

function specLine(r: Rec) {
  if (r.kind === "stone") return "4mm Real Stone · Germany";
  if (r.kind === "glass" || r.kind === "glass-satin") return `${r.id === "black-glass" ? "3mm Glass" : "3mm Satin Glass"} · Germany`;
  const s = BROCHURE_SPECS[r.id];
  if (!s) return "Specification on request";
  return [s.size, s.board, s.origin].filter(Boolean).join(" · ");
}

// each finish appears once, under its primary collection
const groups = COLLECTIONS.map((c) => ({ c, list: RECORDS.filter((r) => r.collections[0] === c.id) })).filter((g) => g.list.length);

// ---------------------------------------------------------------- page builders
const pages: { html: string; title?: string; dark?: boolean }[] = [];
const card = (r: Rec) => `
  <figure class="card">
    <div class="img"><img src="${file(`/swatch/${r.id}.webp`)}"></div>
    <figcaption>
      <p class="nm">${esc(r.name)}</p>
      <p class="cd">${esc(r.code ?? KIND[r.kind])}</p>
      <p class="sp">${esc(specLine(r))}</p>
    </figcaption>
  </figure>`;

// cover
pages.push({
  dark: true,
  html: `<div class="cover">
    <div class="cv-l">
      <img class="logo" src="${file("/brand/Logo_UNIPANEL_white.png")}">
      <div>
        <p class="eyebrow champ">Product Catalogue · ${YEAR}</p>
        <h1 class="d">Luxury European<br><em>Surfaces.</em></h1>
        <p class="lede">${RECORDS.length} finishes across nine collections. Kitchen doors, panels, wardrobes and interiors.</p>
      </div>
      <p class="small">Johannesburg · Cape Town · Durban</p>
    </div>
    <div class="cv-r"><img src="${file("/tex/calacatta-bianco.jpg")}"></div>
  </div>`,
});

// welcome
pages.push({
  title: "Welcome",
  html: `<div class="two">
    <div>
      <p class="eyebrow">01 · Welcome to Unipanel SA</p>
      <h2 class="d">Sourced from Europe’s<br><em>finest manufacturers.</em></h2>
      <p>A company built on sourcing the highest quality decorative panels, crafted by manufacturers in Germany, Italy and Spain. Unipanel SA cuts and edges in-house to demanding European standards using German processing systems.</p>
      <p>A leading independent board merchant, specialising in luxury, innovative products for interior designers, architects and shopfitters throughout South Africa and neighbouring countries. Since its founding in 2004, Unipanel SA has combined distinctive products with stock availability and customer service.</p>
      <p class="small">Proud member of the Kitchen Specialists Association (KSA).</p>
    </div>
    <div class="mosaic">
      ${["oxid-nero-real-stone", "nogal-rosales-02", "loom-ah7", "champagne-metal"].map((id) => `<img src="${file(`/tex/${id}.jpg`)}">`).join("")}
    </div>
  </div>`,
});

// index placeholder (filled after pagination)
const indexAt = pages.push({ title: "Contents", html: "__INDEX__" }) - 1;

// our world
const origins = ["Germany", "Italy", "Spain"].map((o) => ({ o, n: Object.values(BROCHURE_SPECS).filter((s) => s.origin === o).length + (o === "Germany" ? RECORDS.filter((r) => r.kind === "stone" || r.kind.startsWith("glass")).length : 0) }));
pages.push({
  title: "Our world",
  html: `<p class="eyebrow">02 · Our world</p>
    <h2 class="d">Partnered with Europe’s<br><em>most prestigious makers.</em></h2>
    <div class="cols3">${origins
      .map((x) => {
        const ids = x.o === "Germany" ? ["black-8102", "champagne-metal", "oxid-nero-real-stone"] : x.o === "Italy" ? ["quercia-s181", "nadir-ln01", "talco-fb38"] : ["nogal-rosales-02", "titan-01", "nuvola-01"];
        return `<div class="origin"><p class="d big">${x.o}</p><p class="small">${x.n} finishes in this catalogue sourced from ${x.o}</p><div class="strip">${ids.map((id) => `<img src="${file(`/tex/${id}.jpg`)}">`).join("")}</div></div>`;
      })
      .join("")}</div>
    <p class="note">Products not normally available in Africa, brought to South Africa by Unipanel SA.</p>`,
});

const sectionStart: Record<string, number> = {};
let exclusiveDone = false;
for (const g of groups) {
  if (g.c.group === "exclusive" && !exclusiveDone) {
    exclusiveDone = true;
    sectionStart["exclusive"] = pages.length;
    pages.push({
      dark: true,
      title: "Exclusive Range",
      html: `<div class="two">
        <div>
          <p class="eyebrow champ">Exclusive Range · only from Unipanel SA</p>
          <h2 class="d">Simply the best<br><em>the world has to offer.</em></h2>
          <p>Cut to size in Germany. Real Glass, Satin Glass, Real Stone and Ceramic, made possible with patented laser edgebanding technology. Face and edge read as one.</p>
        </div>
        <div class="mosaic">${["oxid-nero-real-stone", "satin-kashmir-glass", "iron-corten-real-stone", "black-glass"].map((id) => `<img src="${file(`/swatch/${id}.webp`)}">`).join("")}</div>
      </div>`,
    });
  }
  sectionStart[g.c.id] = pages.length;
  const first = g.list.slice(0, 6);
  pages.push({
    dark: g.c.dark,
    title: g.c.name,
    html: `<div class="opener">
      <div class="op-h">
        <p class="eyebrow">Collection ${g.c.no} · ${g.list.length} finish${g.list.length === 1 ? "" : "es"}</p>
        <h2 class="d">${esc(g.c.name)}</h2>
        <p class="lede">${esc(g.c.intro)}</p>
        <p class="note">${esc(COLLECTION_NOTES[g.c.id] ?? "")}</p>
      </div>
      <div class="grid g3">${first.map(card).join("")}</div>
    </div>`,
  });
  for (let i = 6; i < g.list.length; i += 8) {
    pages.push({ dark: g.c.dark, title: g.c.name, html: `<p class="eyebrow">${esc(g.c.name)} · continued</p><div class="grid g4">${g.list.slice(i, i + 8).map(card).join("")}</div>` });
  }
}

// services
sectionStart["services"] = pages.length;
pages.push({
  title: "Services",
  html: `<p class="eyebrow">Services · The Atelier</p>
  <h2 class="d">Edges without <em>compromise.</em></h2>
  <div class="cols4">
    <div><p class="num">01</p><p class="h">Build-ups</p><p>36mm to 54mm, for desktops, tabletops, TV unit frames and shelving.</p></div>
    <div><p class="num">02</p><p class="h">Cutting &amp; Edging</p><p>Computer-driven beam saws. PUR glue edge banding with our Zero Glue Line guarantee, for high-moisture areas.</p></div>
    <div><p class="num">03</p><p class="h">Door &amp; Panel Processing</p><p>Residential and commercial projects, to your specification, with open communication throughout.</p></div>
    <div><p class="num">04</p><p class="h">CNC Routing</p><p>Intricate designs for custom furniture and components for architectural projects.</p></div>
  </div>
  <div class="band">${["nogal-rosales-02", "calacatta-bianco", "kashmir", "oxid-nero-real-stone"].map((id) => `<img src="${file(`/tex/${id}.jpg`)}">`).join("")}</div>`,
});

// care
sectionStart["care"] = pages.length;
pages.push({
  title: "Care",
  html: `<p class="eyebrow">Care</p>
  <h2 class="d">Keep it <em>as it arrived.</em></h2>
  <div class="cols3">
    <div><p class="h">Matte, woodgrain &amp; textured</p><p>Wipe with a soft, damp microfibre cloth and mild soapy water. Avoid abrasive pads, scourers and polishes. Dry with a clean cloth.</p></div>
    <div><p class="h">Gloss, metal &amp; glass</p><p>Dust first, then clean with a soft cloth and mild soapy water. Buff dry with a lint-free cloth. Wipe brushed metal along the grain.</p></div>
    <div><p class="h">Real Stone</p><p>Dust with a soft, dry brush or cloth. Spot-clean with a lightly damp cloth; avoid soaking, abrasives and acidic cleaners.</p></div>
  </div>
  <p class="note">An all-inclusive cleaning solution is available for each product. Ask your showroom for the right one.</p>
  <div class="band">${["white-matte", "black-8102", "champagne-metal", "satin-kashmir-glass", "basalt-grey-real-stone"].map((id) => `<img src="${file(id === "white-matte" || id === "black-8102" || id === "champagne-metal" || id === "satin-kashmir-glass" ? `/swatch/${id}.webp` : `/tex/${id}.jpg`)}">`).join("")}</div>`,
});

// back cover: showrooms
sectionStart["showrooms"] = pages.length;
const rooms = [
  ["Johannesburg", "6 Kramer Road, Kramerville, Sandton 2090", "+27 87 284 4590", "sales.jhb@unipanelsa.co.za", "Mon–Fri 08:00–17:00 · Sat 09:00–14:00"],
  ["Cape Town", "8 Marine Drive, Paarden Eiland 7405", "+27 21 065 1674", "sales.cpt@unipanelsa.co.za", "Mon–Fri 08:00–17:00 · Sat 09:00–14:00"],
  ["Durban", "287 Balfour Road, Jacobs 4026", "+27 31 468 5320", "sales.dbn@unipanelsa.co.za", "Mon–Thu 07:00–16:30 · Fri 07:00–15:30 · Sat 07:30–12:30"],
];
pages.push({
  dark: true,
  title: "Showrooms",
  html: `<div class="back">
    <img class="logo" src="${file("/brand/Logo_UNIPANEL_white.png")}">
    <h2 class="d">Visit us. <em>Touch the difference.</em></h2>
    <div class="cols3">${rooms.map(([c, a, p, e, h]) => `<div><p class="d city">${c}</p><p>${a}</p><p>${p}</p><p>${e}</p><p class="small">${h}</p></div>`).join("")}</div>
    <p class="small">Closed Sundays and public holidays · info@unipanelsa.co.za · unipanelsa.co.za · Instagram @unipanel_sa · Order your free trade Sample Box online.</p>
  </div>`,
});

// index
const entries: [string, string][] = [["Welcome", "2"], ["Our world", "4"], ...groups.map((g) => [g.c.name, String(sectionStart[g.c.id] + 1)] as [string, string]), ["Services", String(sectionStart.services + 1)], ["Care", String(sectionStart.care + 1)], ["Showrooms", String(sectionStart.showrooms + 1)]];
pages[indexAt].html = `<p class="eyebrow">Contents</p><h2 class="d">Inside</h2><ol class="index">${entries.map(([t, n]) => `<li><span>${esc(t)}</span><i></i><b>${n}</b></li>`).join("")}</ol>`;

// ---------------------------------------------------------------- document
const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;1,6..72,300&family=Inter+Tight:wght@400;500&family=JetBrains+Mono&display=block" rel="stylesheet">
<style>
@page{size:297mm 210mm;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Inter Tight",Helvetica,Arial,sans-serif;color:#0f0f0e;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:297mm;height:210mm;position:relative;overflow:hidden;background:#f4f1ec;padding:16mm 18mm 18mm;page-break-after:always;break-after:page}
.page.dark{background:#0f0f0e;color:#f4f1ec}
.d{font-family:Newsreader,Georgia,serif;font-weight:300;letter-spacing:-.03em;line-height:.95}
.d em{font-style:italic;color:#8a6f00}
.dark .d em{color:#e4c020}
h1.d{font-size:58pt}
h2.d{font-size:40pt;margin:6mm 0 8mm}
.eyebrow{font-family:"JetBrains Mono",monospace;font-size:7.5pt;letter-spacing:.16em;text-transform:uppercase;color:#8a857d}
.champ{color:#e4c020}
p{font-size:10pt;line-height:1.55;margin-bottom:3mm;max-width:120mm}
.lede{font-size:12pt;opacity:.8}
.small{font-size:8pt;opacity:.7}
.note{font-size:8pt;color:#8a857d;max-width:none;margin-top:4mm}
.dark .note,.dark .eyebrow{color:#b3aea6}
.foot{position:absolute;left:18mm;right:18mm;bottom:8mm;display:flex;justify-content:space-between;font-family:"JetBrains Mono",monospace;font-size:7pt;letter-spacing:.12em;text-transform:uppercase;color:#8a857d}
.cover{position:absolute;inset:0;display:grid;grid-template-columns:1fr 1fr}
.cv-l{padding:18mm;display:flex;flex-direction:column;justify-content:space-between}
.cv-r img{width:100%;height:100%;object-fit:cover}
.logo{height:11mm;width:auto}
.two{display:grid;grid-template-columns:1.1fr 1fr;gap:12mm;height:100%;align-items:center}
.mosaic{display:grid;grid-template-columns:1fr 1fr;gap:3mm;height:150mm}
.mosaic img{width:100%;height:100%;object-fit:cover;border-radius:1mm;background:#000}
.cols3{display:grid;grid-template-columns:repeat(3,1fr);gap:10mm;margin-top:10mm}
.cols4{display:grid;grid-template-columns:repeat(4,1fr);gap:8mm;margin-top:6mm}
.cols3>div,.cols4>div{border-top:.3mm solid currentColor;padding-top:4mm}
.big{font-size:34pt;margin-bottom:3mm}
.num{font-family:"JetBrains Mono",monospace;font-size:8pt;color:#7d6400}
.h{font-weight:500;font-size:12pt;margin:2mm 0}
.opener{display:grid;grid-template-columns:78mm 1fr;gap:10mm;height:100%}
.op-h h2.d{font-size:34pt}
.grid{display:grid;gap:5mm}
.g3{grid-template-columns:repeat(3,1fr);grid-auto-rows:min-content;align-content:start}
.g4{grid-template-columns:repeat(4,1fr);margin-top:6mm}
.card .img{aspect-ratio:4/4.3;background:#000;border-radius:1mm;overflow:hidden}
.g3 .card .img{aspect-ratio:4/3.6}
.card img{width:100%;height:100%;object-fit:cover}
.card figcaption{padding-top:2mm}
.nm{font-size:9.5pt;font-weight:500;margin:0}
.cd{font-family:"JetBrains Mono",monospace;font-size:7.5pt;color:#7d6400;margin:.5mm 0}
.dark .cd{color:#e4c020}
.sp{font-size:7pt;color:#8a857d;margin:0}
.index{list-style:none;columns:2;column-gap:16mm;margin-top:4mm}
.index li{display:flex;align-items:baseline;gap:3mm;font-size:13pt;padding:2.6mm 0;border-bottom:.2mm solid #dad5cd;break-inside:avoid}
.index i{flex:1}
.index b{font-family:"JetBrains Mono",monospace;font-weight:400;font-size:9pt;color:#8a857d}
.back{display:flex;flex-direction:column;gap:6mm;height:100%}
.city{font-size:22pt;margin-bottom:3mm}
.origin{min-height:60mm}
.strip{display:grid;grid-template-columns:repeat(3,1fr);gap:2mm;margin-top:5mm;height:46mm}
.strip img,.band img{width:100%;height:100%;object-fit:cover;border-radius:1mm;background:#000}
.band{position:absolute;left:18mm;right:18mm;bottom:16mm;height:52mm;display:flex;gap:3mm}
.band img{flex:1;min-width:0}
.back .logo{align-self:flex-start}
</style></head><body>
${pages
  .map((p, i) => `<section class="page${p.dark ? " dark" : ""}">${p.html}${i > 0 ? `<div class="foot"><span>UnipanelSA · Product Catalogue ${YEAR}${p.title ? ` · ${esc(p.title)}` : ""}</span><span>${String(i + 1).padStart(2, "0")}</span></div>` : ""}</section>`)
  .join("\n")}
</body></html>`;

await fs.mkdir(WORK, { recursive: true });
await writeImages();
await fs.mkdir(path.join(OUT, "pages"), { recursive: true });
const htmlPath = path.join(WORK, "catalogue.html");
await fs.writeFile(htmlPath, html);
const pdfPath = path.join(OUT, "UnipanelSA-Product-Catalogue.pdf");
execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--allow-file-access-from-files", "--virtual-time-budget=15000", `--print-to-pdf=${pdfPath}`, "file://" + htmlPath], { stdio: "inherit" });
console.log(`PDF: ${pages.length} pages → ${path.relative(ROOT, pdfPath)}`);

// page images for the flip book (macOS PDFKit)
for (const f of await fs.readdir(path.join(OUT, "pages"))) await fs.unlink(path.join(OUT, "pages", f));
execFileSync("swift", [path.join(ROOT, "scripts", "pdf-pages.swift"), pdfPath, path.join(OUT, "pages"), "2400"], { stdio: "inherit" });
await fs.writeFile(path.join(ROOT, "src/data/catalogue-book.ts"), `// AUTO-GENERATED by scripts/build-catalogue.mts\nexport const CATALOGUE_PAGES = ${pages.length};\nexport const CATALOGUE_PDF = "/catalogue/UnipanelSA-Product-Catalogue.pdf";\n`);
