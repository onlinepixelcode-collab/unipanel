import type { CollectionId } from "./types";

export interface Collection {
  id: CollectionId;
  no: string;
  name: string;
  /** Headline for the collection page; `accent` is set in italic. */
  headline: [string, string];
  intro: string;
  /** Finish ids used for the cover and hero macro. */
  cover: string;
  hero: string[];
  dark: boolean;
  group?: "exclusive";
  /** Live site collection page. */
  source: string;
}

export const COLLECTIONS: Collection[] = [
  {
    id: "premium-italian",
    no: "01",
    name: "Premium Italian Range",
    headline: ["Made with", "un gusto italiano"],
    intro: "The newest arrivals: marble faces, carbon weave, loom and tessuto textiles, and six leathers. An editorial range for rooms that want to be read slowly.",
    cover: "calacatta-bianco",
    hero: ["calacatta-bianco", "cashmere-leather-731", "loom-ah7", "tessuto-latte-9296"],
    dark: false,
    source: "https://unipanelsa.co.za/collection/premium_italian_range/",
  },
  {
    id: "matte",
    no: "02",
    name: "Matte",
    headline: ["Soft to the touch,", "quiet to the eye"],
    intro: "Soft-touch matte surfaces that absorb light rather than return it. Muted greys, deep navy, sage and chalk whites.",
    cover: "verde-salvia",
    hero: ["verde-salvia", "azul-marino", "kashmir", "black-matte"],
    dark: false,
    source: "https://unipanelsa.co.za/collection/matte/",
  },
  {
    id: "gloss",
    no: "03",
    name: "Gloss",
    headline: ["A surface that", "holds the room"],
    intro: "Mirror-deep gloss and metallic flake, plus gloss marbles. Every light in the room becomes part of the door.",
    cover: "black-8102",
    hero: ["black-8102", "nuvola-01", "kubanite-7499-metallic", "cream-7496"],
    dark: true,
    source: "https://unipanelsa.co.za/collection/gloss/",
  },
  {
    id: "metal",
    no: "04",
    name: "Metal",
    headline: ["Brushed light,", "moving with you"],
    intro: "Brushed metal faces in champagne, silver, anthracite and bronze-brown. The grain catches light differently from every angle.",
    cover: "champagne-metal",
    hero: ["champagne-metal", "anthracite-metal", "silver-metal", "brown-metal"],
    dark: true,
    source: "https://unipanelsa.co.za/collection/metal/",
  },
  {
    id: "woodgrain",
    no: "05",
    name: "Woodgrain",
    headline: ["Grain that runs", "the length of a room"],
    intro: "Oaks, walnuts and a charred black. Warm, tactile woodgrains for doors, panels and wardrobes.",
    cover: "nogal-rosales-02",
    hero: ["nogal-rosales-02", "quercia-s181", "woodline-02", "bruciato-u129"],
    dark: false,
    source: "https://unipanelsa.co.za/collection/woodgrain/",
  },
  {
    id: "marble",
    no: "06",
    name: "Marble",
    headline: ["Veins that", "meet in the middle"],
    intro: "Calacatta, Firestone, Nuvola, Porcelain and more. Marble faces in gloss, matte and textured finishes, made to be bookmatched.",
    cover: "nuvola-03",
    hero: ["calacatta-bianco", "firestone", "siena-stratos", "talco-fc18"],
    dark: false,
    source: "https://unipanelsa.co.za/collection/marble/",
  },
  {
    id: "textured",
    no: "07",
    name: "Textured",
    headline: ["Run a hand", "across it"],
    intro: "Leathers, weaves, linen-like Nadir, Titan and Cross Metal relief. Surfaces you notice with your fingertips first.",
    cover: "loom-ah7",
    hero: ["carbon-weave-9238", "titan-01", "nadir-ln01", "grigio-leather-540"],
    dark: true,
    source: "https://unipanelsa.co.za/collection/textured/",
  },
  {
    id: "real-stone",
    no: "08",
    name: "Real Stone",
    headline: ["Stone, cut", "to a door"],
    intro: "Part of the Exclusive Range, processed in Germany with laser edgebanding. Oxidised irons, basalts, slates and beton with real mineral depth.",
    cover: "oxid-nero-real-stone",
    hero: ["oxid-nero-real-stone", "iron-corten-real-stone", "savoia-perla-real-stone", "basalt-black-real-stone"],
    dark: true,
    group: "exclusive",
    source: "https://unipanelsa.co.za/collection/real_stone/",
  },
  {
    id: "real-glass",
    no: "09",
    name: "Real Glass",
    headline: ["Depth you can", "see into"],
    intro: "Part of the Exclusive Range. Real glass with patented lamination, in gloss and satin, processed in Germany with laser edgebanding.",
    cover: "satin-kashmir-glass",
    hero: ["satin-kashmir-glass", "black-glass", "champagne-glass", "satin-grey-glass"],
    dark: true,
    group: "exclusive",
    source: "https://unipanelsa.co.za/collection/real_glass/",
  },
];

export const collectionById = (id: string) => COLLECTIONS.find((c) => c.id === id);
