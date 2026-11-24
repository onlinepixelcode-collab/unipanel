/**
 * Board specifications exactly as published in UnipanelSA's own brochure (June 2025).
 * Used in the downloadable product catalogue only. Finishes not listed there show
 * "Specification on request".
 */
export interface BoardSpec {
  size?: string;
  board?: string; // core / backer, e.g. "MDF/DF"
  origin?: string;
}

const S = (size: string, board: string, origin: string): BoardSpec => ({ size, board, origin });

export const BROCHURE_SPECS: Record<string, BoardSpec> = {
  // textured
  "titan-01": S("2750 × 1240 × 18mm", "MDF/DF", "Spain"),
  "titan-02": S("2750 × 1240 × 18mm", "MDF/DF", "Spain"),
  "cross-metal-01": S("2750 × 1240 × 18mm", "Chip/DF", "Italy"),
  "cross-metal-02": S("2750 × 1240 × 18mm", "Chip/DF", "Italy"),
  "siena-stratos": S("2750 × 1240 × 18mm", "MDF/DF", "Spain"),
  "paros-avantgarde": S("2750 × 1240 × 18mm", "MDF/DF", "Spain"),
  "nadir-ln01": S("2800 × 2070 × 18mm", "Chip/DF", "Italy"),
  "nadir-ln03": S("2800 × 2070 × 18mm", "Chip/DF", "Italy"),
  // woodgrain
  "woodline-02": S("2750 × 1240 × 18mm", "MDF/DF", "Spain"),
  "woodline-03": S("2750 × 1240 × 18mm", "MDF/DF", "Spain"),
  "nogal-rosales-02": S("2750 × 1240 × 18mm", "MDF/DF", "Spain"),
  "nogal-rosales-03": S("2750 × 1240 × 18mm", "MDF/DF", "Spain"),
  "bruciato-u129": S("2800 × 2070 × 18mm", "Chip/DF", "Italy"),
  "sherwood-so71": S("2800 × 2070 × 18mm", "Chip/DF", "Italy"),
  "sherwood-so72": S("2800 × 2070 × 18mm", "Chip/DF", "Italy"),
  "quercia-s181": S("2800 × 2070 × 18mm", "Chip/DF", "Italy"),
  "quercia-s185": S("2800 × 2070 × 18mm", "Chip/DF", "Italy"),
  // matte
  "black-matte": S("2800 × 1300 × 19mm", "MDF/DF", "Germany"),
  "slate-grey": S("2800 × 1300 × 19mm", "MDF/DF", "Germany"),
  steingrau: S("2800 × 1300 × 19mm", "MDF/DF", "Germany"),
  "white-matte": S("2800 × 1300 × 19mm", "MDF/SF", "Germany"),
  kashmir: S("2800 × 1300 × 19mm", "MDF/DF", "Germany"),
  "talco-fb38": S("2800 × 2070 × 18mm", "Chip/DF", "Italy"),
  "talco-fc18": { origin: "Italy" },
  "azul-marino": S("2750 × 1220 × 18mm", "MDF/DF", "Spain"),
  "gris-perla": S("2750 × 1220 × 18mm", "MDF/DF", "Spain"),
  basalto: S("2750 × 1220 × 18mm", "MDF/DF", "Spain"),
  "steelboard-grafito": S("2750 × 1220 × 18mm", "MDF/DF", "Spain"),
  "verde-salvia": S("2750 × 1220 × 18mm", "MDF/DF", "Spain"),
  magnolia: S("2750 × 1220 × 18mm", "MDF/DF", "Spain"),
  "gris-nube": S("2750 × 1220 × 18mm", "MDF/DF", "Spain"),
  // metal
  "anthracite-metal": S("2800 × 1300 × 19mm", "MDF/SF/DF", "Germany"),
  "champagne-metal": S("2800 × 1300 × 19mm", "MDF/SF/DF", "Germany"),
  "brown-metal": S("2800 × 1300 × 19mm", "MDF/DF", "Germany"),
  "silver-metal": S("2800 × 1300 × 19mm", "MDF/DF", "Germany"),
  // gloss
  "kubanite-7499-metallic": S("2800 × 1300 × 19mm", "MDF/SF", "Germany"),
  "silver-85385-metallic": S("2800 × 1300 × 19mm", "MDF/SF", "Germany"),
  "cappuccino-7498": S("2800 × 1300 × 19mm", "MDF/SF", "Germany"),
  "black-8102": S("2800 × 1300 × 19mm", "MDF/SF", "Germany"),
  "grafite-85387-metallic": S("2800 × 1300 × 19mm", "MDF/SF", "Germany"),
  "blue-titanium-oxygen-4562": S("2800 × 1300 × 19mm", "MDF/SF", "Germany"),
  "white-1982": S("2800 × 1300 × 19mm", "MDF/SF", "Germany"),
  "cream-7496": S("2800 × 1300 × 19mm", "MDF/SF", "Germany"),
  "dark-grey-85223": S("2800 × 1300 × 19mm", "MDF/SF", "Germany"),
  "white-metallic-11036": S("2800 × 1300 × 19mm", "MDF/SF", "Germany"),
  "nuvola-01": S("2750 × 1220 × 18mm", "MDF/DF", "Spain"),
  "nuvola-02": S("2750 × 1220 × 18mm", "MDF/DF", "Spain"),
  "nuvola-03": S("2750 × 1220 × 18mm", "MDF/DF", "Spain"),
  "porcelain-01": S("2750 × 1220 × 18mm", "MDF/DF", "Spain"),
  "porcelain-02": S("2750 × 1220 × 18mm", "MDF/DF", "Spain"),
  "sierra-02": S("2750 × 1220 × 18mm", "MDF/SF", "Spain"),
};

/** Collection-level notes from the brochure (backer and edging). */
export const COLLECTION_NOTES: Record<string, string> = {
  textured: "DF = double face. Edging: ABS 1mm × 22mm / 43mm / 60mm.",
  woodgrain: "DF = double face. Edging: ABS 1mm × 22mm / 43mm / 60mm.",
  matte: "SF = single face white, DF = double face. Edging: ABS 1mm × 22–23mm / 43mm / 60mm.",
  metal: "Metals come standard with a double face finish. Edging: PMMA 1mm × 23mm / 43mm.",
  gloss: "SF = single face white, DF = double face. Edging: ABS 1mm × 23mm / 38mm / 54mm.",
  marble: "See each finish for board and origin. Edging matched to the range.",
  "real-glass": "Real Glass and Satin Glass, 3mm, from Germany. Cut to size: 2380 × 780mm maximum to 2380 × 40mm minimum. Laser edging: PMMA 1.3mm × 19mm. Backer: white, black or dark grey. Boring and drilling of handles on request.",
  "real-stone": "4mm Real Stone from Germany. Cut to size: 2700 × 780mm maximum to 2700 × 40mm minimum. Laser edging: PMMA 1.3mm × 19mm. Backer: white, black or dark grey. Boring and drilling of handles on request.",
  "premium-italian": "The newest arrivals. Board sizes and specification on request from your showroom.",
};
