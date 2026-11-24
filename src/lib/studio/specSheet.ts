"use client";
import type { jsPDF as JsPDF } from "jspdf";
import { SHOWROOMS, SITE, showroomById, type CityId } from "@/lib/site";
import { asset } from "@/lib/asset";
import { usedFinishes, SCENE_LABEL, LAYOUT_LABEL, STAGING, type Scheme } from "./scheme";
import { COLLECTIONS } from "@/data/collections";
import { CARE, careFor } from "@/data/care";
import { finishById, finishLabel } from "@/data/catalogue";
import type { Finish } from "@/data/types";

export interface ClientDetails {
  client: string;
  project: string;
  address: string;
  consultant: string;
  company: string;
  email: string;
  phone: string;
  city: CityId;
  notes: string;
}

export interface SheetDesign {
  label: string;
  scheme: Scheme;
  views: { name: string; image: string }[];
  shareUrl: string;
}

const INK: [number, number, number] = [15, 15, 14];
const STONE: [number, number, number] = [138, 133, 125];
const CHAMP: [number, number, number] = [228, 192, 32];
const HAIR: [number, number, number] = [218, 213, 205];
const PORC: [number, number, number] = [244, 241, 236];
const W = 210;
const H = 297;
const M = 14;

async function img(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

/** jsPDF takes JPEG/PNG; webp renders and textures are re-encoded through a canvas. */
async function jpeg(src: string, maxW = 900): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const i = await img(src);
    const scale = Math.min(1, maxW / i.naturalWidth);
    const c = document.createElement("canvas");
    c.width = Math.round(i.naturalWidth * scale);
    c.height = Math.round(i.naturalHeight * scale);
    const g = c.getContext("2d")!;
    g.fillStyle = "#0f0f0e";
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(i, 0, 0, c.width, c.height);
    return { data: c.toDataURL("image/jpeg", 0.88), w: c.width, h: c.height };
  } catch {
    return null;
  }
}

const hexRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

function swatch(doc: JsPDF, f: Finish, tex: Map<string, string>, x: number, y: number, w: number, h: number) {
  const t = tex.get(f.id);
  if (t && !f.flat) doc.addImage(t, "JPEG", x, y, w, h, undefined, "FAST");
  else {
    doc.setFillColor(...hexRgb(f.hex));
    doc.rect(x, y, w, h, "F");
  }
  doc.setDrawColor(...HAIR);
  doc.setLineWidth(0.2);
  doc.rect(x, y, w, h);
}

function fitImage(doc: JsPDF, data: string, x: number, y: number, maxW: number, maxH: number, ratio: number) {
  let w = maxW;
  let h = w / ratio;
  if (h > maxH) {
    h = maxH;
    w = h * ratio;
  }
  doc.addImage(data, data.startsWith("data:image/jpeg") ? "JPEG" : "PNG", x + (maxW - w) / 2, y, w, h, undefined, "FAST");
  return h;
}

