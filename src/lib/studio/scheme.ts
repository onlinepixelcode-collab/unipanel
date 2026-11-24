import { finishById } from "@/data/catalogue";

export type SceneId = "kitchen" | "wardrobe" | "media" | "vanity" | "home";
export type KitchenLayout = "straight" | "l" | "u" | "galley" | "island" | "l-island" | "peninsula";
export type Zone =
  | "baseDoors"
  | "wallDoors"
  | "tallUnits"
  | "islandFronts"
  | "islandEnds"
  | "gables"
  | "kickplate"
  | "shelving"
  | "splashback"
  | "cladding"
  | "wardrobeDoors"
  | "wardrobeInterior";

export type HandleStyle = "jprofile" | "push" | "bar-black" | "bar-steel" | "bar-champagne";
export type Mood = "gallery" | "morning" | "golden" | "evening" | "night";
export type CameraPreset = "overview" | "eye" | "island" | "detail" | "walk";

export interface Scheme {
  scene: SceneId;
  layout: KitchenLayout;
  zones: Record<Zone, string>;
  grain: "v" | "h";
  bookmatch: boolean;
  buildup: 36 | 42 | 48 | 54;
  handle: HandleStyle;
  floor: 0 | 1 | 2 | 3 | 4 | 5;
  wall: 0 | 1 | 2;
  worktop: 0 | 1 | 2;
}

export const ZONE_LABEL: Record<Zone, string> = {
  baseDoors: "Base doors",
  wallDoors: "Wall doors",
  tallUnits: "Tall units",
  islandFronts: "Island fronts",
  islandEnds: "Island end panels",
  gables: "Gable / end panels",
  kickplate: "Kickplate",
  shelving: "Open shelving / build-ups",
  splashback: "Splashback panel",
  cladding: "Wall cladding panel",
  wardrobeDoors: "Wardrobe doors",
  wardrobeInterior: "Wardrobe interiors",
};

export const DOOR_ZONES: Zone[] = ["baseDoors", "wallDoors", "tallUnits", "islandFronts", "wardrobeDoors"];

export const SCENE_LABEL: Record<SceneId, string> = {
  kitchen: "Kitchen",
  wardrobe: "Walk-in wardrobe",
  media: "TV / media wall",
  vanity: "Bathroom vanity",
  home: "Whole home",
};
export const LAYOUT_LABEL: Record<KitchenLayout, string> = {
  straight: "Straight",
  l: "L-shape",
  u: "U-shape",
  galley: "Galley",
  island: "Island",
  "l-island": "L + island",
  peninsula: "Peninsula",
};

export const hasIsland = (l: KitchenLayout) => l === "island" || l === "l-island" || l === "peninsula";

export function zonesFor(scene: SceneId, layout: KitchenLayout): Zone[] {
  switch (scene) {
    case "kitchen": {
      const z: Zone[] = ["baseDoors", "wallDoors", "tallUnits"];
      if (hasIsland(layout)) z.push("islandFronts", "islandEnds");
      z.push("gables", "kickplate", "shelving", "splashback", "cladding");
      return z;
    }
    case "wardrobe":
      return ["wardrobeDoors", "wardrobeInterior", "gables", "kickplate", "shelving", "cladding"];
    case "media":
      return ["cladding", "baseDoors", "tallUnits", "shelving", "gables"];
    case "vanity":
      return ["baseDoors", "wallDoors", "splashback", "cladding", "shelving", "gables"];
    case "home":
      return ["baseDoors", "wallDoors", "tallUnits", "islandFronts", "islandEnds", "gables", "kickplate", "shelving", "splashback", "cladding", "wardrobeDoors", "wardrobeInterior"];
  }
}

export const STAGING = {
  floors: [
    { name: "Pale oak boards", color: "#b9a389" },
    { name: "Warm concrete", color: "#9a948c" },
    { name: "Dark slate", color: "#3a3936" },
    { name: "White porcelain tile", color: "#eeede9" },
    { name: "Polished marble", color: "#ecebe7" },
    { name: "Oak herringbone", color: "#b48a5e" },
  ],
  walls: [
    { name: "Gallery white", color: "#efeeeb" },
    { name: "Putty", color: "#cdc7bd" },
    { name: "Charcoal", color: "#4a4844" },
  ],
  worktops: [
    { name: "White quartz", color: "#eeece8" },
    { name: "Grey stone", color: "#7d7a75" },
    { name: "Black stone", color: "#1d1d1c" },
  ],
  handles: [
    { id: "jprofile", name: "Handleless J-profile" },
    { id: "push", name: "Push-to-open" },
    { id: "bar-black", name: "Slim bar, black" },
    { id: "bar-steel", name: "Slim bar, brushed steel" },
    { id: "bar-champagne", name: "Slim bar, champagne" },
  ] as { id: HandleStyle; name: string }[],
};

