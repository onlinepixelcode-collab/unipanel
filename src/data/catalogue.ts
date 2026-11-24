import type { Finish, FinishKind, FinishRecord, PBRParams, CollectionId, Tone } from "./types";
import { FINISH_RECORDS } from "./catalogue.records";
import { CURATED_PAIRS } from "./catalogue-curation";
import { asset } from "@/lib/asset";

/**
 * Per-category physically based presets, tuned against the swatch renders.
 * Roughness/metalness follow real material behaviour: soft-touch matte scatters,
 * gloss and glass carry a sharp clearcoat, brushed metal is anisotropic.
 */
export const PBR_PRESETS: Record<FinishKind, PBRParams> = {
  matte: { roughness: 0.86, metalness: 0, clearcoat: 0, clearcoatRoughness: 0, sheen: 0.15, anisotropy: 0, normalScale: 0, envMapIntensity: 0.7, ior: 1.45, specularIntensity: 0.35 },
  gloss: { roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, sheen: 0, anisotropy: 0, normalScale: 0, envMapIntensity: 1.15, ior: 1.5, specularIntensity: 1 },
  "gloss-metallic": { roughness: 0.32, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.04, sheen: 0, anisotropy: 0, normalScale: 0, envMapIntensity: 1.2, ior: 1.5, specularIntensity: 1 },
  metal: { roughness: 0.34, metalness: 0.92, clearcoat: 0, clearcoatRoughness: 0, sheen: 0, anisotropy: 0.85, normalScale: 0.12, envMapIntensity: 1.25, ior: 1.5, specularIntensity: 1 },
  // a matt woodgrain board has very little surface sheen: keeping it low stops the grain washing out towards grey
  wood: { roughness: 0.66, metalness: 0, clearcoat: 0.04, clearcoatRoughness: 0.55, sheen: 0, anisotropy: 0, normalScale: 0.35, envMapIntensity: 0.55, ior: 1.45, specularIntensity: 0.3 },
  "marble-gloss": { roughness: 0.12, metalness: 0, clearcoat: 0.9, clearcoatRoughness: 0.05, sheen: 0, anisotropy: 0, normalScale: 0, envMapIntensity: 1.05, ior: 1.5, specularIntensity: 0.9 },
  "marble-matte": { roughness: 0.72, metalness: 0, clearcoat: 0, clearcoatRoughness: 0, sheen: 0, anisotropy: 0, normalScale: 0, envMapIntensity: 0.75, ior: 1.45, specularIntensity: 0.45 },
  "marble-textured": { roughness: 0.48, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.35, sheen: 0, anisotropy: 0, normalScale: 0.35, envMapIntensity: 0.9, ior: 1.5, specularIntensity: 0.6 },
  weave: { roughness: 0.78, metalness: 0, clearcoat: 0, clearcoatRoughness: 0, sheen: 0.45, anisotropy: 0, normalScale: 0.9, envMapIntensity: 0.75, ior: 1.45, specularIntensity: 0.4 },
  leather: { roughness: 0.62, metalness: 0, clearcoat: 0.05, clearcoatRoughness: 0.6, sheen: 0.35, anisotropy: 0, normalScale: 0.7, envMapIntensity: 0.8, ior: 1.45, specularIntensity: 0.45 },
  "textured-metal": { roughness: 0.46, metalness: 0.45, clearcoat: 0, clearcoatRoughness: 0, sheen: 0, anisotropy: 0.3, normalScale: 0.85, envMapIntensity: 1, ior: 1.5, specularIntensity: 0.8 },
  stone: { roughness: 0.9, metalness: 0, clearcoat: 0, clearcoatRoughness: 0, sheen: 0, anisotropy: 0, normalScale: 1.1, envMapIntensity: 0.6, ior: 1.5, specularIntensity: 0.3 },
  glass: { roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.015, sheen: 0, anisotropy: 0, normalScale: 0, envMapIntensity: 1.35, ior: 1.52, specularIntensity: 1 },
  "glass-satin": { roughness: 0.35, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.32, sheen: 0, anisotropy: 0, normalScale: 0, envMapIntensity: 1, ior: 1.52, specularIntensity: 0.8 },
};