export async function downloadSpecSheet(input: SheetDesign[], client: ClientDetails) {
  const { jsPDF } = await import("jspdf");
  // renders arrive as PNG; re-encode as JPEG to keep the PDF light
  const designs: SheetDesign[] = await Promise.all(
    input.map(async (d) => ({ ...d, views: await Promise.all(d.views.map(async (v) => ({ ...v, image: (await jpeg(v.image, 1800))?.data ?? v.image }))) })),
  );
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const date = new Date();
  const ref = `UP-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const room = showroomById(client.city);
  const dateText = date.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });

  const logoWhite = await jpeg(asset("/brand/Logo_UNIPANEL_white.png"), 600).catch(() => null);
  const logoCircle = await img(asset("/brand/LOGO-Black-circle.png")).catch(() => null);

  // all finishes used across designs
  const all = new Map<string, Finish>();
  for (const d of designs) for (const u of usedFinishes(d.scheme)) all.set(u.finish.id, u.finish);
  const tex = new Map<string, string>();
  const renders = new Map<string, { data: string; w: number; h: number }>();
  await Promise.all(
    [...all.values()].map(async (f) => {
      if (!f.flat) {
        const t = await jpeg(f.textures.tex, 360);
        if (t) tex.set(f.id, t.data);
      }
      const r = await jpeg(f.textures.swatch, 520);
      if (r) renders.set(f.id, r);
    }),
  );

  let page = 0;
  const header = (title: string) => {
    page++;
    doc.setFillColor(...INK);
    doc.rect(0, 0, W, 18, "F");
    if (logoWhite) doc.addImage(logoWhite.data, "JPEG", M, 5.5, 34, (34 * logoWhite.h) / logoWhite.w);
    doc.setTextColor(...CHAMP);
    doc.setFontSize(7.5);
    doc.text(title.toUpperCase(), W - M, 8, { align: "right" });
    doc.setTextColor(200, 196, 190);
    doc.text(`${ref}  ·  ${dateText}`, W - M, 12.5, { align: "right" });
  };
  const footer = () => {
    const y = H - 22;
    doc.setDrawColor(...HAIR);
    doc.setLineWidth(0.2);
    doc.line(M, y, W - M, y);
    const colW = (W - M * 2) / 3;
    SHOWROOMS.forEach((s, i) => {
      const x = M + i * colW;
      doc.setFontSize(7.5);
      doc.setTextColor(...INK);
      doc.text(s.city, x, y + 5);
      doc.setFontSize(6.5);
      doc.setTextColor(...STONE);
      doc.text([`${s.street}, ${s.suburb} ${s.postcode}`, `${s.phone}  ·  ${s.email}`], x, y + 9);
    });
    doc.setFontSize(6.5);
    doc.setTextColor(...STONE);
    doc.text(`${SITE.ksa}  ·  unipanelsa.co.za  ·  Prepared for ${client.client || "client"}`, M, H - 6);
    doc.text(`Page ${page}`, W - M, H - 6, { align: "right" });
  };

  // ---------------------------------------------------------------- cover
  doc.setFillColor(...INK);
  doc.rect(0, 0, W, H, "F");
  page++;
  if (logoWhite) doc.addImage(logoWhite.data, "JPEG", M, 18, 64, (64 * logoWhite.h) / logoWhite.w);
  doc.setTextColor(...CHAMP);
  doc.setFontSize(8);
  doc.text("SURFACE SPECIFICATION", M, 44);
  doc.setTextColor(...PORC);
  doc.setFont("times", "normal");
  doc.setFontSize(34);
  doc.text(doc.splitTextToSize(client.project || `${SCENE_LABEL[designs[0].scheme.scene]} scheme`, W - M * 2), M, 58);
  doc.setFont("helvetica", "normal");
  const hero = designs[0].views[0];
  if (hero) {
    const hi = await img(hero.image);
    const ratio = hi.naturalWidth / hi.naturalHeight;
    fitImage(doc, hero.image, M, 80, W - M * 2, 110, ratio);
  }
  // details grid
  const rows: [string, string][] = [
    ["Client", client.client],
    ["Project", client.project],
    ["Site address", client.address],
    ["Prepared by", [client.consultant, client.company].filter(Boolean).join(", ")],
    ["Contact", [client.email, client.phone].filter(Boolean).join("  ·  ")],
    ["Showroom", `${room.city} · ${room.phone} · ${room.email}`],
    ["Reference", ref],
    ["Date", dateText],
    ["Designs", designs.map((d) => `${d.label}: ${SCENE_LABEL[d.scheme.scene]}${d.scheme.scene === "kitchen" ? ` (${LAYOUT_LABEL[d.scheme.layout]})` : ""}`).join("   ")],
  ];
  let y = 200;
  doc.setDrawColor(60, 58, 54);
  for (const [k, v] of rows) {
    if (!v) continue;
    doc.line(M, y - 4, W - M, y - 4);
    doc.setFontSize(7);
    doc.setTextColor(...STONE);
    doc.text(k.toUpperCase(), M, y);
    doc.setFontSize(9.5);
    doc.setTextColor(...PORC);
    doc.text(doc.splitTextToSize(v, W - M * 2 - 40), M + 40, y);
    y += 8;
  }
  doc.setFontSize(7);
  doc.setTextColor(...STONE);
  doc.text("Luxury European Surfaces  ·  Johannesburg  ·  Cape Town  ·  Durban", M, H - 10);
  if (logoCircle) doc.addImage(logoCircle, "PNG", W - M - 18, H - 30, 18, 18);

  for (const d of designs) {
    // ---------------------------------------------------------------- views
    doc.addPage();
    header(`${d.label} · Views`);
    doc.setTextColor(...INK);
    doc.setFont("times", "normal");
    doc.setFontSize(22);
    doc.text(`${d.label}: ${SCENE_LABEL[d.scheme.scene]}${d.scheme.scene === "kitchen" ? `, ${LAYOUT_LABEL[d.scheme.layout]}` : ""}`, M, 32);
    doc.setFont("helvetica", "normal");
    y = 40;
    const views = d.views;
    const small = views.slice(1, 4);
    if (views[0]) {
      const vi = await img(views[0].image);
      const hgt = fitImage(doc, views[0].image, M, y, W - M * 2, 125, vi.naturalWidth / vi.naturalHeight);
      doc.setFontSize(7);
      doc.setTextColor(...STONE);
      doc.text(views[0].name.toUpperCase(), M, y + hgt + 4);
      y += hgt + 10;
    }
    const sw = (W - M * 2 - 8) / 3;
    for (let j = 0; j < small.length; j++) {
      const v = small[j];
      const vi = await img(v.image);
      const x = M + j * (sw + 4);
      const hgt = fitImage(doc, v.image, x, y, sw, 60, vi.naturalWidth / vi.naturalHeight);
      doc.setFontSize(7);
      doc.setTextColor(...STONE);
      doc.text(v.name.toUpperCase(), x, y + hgt + 4);
    }
    doc.setFontSize(7);
    doc.setTextColor(...STONE);
    doc.textWithLink("Open this exact scheme online", M, H - 28, { url: d.shareUrl });
    footer();

    // ---------------------------------------------------------------- schedule
    doc.addPage();
    header(`${d.label} · Finish schedule`);
    doc.setTextColor(...INK);
    doc.setFont("times", "normal");
    doc.setFontSize(22);
    doc.text("Finish schedule", M, 32);
    doc.setFont("helvetica", "normal");
    y = 42;
    const cols = [M, M + 18, M + 62, M + 112, M + 132, M + 162];
    doc.setFontSize(6.8);
    doc.setTextColor(...STONE);
    ["", "ZONE", "FINISH", "CODE", "COLLECTION", "SURFACE · TONE"].forEach((h, i) => doc.text(h, cols[i], y));
    y += 2.5;
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.3);
    doc.line(M, y, W - M, y);
    y += 3;
    for (const u of usedFinishes(d.scheme)) {
      const f = u.finish;
      swatch(doc, f, tex, cols[0], y, 13, 13);
      doc.setFontSize(9);
      doc.setTextColor(...INK);
      doc.text(u.label, cols[1], y + 5);
      doc.text(f.name, cols[2], y + 5);
      doc.setTextColor(90, 86, 80);
      doc.text(f.code ?? "—", cols[3], y + 5);
      doc.setFontSize(8);
      doc.text(doc.splitTextToSize(f.collections.map((c) => COLLECTIONS.find((x) => x.id === c)?.name ?? c).join(", "), 28), cols[4], y + 5);
      doc.text(doc.splitTextToSize(`${f.category} · ${f.tones.join(", ")}`, 34), cols[5], y + 5);
      y += 16;
      doc.setDrawColor(...HAIR);
      doc.setLineWidth(0.2);
      doc.line(M, y - 1.5, W - M, y - 1.5);
    }
    // construction & staging
    y += 4;
    const handle = STAGING.handles.find((h) => h.id === d.scheme.handle)?.name ?? "";
    const spec: [string, string][] = [
      ["Grain direction", d.scheme.grain === "v" ? "Vertical" : "Horizontal"],
      ["Bookmatching", d.scheme.bookmatch ? "On (door pairs mirrored at the joint)" : "Off"],
      ["Build-up shown", `${d.scheme.buildup}mm (available 36 to 54mm)`],
      ["Edging", "PUR edge banding, Zero Glue Line guarantee (on request)"],
      ["Handles (staging)", handle],
      ["Worktop (staging)", STAGING.worktops[d.scheme.worktop].name],
      ["Floor (staging)", STAGING.floors[d.scheme.floor].name],
      ["Walls (staging)", STAGING.walls[d.scheme.wall].name],
    ];
    doc.setFontSize(7);
    doc.setTextColor(...STONE);
    doc.text("CONSTRUCTION & STAGING", M, y);
    y += 4;
    for (const [k, v] of spec) {
      doc.setFontSize(8.5);
      doc.setTextColor(...STONE);
      doc.text(k, M, y);
      doc.setTextColor(...INK);
      doc.text(v, M + 42, y);
      y += 5.2;
    }
    doc.setFontSize(7);
    doc.setTextColor(...STONE);
    doc.text(doc.splitTextToSize("Staging items (worktop, floor, walls, handles) are shown for visualisation and are not supplied by UnipanelSA. Board sizes, thicknesses, pricing and availability are confirmed by your showroom. On-screen colours are a guide; please approve physical samples.", W - M * 2), M, y + 3);
    footer();
  }

  // ---------------------------------------------------------------- finish cards (2 per row, 3 rows per page)
  const list = [...all.values()];
  for (let p = 0; p < list.length; p += 6) {
    doc.addPage();
    header("Finish details & care");
    doc.setTextColor(...INK);
    doc.setFont("times", "normal");
    doc.setFontSize(22);
    doc.text("Finish details & care", M, 32);
    doc.setFont("helvetica", "normal");
    list.slice(p, p + 6).forEach((f, i) => {
      const cw = (W - M * 2 - 6) / 2;
      const x = M + (i % 2) * (cw + 6);
      const yy = 40 + Math.floor(i / 2) * 76;
      const r = renders.get(f.id);
      if (r) doc.addImage(r.data, "JPEG", x, yy, 30, (30 * r.h) / r.w, undefined, "FAST");
      swatch(doc, f, tex, x + 33, yy, 14, 14);
      doc.setFontSize(11);
      doc.setTextColor(...INK);
      doc.text(doc.splitTextToSize(finishLabel(f), cw - 52), x + 50, yy + 5);
      doc.setFontSize(7.5);
      doc.setTextColor(...STONE);
      doc.text(doc.splitTextToSize(`${f.category} · ${f.collections.map((c) => COLLECTIONS.find((x) => x.id === c)?.name ?? c).join(", ")}`, cw - 52), x + 50, yy + 11);
      const care = CARE[careFor(f.kind)];
      doc.setFontSize(6.8);
      doc.setTextColor(...CHAMP);
      doc.text(`CARE · ${care.title.toUpperCase()}`, x + 33, yy + 22);
      doc.setTextColor(60, 58, 54);
      let cy = yy + 26;
      for (const s of care.steps) {
        const lines = doc.splitTextToSize(`· ${s}`, cw - 34);
        doc.text(lines, x + 33, cy);
        cy += lines.length * 3.1 + 0.6;
      }
      const pairs = f.pairsWith.map((id) => finishById(id)?.name).filter(Boolean).join(", ");
      doc.setTextColor(...STONE);
      doc.text(doc.splitTextToSize(`Pairs well with: ${pairs}`, cw - 34), x + 33, cy + 2);
    });
    doc.setFontSize(7);
    doc.setTextColor(...STONE);
    doc.text("An all-inclusive cleaning solution is available for each product. Ask your showroom for the right one.", M, H - 28);
    footer();
  }

  // ---------------------------------------------------------------- notes & sign-off
  doc.addPage();
  header("Notes & approval");
  doc.setTextColor(...INK);
  doc.setFont("times", "normal");
  doc.setFontSize(22);
  doc.text("Notes & approval", M, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(60, 58, 54);
  doc.text(doc.splitTextToSize(client.notes || "No additional notes.", W - M * 2), M, 44);
  y = 150;
  for (const who of ["Client approval", "UnipanelSA showroom"]) {
    doc.setDrawColor(...INK);
    doc.line(M, y, M + 80, y);
    doc.line(M + 100, y, W - M, y);
    doc.setFontSize(7);
    doc.setTextColor(...STONE);
    doc.text(`${who.toUpperCase()} · SIGNATURE`, M, y + 4);
    doc.text("DATE", M + 100, y + 4);
    y += 28;
  }
  doc.setFontSize(8);
  doc.setTextColor(...INK);
  doc.text(`Your showroom: ${room.city}, ${room.street}, ${room.suburb} ${room.postcode}`, M, y + 8);
  doc.text(`${room.phone}  ·  ${room.email}  ·  ${room.hoursText.join(", ")}`, M, y + 13);
  footer();

  const safe = (client.client || "client").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  doc.save(`UnipanelSA-${safe}-${ref}.pdf`);
}
