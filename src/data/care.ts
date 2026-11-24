import type { FinishKind } from "./types";

/**
 * General, non-chemical care guidance. UnipanelSA supplies an all-inclusive cleaning
 * solution for each product; always confirm the right one with a showroom.
 */
export const CARE = {
  matte: { title: "Matte & soft-touch", steps: ["Wipe with a soft, damp microfibre cloth.", "Use only mild soapy water for marks; avoid abrasive pads, scourers and polishes.", "Dry with a clean cloth to avoid water spots."] },
  gloss: { title: "Gloss", steps: ["Dust first so grit is not dragged across the surface.", "Clean with a soft microfibre cloth and mild soapy water; never use abrasives.", "Buff dry with a clean, lint-free cloth for a streak-free finish."] },
  metal: { title: "Metal", steps: ["Wipe in the direction of the brushed grain with a soft, damp cloth.", "Avoid scourers, steel wool and abrasive creams.", "Dry straight away to prevent marks."] },
  glass: { title: "Real Glass", steps: ["Clean with a soft microfibre cloth and mild soapy water.", "Avoid abrasive pads and powders on gloss and satin glass alike.", "Dry with a lint-free cloth; on satin glass, wipe gently to keep the finish even."] },
  stone: { title: "Real Stone", steps: ["Dust with a soft, dry brush or cloth to keep the mineral texture clean.", "Spot-clean with a lightly damp cloth; do not soak the surface.", "Avoid abrasive pads and acidic household cleaners."] },
} as const;

export type CareKey = keyof typeof CARE;

export function careFor(kind: FinishKind): CareKey {
  if (kind === "metal" || kind === "textured-metal") return "metal";
  if (kind === "glass" || kind === "glass-satin") return "glass";
  if (kind === "stone") return "stone";
  if (kind === "gloss" || kind === "gloss-metallic" || kind === "marble-gloss") return "gloss";
  return "matte";
}
