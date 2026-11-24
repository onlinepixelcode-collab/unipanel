import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";
import { FINISHES, finishById, PBR_PRESETS } from "@/data/catalogue";
import { COLLECTIONS } from "@/data/collections";
import { DEFAULT_SCHEME, DESIGN_PRESETS, encodeScheme, decodeScheme, zonesFor, ZONE_LABEL, type Scheme, type Zone, type SceneId, type KitchenLayout } from "@/lib/studio/scheme";
import { buildRoom } from "@/lib/studio/layout";
import { showroomStatus, saPublicHolidays } from "@/lib/hours";
import { SHOWROOMS } from "@/lib/site";

const pub = (u: string) => path.join(process.cwd(), "public", u.replace(/^\/unipanel/, ""));
const products = JSON.parse(fs.readFileSync(path.join(process.cwd(), "catalogue/products.json"), "utf8")) as { name: string; image: string | null }[];

describe("catalogue", () => {
  it("has every scraped product exactly once (cross-listed finishes deduplicated)", () => {
    expect(FINISHES.length).toBe(products.filter((p) => p.image).length);
    expect(new Set(FINISHES.map((f) => f.id)).size).toBe(FINISHES.length);
  });
  it("every finish has its texture files on disk", () => {
    for (const f of FINISHES) {
      for (const u of [f.textures.swatch, f.textures.tex, f.textures.texSm, f.textures.thumb]) expect(fs.existsSync(pub(u)), u).toBe(true);
      if (f.textures.normal) expect(fs.existsSync(pub(f.textures.normal))).toBe(true);
    }
  });
  it("every collection has finishes and valid cover/hero ids", () => {
    for (const c of COLLECTIONS) {
      expect(FINISHES.some((f) => f.collections.includes(c.id)), c.id).toBe(true);
      for (const id of [c.cover, ...c.hero]) expect(finishById(id), `${c.id}:${id}`).toBeTruthy();
    }
  });
  it("pairings reference real finishes", () => {
    for (const f of FINISHES) {
      expect(f.pairsWith.length).toBe(3);
      for (const p of f.pairsWith) expect(finishById(p), `${f.id}->${p}`).toBeTruthy();
    }
  });
});

describe("studio: every finish × every zone", () => {
  const scenes: [SceneId, KitchenLayout][] = [["kitchen", "straight"], ["kitchen", "l"], ["kitchen", "u"], ["kitchen", "galley"], ["kitchen", "island"], ["kitchen", "l-island"], ["kitchen", "peninsula"], ["wardrobe", "island"], ["media", "island"], ["vanity", "island"]];
  it("builds every scene with panels for every zone it offers", () => {
    for (const [scene, layout] of scenes) {
      const s: Scheme = { ...DEFAULT_SCHEME, scene, layout };
      const room = buildRoom(s);
      const zonesInRoom = new Set(room.panels.map((p) => p.zone).filter(Boolean));
      for (const z of zonesFor(scene, layout)) expect(zonesInRoom.has(z), `${scene}/${layout} missing ${z}`).toBe(true);
      for (const p of room.panels) {
        expect(p.size.every((n) => Number.isFinite(n) && n > 0), `${scene} ${p.key} size`).toBe(true);
        expect(p.pos.every(Number.isFinite)).toBe(true);
      }
    }
  });
  it("applies every finish to every zone and produces a valid physical material", () => {
    let n = 0;
    for (const f of FINISHES) {
      for (const z of Object.keys(ZONE_LABEL) as Zone[]) {
        const s: Scheme = { ...DEFAULT_SCHEME, zones: { ...DEFAULT_SCHEME.zones, [z]: f.id } };
        const back = decodeScheme(encodeScheme(s));
        expect(back?.zones[z], `${f.id}@${z}`).toBe(f.id);
        n++;
      }
      const p = PBR_PRESETS[f.kind];
      const m = new THREE.MeshPhysicalMaterial({ color: f.hex, roughness: p.roughness, metalness: p.metalness, clearcoat: p.clearcoat, clearcoatRoughness: p.clearcoatRoughness });
      expect(m.roughness).toBeGreaterThanOrEqual(0);
      expect(m.roughness).toBeLessThanOrEqual(1);
      expect(/^#[0-9a-f]{6}$/.test(f.hex)).toBe(true);
      expect(f.texMM[0] > 0 && f.texMM[1] > 0).toBe(true);
    }
    expect(n).toBe(FINISHES.length * Object.keys(ZONE_LABEL).length);
  });
  it("every design preset uses real finishes", () => {
    for (const d of DESIGN_PRESETS) for (const id of Object.values(d.zones)) expect(finishById(id), `${d.id}:${id}`).toBeTruthy();
  });
  it("share links round-trip the exact scheme", () => {
    const s: Scheme = { ...DEFAULT_SCHEME, scene: "vanity", grain: "h", bookmatch: false, buildup: 54, handle: "bar-champagne", floor: 2, wall: 1, worktop: 2 };
    expect(decodeScheme(encodeScheme(s))).toEqual(s);
  });
});

describe("showroom hours (SAST)", () => {
  const jhb = SHOWROOMS.find((s) => s.id === "jhb")!;
  const dbn = SHOWROOMS.find((s) => s.id === "dbn")!;
  it("knows weekday, Saturday and Sunday hours", () => {
    expect(showroomStatus(jhb, new Date("2026-11-24T08:00:00Z")).open).toBe(true); // Tue 10:00 SAST
    expect(showroomStatus(jhb, new Date("2026-11-28T12:30:00Z")).open).toBe(false); // Sat 14:30
    expect(showroomStatus(dbn, new Date("2026-11-27T13:00:00Z")).open).toBe(true); // Fri 15:00
    expect(showroomStatus(dbn, new Date("2026-11-27T13:45:00Z")).open).toBe(false); // Fri 15:45
    expect(showroomStatus(jhb, new Date("2026-11-29T09:00:00Z")).open).toBe(false); // Sunday
  });
  it("closes on public holidays, incl. Sunday→Monday", () => {
    expect(saPublicHolidays(2026).has("2026-12-16")).toBe(true);
    expect(saPublicHolidays(2026).has("2026-04-03")).toBe(true); // Good Friday 2026
    expect(showroomStatus(jhb, new Date("2026-12-16T09:00:00Z")).open).toBe(false);
  });
});