export const DEFAULT_SCHEME: Scheme = {
  scene: "kitchen",
  layout: "island",
  zones: {
    baseDoors: "black-matte",
    wallDoors: "kashmir",
    tallUnits: "kashmir",
    islandFronts: "nogal-rosales-02",
    islandEnds: "calacatta-bianco",
    gables: "kashmir",
    kickplate: "black-matte",
    shelving: "nogal-rosales-02",
    splashback: "calacatta-bianco",
    cladding: "oxid-nero-real-stone",
    wardrobeDoors: "satin-kashmir-glass",
    wardrobeInterior: "woodline-02",
  },
  grain: "v",
  bookmatch: true,
  buildup: 42,
  handle: "jprofile",
  floor: 0,
  wall: 0,
  worktop: 0,
};

// ---------- URL encoding (short, versioned, tolerant) ----------
const ZONE_ORDER: Zone[] = ["baseDoors", "wallDoors", "tallUnits", "islandFronts", "islandEnds", "gables", "kickplate", "shelving", "splashback", "cladding", "wardrobeDoors", "wardrobeInterior"];
const SCENES: SceneId[] = ["kitchen", "wardrobe", "media", "vanity", "home"];
const LAYOUTS: KitchenLayout[] = ["straight", "l", "u", "galley", "island", "l-island", "peninsula"];
const HANDLES: HandleStyle[] = ["jprofile", "push", "bar-black", "bar-steel", "bar-champagne"];
const BUILDUPS = [36, 42, 48, 54] as const;

const b64url = (s: string) => (typeof btoa === "function" ? btoa(s) : Buffer.from(s, "binary").toString("base64")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s: string) => {
  const t = s.replace(/-/g, "+").replace(/_/g, "/");
  return typeof atob === "function" ? atob(t) : Buffer.from(t, "base64").toString("binary");
};

export function encodeScheme(s: Scheme): string {
  const parts = [
    "1",
    SCENES.indexOf(s.scene),
    LAYOUTS.indexOf(s.layout),
    s.grain === "h" ? 1 : 0,
    s.bookmatch ? 1 : 0,
    BUILDUPS.indexOf(s.buildup),
    HANDLES.indexOf(s.handle),
    s.floor,
    s.wall,
    s.worktop,
    ...ZONE_ORDER.map((z) => s.zones[z]),
  ];
  return b64url(parts.join("~"));
}

export function decodeScheme(code: string | null | undefined): Scheme | null {
  if (!code) return null;
  try {
    const p = unb64url(code).split("~");
    if (p[0] !== "1") return null;
    const n = (i: number) => Number(p[i]);
    const zones = { ...DEFAULT_SCHEME.zones };
    ZONE_ORDER.forEach((z, i) => {
      const id = p[10 + i];
      if (finishById(id)) zones[z] = id;
    });
    return {
      scene: SCENES[n(1)] ?? "kitchen",
      layout: LAYOUTS[n(2)] ?? "island",
      grain: n(3) ? "h" : "v",
      bookmatch: !!n(4),
      buildup: BUILDUPS[n(5)] ?? 42,
      handle: HANDLES[n(6)] ?? "jprofile",
      floor: (Math.min(5, Math.max(0, n(7))) || 0) as 0,
      wall: (Math.min(2, Math.max(0, n(8))) || 0) as 0,
      worktop: (Math.min(2, Math.max(0, n(9))) || 0) as 0,
      zones,
    };
  } catch {
    return null;
  }
}

/** Finishes actually visible in the current scene, per zone. */
export function usedFinishes(s: Scheme) {
  return zonesFor(s.scene, s.layout).map((z) => ({ zone: z, label: ZONE_LABEL[z], finish: finishById(s.zones[z])! }));
}

// ---------- curated designs ----------
export interface DesignPreset {
  id: string;
  name: string;
  note: string;
  zones: Partial<Record<Zone, string>>;
  handle: HandleStyle;
  floor: 0 | 1 | 2 | 3 | 4 | 5;
  wall: 0 | 1 | 2;
  worktop: 0 | 1 | 2;
}