export const KIND_LABEL: Record<FinishKind, string> = {
  matte: "Soft-touch matte",
  gloss: "High gloss",
  "gloss-metallic": "Gloss metallic",
  metal: "Brushed metal",
  wood: "Woodgrain",
  "marble-gloss": "Gloss marble",
  "marble-matte": "Matte marble",
  "marble-textured": "Textured marble",
  weave: "Woven texture",
  leather: "Leather texture",
  "textured-metal": "Textured metal",
  stone: "Real stone",
  glass: "Real glass",
  "glass-satin": "Satin real glass",
};

const COLLECTION_ORDER: CollectionId[] = ["premium-italian", "matte", "gloss", "metal", "woodgrain", "marble", "textured", "real-stone", "real-glass"];

function computePairs(f: FinishRecord, all: FinishRecord[]): string[] {
  if (CURATED_PAIRS[f.id]) return CURATED_PAIRS[f.id];
  // Contrast in value, kinship in temperature, and a change of material character.
  const warm = f.tones.includes("warm");
  const scored = all
    .filter((o) => o.id !== f.id)
    .map((o) => {
      let s = Math.abs(o.luminance - f.luminance) * 3; // tonal contrast
      if (o.tones.includes("warm") === warm) s += 0.6; // same temperature family
      if (o.kind !== f.kind) s += 0.8; // a different surface character
      if (o.collections[0] !== f.collections[0]) s += 0.3;
      if (o.kind === "matte" || o.kind === "wood" || o.kind === "stone") s += 0.25; // dependable partners
      // deterministic tie-break
      s += ((o.id.length * 31 + f.id.length * 17) % 7) / 100;
      return { id: o.id, s, kind: o.kind };
    })
    .sort((a, b) => b.s - a.s);
  const out: string[] = [];
  const kinds = new Set<string>();
  for (const c of scored) {
    if (kinds.has(c.kind)) continue;
    kinds.add(c.kind);
    out.push(c.id);
    if (out.length === 3) break;
  }
  return out;
}

export const FINISHES: Finish[] = FINISH_RECORDS.map((r) => ({
  ...r,
  category: KIND_LABEL[r.kind],
  pbr: PBR_PRESETS[r.kind],
  textures: {
    swatch: asset(`/swatch/${r.id}.webp`),
    tex: asset(`/tex/${r.id}.jpg`),
    texSm: asset(`/tex-sm/${r.id}.jpg`),
    thumb: asset(`/thumb/${r.id}.webp`),
    normal: r.hasNormal ? asset(`/nrm/${r.id}.jpg`) : null,
  },
  pairsWith: computePairs(r, FINISH_RECORDS),
})).sort((a, b) => COLLECTION_ORDER.indexOf(a.collections[0]) - COLLECTION_ORDER.indexOf(b.collections[0]));

const BY_ID = new Map(FINISHES.map((f) => [f.id, f]));
export const finishById = (id: string | null | undefined): Finish | undefined => (id ? BY_ID.get(id) : undefined);
export const finishesIn = (c: CollectionId) => FINISHES.filter((f) => f.collections.includes(c));
export const finishLabel = (f: Finish) => (f.code ? `${f.name} ${f.code}` : f.name);

export function searchFinishes(q: string, opts: { collection?: CollectionId | "all"; tone?: Tone | "all" } = {}) {
  const needle = q.trim().toLowerCase();
  return FINISHES.filter((f) => {
    if (opts.collection && opts.collection !== "all" && !f.collections.includes(opts.collection)) return false;
    if (opts.tone && opts.tone !== "all" && !f.tones.includes(opts.tone)) return false;
    if (!needle) return true;
    return [f.name, f.fullName, f.code ?? "", f.category, ...f.collections].join(" ").toLowerCase().includes(needle);
  });
}

export const FINISH_COUNT = FINISHES.length;
