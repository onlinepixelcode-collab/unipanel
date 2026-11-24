/**
 * Hand-curated "Pairs beautifully with" sets. Any finish not listed here gets three
 * computed partners (tonal contrast + a change of surface character).
 * Keys and values are finish ids from catalogue.records.ts.
 */
export const CURATED_PAIRS: Record<string, string[]> = {
  "calacatta-bianco": ["black-matte", "champagne-metal", "nogal-rosales-02"],
  "black-matte": ["calacatta-bianco", "quercia-s181", "champagne-metal"],
  "verde-salvia": ["kashmir", "woodline-02", "savoia-perla-real-stone"],
  "azul-marino": ["white-matte", "nogal-rosales-02", "champagne-metal"],
  "champagne-metal": ["black-matte", "calacatta-bianco", "satin-kashmir-glass"],
  "oxid-nero-real-stone": ["kashmir", "champagne-glass", "quercia-s185"],
  "satin-kashmir-glass": ["oxid-nero-real-stone", "woodline-02", "white-matte"],
  "nogal-rosales-02": ["gris-perla", "black-matte", "calacatta-bianco"],
  "firestone": ["kashmir", "champagne-metal", "bruciato-u129"],
  "cashmere-leather-731": ["black-8102", "nuvola-01", "anthracite-metal"],
};
