export type CollectionId =
  | "premium-italian"
  | "matte"
  | "gloss"
  | "metal"
  | "woodgrain"
  | "marble"
  | "textured"
  | "real-stone"
  | "real-glass";

/** Material behaviour used to choose a PBR preset. */
export type FinishKind =
  | "matte"
  | "gloss"
  | "gloss-metallic"
  | "metal"
  | "wood"
  | "marble-gloss"
  | "marble-matte"
  | "marble-textured"
  | "weave"
  | "leather"
  | "textured-metal"
  | "stone"
  | "glass"
  | "glass-satin";

export type Tone = "light" | "mid" | "dark" | "warm" | "cool";

export interface FinishRecord {
  id: string;
  name: string;
  fullName: string;
  /** Manufacturer code exactly as published; null when the site publishes none. */
  code: string | null;
  collections: CollectionId[];
  kind: FinishKind;
  tones: Tone[];
  /** Mean colour of the face, used for fallbacks and tone filters. */
  hex: string;
  luminance: number;
  /** Real-world size in mm that one texture tile covers [width, height]. */
  texMM: [number, number];
  hasNormal: boolean;
  /** True when the face is a solid colour (texture used for UI only, 3D uses `hex`). */
  flat: boolean;
  /** Product page on unipanelsa.co.za the swatch came from. */
  source: string;
  note?: string;
}

export interface PBRParams {
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  sheen: number;
  anisotropy: number;
  normalScale: number;
  envMapIntensity: number;
  ior: number;
  specularIntensity: number;
}

export interface Finish extends FinishRecord {
  category: string;
  pbr: PBRParams;
  textures: { swatch: string; tex: string; texSm: string; thumb: string; normal: string | null };
  pairsWith: string[];
}