export const DESIGN_PRESETS: DesignPreset[] = [
  { id: "gallery-white", name: "Gallery White", note: "Chalk-white fronts, Calacatta island, oak open shelves", handle: "push", floor: 0, wall: 0, worktop: 0,
    zones: { baseDoors: "white-matte", wallDoors: "white-matte", tallUnits: "white-matte", islandFronts: "calacatta-bianco", islandEnds: "calacatta-bianco", gables: "white-matte", kickplate: "white-matte", shelving: "woodline-02", splashback: "calacatta-bianco", cladding: "savoia-perla-real-stone", wardrobeDoors: "white-matte", wardrobeInterior: "woodline-02" } },
  { id: "milan-noir", name: "Milan Noir", note: "Black matte, Firestone marble island, champagne bars", handle: "bar-champagne", floor: 2, wall: 2, worktop: 2,
    zones: { baseDoors: "black-matte", wallDoors: "black-matte", tallUnits: "black-matte", islandFronts: "firestone", islandEnds: "firestone", gables: "black-matte", kickplate: "black-matte", shelving: "bruciato-u129", splashback: "firestone", cladding: "oxid-nero-real-stone", wardrobeDoors: "black-glass", wardrobeInterior: "bruciato-u129" } },
  { id: "warm-minimal", name: "Warm Minimal", note: "Kashmir fronts, walnut island, beton cladding", handle: "jprofile", floor: 0, wall: 1, worktop: 0,
    zones: { baseDoors: "kashmir", wallDoors: "kashmir", tallUnits: "kashmir", islandFronts: "nogal-rosales-02", islandEnds: "nogal-rosales-02", gables: "kashmir", kickplate: "kashmir", shelving: "nogal-rosales-02", splashback: "paros-avantgarde", cladding: "beton-real-stone", wardrobeDoors: "satin-kashmir-glass", wardrobeInterior: "nogal-rosales-02" } },
  { id: "sage-oak", name: "Sage & Oak", note: "Verde Salvia with Quercia oak and Nuvola gloss marble", handle: "bar-champagne", floor: 0, wall: 0, worktop: 0,
    zones: { baseDoors: "verde-salvia", wallDoors: "white-matte", tallUnits: "verde-salvia", islandFronts: "quercia-s181", islandEnds: "quercia-s181", gables: "verde-salvia", kickplate: "verde-salvia", shelving: "quercia-s181", splashback: "nuvola-01", cladding: "savoia-perla-real-stone", wardrobeDoors: "verde-salvia", wardrobeInterior: "quercia-s181" } },
  { id: "navy-brass", name: "Navy & Brass", note: "Azul Marino lowers, white uppers, Woodline island", handle: "bar-champagne", floor: 0, wall: 0, worktop: 0,
    zones: { baseDoors: "azul-marino", wallDoors: "white-matte", tallUnits: "azul-marino", islandFronts: "woodline-02", islandEnds: "calacatta-bianco", gables: "azul-marino", kickplate: "azul-marino", shelving: "woodline-02", splashback: "calacatta-bianco", cladding: "gris-perla", wardrobeDoors: "azul-marino", wardrobeInterior: "woodline-02" } },
  { id: "stone-glass", name: "Stone & Glass", note: "Real Stone island, satin glass talls, slate floor", handle: "push", floor: 1, wall: 1, worktop: 1,
    zones: { baseDoors: "savoia-antracite-real-stone", wallDoors: "satin-grey-glass", tallUnits: "satin-grey-glass", islandFronts: "oxid-nero-real-stone", islandEnds: "oxid-nero-real-stone", gables: "satin-grey-glass", kickplate: "savoia-antracite-real-stone", shelving: "sherwood-so72", splashback: "satin-kashmir-glass", cladding: "basalt-grey-real-stone", wardrobeDoors: "satin-grey-glass", wardrobeInterior: "sherwood-so72" } },
  { id: "metal-atelier", name: "Metal Atelier", note: "Brushed anthracite with a champagne-metal island", handle: "jprofile", floor: 1, wall: 2, worktop: 2,
    zones: { baseDoors: "anthracite-metal", wallDoors: "anthracite-metal", tallUnits: "anthracite-metal", islandFronts: "champagne-metal", islandEnds: "champagne-metal", gables: "anthracite-metal", kickplate: "anthracite-metal", shelving: "bruciato-u129", splashback: "black-glass", cladding: "iron-corten-real-stone", wardrobeDoors: "anthracite-metal", wardrobeInterior: "bruciato-u129" } },
  { id: "italian-textile", name: "Italian Textile", note: "Cashmere leather, Tessuto uppers, Calacatta ends", handle: "bar-steel", floor: 0, wall: 1, worktop: 0,
    zones: { baseDoors: "cashmere-leather-731", wallDoors: "tessuto-latte-9296", tallUnits: "tessuto-latte-9296", islandFronts: "loom-ah7", islandEnds: "calacatta-bianco", gables: "tessuto-latte-9296", kickplate: "cashmere-leather-731", shelving: "woodline-03", splashback: "calacatta-bianco", cladding: "oxid-avorio-real-stone", wardrobeDoors: "tessuto-light-9295", wardrobeInterior: "cashmere-leather-731" } },
];
