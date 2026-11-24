/**
 * The concierge's built-in brain: answers the common questions instantly in the
 * browser (works in the static demo with no server), and turns sentences like
 * "dark island with a Calacatta splashback" into Studio actions.
 * Uses only published facts: catalogue data, showroom details, brochure specs.
 */
import { FINISHES, finishById, finishLabel } from "@/data/catalogue";
import { COLLECTIONS } from "@/data/collections";
import { BROCHURE_SPECS } from "@/data/brochure-specs";
import { CARE, careFor } from "@/data/care";
import { SHOWROOMS, SERVICES, type CityId } from "@/lib/site";
import { allStatuses } from "@/lib/hours";
import type { Finish } from "@/data/types";

export type Card = { type: "finish"; id: string } | { type: "showroom"; id: CityId } | { type: "link"; href: string; label: string; note?: string; download?: boolean };
export type Action = { name: string; input: Record<string, unknown> };
export interface Reply {
  text: string;
  cards?: Card[];
  chips?: string[];
  actions?: Action[];
}

const GENERIC = new Set(["black", "white", "grey", "gray", "satin", "real", "silver", "dark", "cross", "carbon", "grigio", "matte", "metal", "glass", "stone", "brown", "cream", "earth", "snow", "loom", "talco", "nadir", "titan", "woodline", "sherwood", "quercia", "nuvola", "porcelain", "sierra", "basalt", "savoia", "oxid", "iron", "tessuto", "magnolia", "cappuccino", "champagne", "kashmir"]);

const KEYS: { key: string; id: string }[] = (() => {
  const out: { key: string; id: string }[] = [];
  for (const f of FINISHES) {
    const name = f.name.toLowerCase();
    const full = f.fullName.toLowerCase();
    out.push({ key: full, id: f.id }, { key: name, id: f.id });
    if (f.code && f.code.length >= 3) out.push({ key: `${name} ${f.code.toLowerCase()}`, id: f.id }, { key: f.code.toLowerCase(), id: f.id });
    const first = name.split(" ")[0];
    if (first.length >= 5 && !GENERIC.has(first)) out.push({ key: first, id: f.id });
  }
  return out.sort((a, b) => b.key.length - a.key.length);
})();

const has = (q: string, word: string) => new RegExp(`(^|[^a-z0-9])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(q);

/** Finishes named in the text (longest names first, no duplicates). */
export function findFinishes(text: string): Finish[] {
  const q = ` ${text.toLowerCase()} `;
  const ids: string[] = [];
  let rest = q;
  for (const k of KEYS) {
    if (has(rest, k.key) && !ids.includes(k.id)) {
      ids.push(k.id);
      rest = rest.replace(k.key, " ");
    }
  }
  // "Black Matte" vs "Black 8102": prefer an exact multi-word name when both are present
  return ids.map((id) => finishById(id)!).filter(Boolean);
}

/** Words that describe a look, mapped to a sensible house pick. */
const DESCRIPTORS: [RegExp, string][] = [
  [/\b(black|dark|charcoal|noir)\b/, "black-matte"],
  [/\b(white|light|bright|chalk)\b/, "white-matte"],
  [/\b(walnut|dark wood)\b/, "nogal-rosales-02"],
  [/\b(oak|wood|timber|woodgrain|warm wood)\b/, "quercia-s181"],
  [/\b(marble|veined|calacatta)\b/, "calacatta-bianco"],
  [/\b(green|sage|olive)\b/, "verde-salvia"],
  [/\b(navy|blue)\b/, "azul-marino"],
  [/\b(grey|gray)\b/, "slate-grey"],
  [/\b(beige|greige|taupe|sand|cashmere)\b/, "kashmir"],
  [/\b(brass|gold|champagne|bronze)\b/, "champagne-metal"],
  [/\b(metal|steel|brushed)\b/, "anthracite-metal"],
  [/\b(concrete|cement|beton)\b/, "beton-real-stone"],
  [/\b(stone|slate|rust|corten)\b/, "oxid-nero-real-stone"],
  [/\b(glass|glossy glass)\b/, "satin-kashmir-glass"],
  [/\b(gloss|glossy|shiny)\b/, "black-8102"],
  [/\b(leather)\b/, "cashmere-leather-731"],
  [/\b(fabric|linen|weave|textile)\b/, "tessuto-latte-9296"],
];
function descriptorFinish(seg: string): string | null {
  for (const [re, id] of DESCRIPTORS) if (re.test(seg)) return id;
  return null;
}

const ZONES: [RegExp, string][] = [
  [/\bisland\b/, "island"],
  [/\bsplash ?back\b|\bbacksplash\b/, "splashback"],
  [/\bcladding\b|\bfeature wall\b|\bwall panel/, "cladding"],
  [/\b(upper|top|wall) (units?|cabinets?|doors?)\b|\buppers\b/, "wallDoors"],
  [/\b(lower|base|bottom) (units?|cabinets?|doors?)\b|\blowers\b/, "baseDoors"],
  [/\btall (units?|cabinets?)\b|\bpantry\b/, "tallUnits"],
  [/\bwardrobe doors?\b|\bwardrobes?\b|\bcloset\b/, "wardrobeDoors"],
  [/\bshel(f|ves|ving)\b/, "shelving"],
  [/\bkick ?plate\b|\bplinth\b/, "kickplate"],
  [/\b(all (the )?doors|doors|cabinets|kitchen|everything)\b/, "allDoors"],
];

function studioActions(q: string): Action[] {
  const actions: Action[] = [];
  if (/\b(bathroom|vanity)\b/.test(q)) actions.push({ name: "set_scene", input: { scene: "vanity" } });
  else if (/\b(tv|media|lounge|living)\b/.test(q)) actions.push({ name: "set_scene", input: { scene: "media" } });
  else if (/\b(walk-?in|dressing room)\b/.test(q)) actions.push({ name: "set_scene", input: { scene: "wardrobe" } });
  else if (/\b(whole home|house|home tour)\b/.test(q)) actions.push({ name: "set_scene", input: { scene: "home" } });
  else if (/\bpeninsula\b/.test(q)) actions.push({ name: "set_scene", input: { scene: "kitchen", layout: "peninsula" } });
  else if (/\bl[- ]shape/.test(q)) actions.push({ name: "set_scene", input: { scene: "kitchen", layout: /island/.test(q) ? "l-island" : "l" } });
  else if (/\bu[- ]shape/.test(q)) actions.push({ name: "set_scene", input: { scene: "kitchen", layout: "u" } });
  else if (/\bgalley\b/.test(q)) actions.push({ name: "set_scene", input: { scene: "kitchen", layout: "galley" } });
  else if (/\bisland\b/.test(q)) actions.push({ name: "set_scene", input: { scene: "kitchen", layout: "island" } });

  // each clause ("dark island", "with a calacatta splashback") names a zone and a finish
  for (const seg of q.split(/\bwith\b|\band\b|,|;|\bplus\b/)) {
    const zone = ZONES.find(([re]) => re.test(seg))?.[1];
    if (!zone) continue;
    const named = findFinishes(seg)[0]?.id;
    const id = named ?? descriptorFinish(seg);
    if (!id) continue;
    if (zone === "island") {
      actions.push({ name: "apply_finish", input: { zone: "islandFronts", finishId: id } }, { name: "apply_finish", input: { zone: "islandEnds", finishId: id } });
    } else actions.push({ name: "apply_finish", input: { zone, finishId: id } });
  }
  return actions;
}

function cityIn(q: string): CityId[] {
  const c: CityId[] = [];
  if (/\b(jhb|joburg|johannesburg|sandton|kramerville|gauteng)\b/.test(q)) c.push("jhb");
  if (/\b(cpt|cape town|paarden|western cape)\b/.test(q)) c.push("cpt");
  if (/\b(dbn|durban|jacobs|kzn|kwazulu)\b/.test(q)) c.push("dbn");
  return c;
}

function specText(f: Finish) {
  if (f.kind === "stone") return `${finishLabel(f)}: 4mm Real Stone face from Germany, cut to size up to 2700 × 780mm, laser edging (PMMA 1.3mm × 19mm).`;
  if (f.kind.startsWith("glass")) return `${finishLabel(f)}: ${f.id === "black-glass" ? "3mm Glass" : "3mm Satin Glass"} from Germany, cut to size up to 2380 × 780mm, laser edging (PMMA 1.3mm × 19mm).`;
  const s = BROCHURE_SPECS[f.id];
  if (!s) return `${finishLabel(f)}: specification on request from your showroom.`;
  return `${finishLabel(f)}: ${[s.size, s.board, s.origin].filter(Boolean).join(" · ")} (as published in the UnipanelSA brochure).`;
}

export const STARTERS = ["Show me a dark island with a Calacatta splashback", "Which showroom is open now?", "Warm woodgrains for a kitchen", "Board size of Nogal Rosales 02", "How do I clean gloss doors?", "Download the catalogue"];

export function answerLocally(input: string, context: string[] = []): Reply {
  const q = ` ${input.toLowerCase().trim()} `;
  let found = findFinishes(q);
  // follow-ups ("add these", "show it", "board size?") refer to the finishes just discussed
  const followUp = /\b(these|them|it|this one|that one|the first one|those)\b|^\s*board size\??\s*$/.test(q);
  if (!found.length && followUp && context.length) {
    found = context.map((id) => finishById(id)!).filter(Boolean);
    if (/\b(first one|it|this one|that one)\b/.test(q)) found = found.slice(0, 1);
  }
  if (found.length && /\b(show|try|apply|put)\b.*\bstudio\b|\bin the studio\b/.test(q) && !ZONES.some(([re]) => re.test(q)))
    return {
      text: `Done. ${found[0].name} is on every door in the Studio. Tap any surface there to fine-tune it.`,
      actions: [{ name: "apply_finish", input: { zone: "allDoors", finishId: found[0].id } }],
      cards: [{ type: "finish", id: found[0].id }],
      chips: ["Make the island walnut", "Add it to my Sample Box"],
    };
  const cities = cityIn(q);

  // greetings & thanks
  if (/^\s*(hi|hello|hey|good (morning|afternoon|evening)|howzit|sawubona)\b/.test(q) && q.trim().split(" ").length <= 4)
    return { text: "Good day. I can find a finish, restyle the Studio for you, check which showroom is open, or add samples to your box.", chips: STARTERS.slice(0, 4) };
  if (/\b(thanks|thank you|cheers|great|perfect)\b/.test(q) && q.trim().split(" ").length <= 5) return { text: "A pleasure. Anything else I can find for you?", chips: ["Open the Studio", "Order samples", "Find a showroom"] };

  // prices, stock, lead times: never invented
  if (/\b(price|prices|cost|how much|quote|pricing|lead ?time|stock|availability|in stock|deliver(y|ies)? time)\b/.test(q))
    return {
      text: "Pricing, stock and lead times are confirmed by our showroom teams, so you always get a current answer. Choose the nearest showroom below, or send an enquiry and they’ll come back to you.",
      cards: (cities.length ? cities : (["jhb", "cpt", "dbn"] as CityId[])).map((id) => ({ type: "showroom", id })),
      chips: ["Send an enquiry", "Which showroom is open now?"],
    };

  // opening hours
  if (/\b(open|opening|hours|close|closing|closed|time|today|saturday|sunday|weekend|public holiday)\b/.test(q) && !/\bopen the (studio|catalogue)\b/.test(q)) {
    const st = allStatuses();
    const list = cities.length ? cities : (SHOWROOMS.map((s) => s.id) as CityId[]);
    const lines = list.map((id) => {
      const s = SHOWROOMS.find((x) => x.id === id)!;
      return `${s.city}: ${st[id].label}${st[id].detail ? `, ${st[id].detail.charAt(0).toLowerCase()}${st[id].detail.slice(1)}` : ""}.`;
    });
    return { text: `${lines.join("\n")}\nAll showrooms are closed on Sundays and public holidays.`, cards: list.map((id) => ({ type: "showroom", id })), chips: ["Book a visit", "Directions"] };
  }

  // where / contact
  if (/\b(where|address|directions?|location|map|visit|showroom|call|phone|number|email|contact|whatsapp)\b/.test(q)) {
    const list = cities.length ? cities : (SHOWROOMS.map((s) => s.id) as CityId[]);
    return { text: list.length === 1 ? `Here is our ${SHOWROOMS.find((s) => s.id === list[0])!.city} showroom.` : "Our showrooms are in Johannesburg, Cape Town and Durban.", cards: list.map((id) => ({ type: "showroom", id })), chips: ["Which showroom is open now?", "Book a visit"] };
  }

  // catalogue / brochure
  if (/\b(catalogue|catalog|brochure|pdf|download)\b/.test(q))
    return {
      text: "The Product Catalogue covers every finish with board sizes, cores and origins, plus the Exclusive Range, services and showrooms. Leaf through it on a kitchen counter, or download the PDF.",
      cards: [
        { type: "link", href: "/catalogue/", label: "Open the catalogue", note: "3D flip book" },
        { type: "link", href: "/catalogue/UnipanelSA-Product-Catalogue.pdf", label: "Download PDF", note: "25 pages", download: true },
      ],
    };

  // specs
  if (/\b(size|sizes|thick|thickness|dimension|dimensions|spec|specs|specification|board|mdf|chip|core|edging|origin|made in)\b/.test(q) && found.length) {
    return { text: found.slice(0, 3).map(specText).join("\n"), cards: found.slice(0, 3).map((f) => ({ type: "finish", id: f.id })), chips: ["Add these to my Sample Box", "Show it in the Studio"] };
  }
  if (/\b(size|thick|thickness|dimension|spec)\b/.test(q))
    return { text: "Board sizes depend on the finish, for example 2800 × 1300 × 19mm for the German matte, gloss and metal boards, and 2750 × 1220/1240 × 18mm for many Spanish boards. Tell me the finish and I’ll give you its published size.", chips: ["Board size of Black Matte", "Board size of Nogal Rosales 02"] };

  // add to sample box
  if (/\b(sample|samples|sample box)\b/.test(q) && /\b(add|put|order|get|want|send)\b/.test(q)) {
    let ids = found.map((f) => f.id);
    if (!ids.length) {
      const d = descriptorFinish(q);
      if (d) ids = [d];
    }
    if (ids.length)
      return {
        text: `Added ${ids.map((id) => finishById(id)!.name).join(", ")} to your Sample Box. Boxes are free for interior designers, architects and manufacturers, delivered to your office (up to 8 finishes).`,
        actions: [{ name: "add_to_sample_box", input: { ids } }],
        cards: [...ids.map((id) => ({ type: "finish" as const, id })), { type: "link", href: "/sample-box/", label: "Review my Sample Box" }],
      };
    return { text: "Sample boxes are free for interior designers, architects and manufacturers, delivered to your office. Tell me which finishes you’d like, or browse and tap + Sample.", cards: [{ type: "link", href: "/sample-box/", label: "Build my Sample Box" }, { type: "link", href: "/boards/", label: "Browse all boards" }] };
  }
  if (/\b(sample|samples)\b/.test(q)) return { text: "Free sample boxes for designers, architects and manufacturers, delivered to your office, up to 8 finishes.", cards: [{ type: "link", href: "/sample-box/", label: "Build my Sample Box" }] };

  // studio restyle
  const acts = studioActions(q);
  if (acts.some((a) => a.name === "apply_finish") || (/\b(show|try|visuali[sz]e|studio|design|restyle|make|put)\b/.test(q) && acts.length)) {
    const applied = acts.filter((a) => a.name === "apply_finish").map((a) => finishById(String(a.input.finishId))!.name);
    const uniq = [...new Set(applied)];
    return {
      text: uniq.length ? `Done. I’ve set the Studio with ${uniq.join(" and ")}. Tap any surface there to change it.` : "Opening that layout in the Studio.",
      actions: acts,
      cards: [...new Set(acts.filter((a) => a.name === "apply_finish").map((a) => String(a.input.finishId)))].map((id) => ({ type: "finish" as const, id })),
      chips: ["Add these to my Sample Box", "Try it as an L-shape", "Make the uppers white"],
    };
  }

  // care
  if (/\b(clean|cleaning|care|maintain|maintenance|scratch|stain|wipe)\b/.test(q)) {
    const key = found[0] ? careFor(found[0].kind) : /gloss/.test(q) ? "gloss" : /metal|brushed/.test(q) ? "metal" : /glass/.test(q) ? "glass" : /stone/.test(q) ? "stone" : "matte";
    const c = CARE[key];
    return { text: `${c.title}:\n${c.steps.map((s) => `• ${s}`).join("\n")}\nAn all-inclusive cleaning solution is available for each product; your showroom will match the right one.`, cards: [{ type: "link", href: "/care/", label: "Full care guide" }] };
  }

  // services
  if (/\b(service|services|cut|cutting|edg(e|ing)|edgebanding|cnc|rout(ing|er)|build.?ups?|pur|glue|process(ing)?|door making)\b/.test(q))
    return { text: SERVICES.map((s) => `${s.title}: ${s.body}`).join("\n"), cards: [{ type: "link", href: "/services/", label: "Explore our services" }, { type: "link", href: "/contact/?type=order", label: "Open the order form" }] };

  // exclusive range
  if (/\b(exclusive|real stone|real glass|ceramic|laser|germany|german)\b/.test(q))
    return { text: "The Exclusive Range (Real Stone, Real Glass and Ceramic) is processed in Germany with laser edgebanding, so face and edge read as one. Real Glass uses patented lamination.", cards: [{ type: "link", href: "/exclusive/", label: "The making of a door" }, { type: "finish", id: "oxid-nero-real-stone" }, { type: "finish", id: "satin-kashmir-glass" }] };

  // named finishes
  if (found.length)
    return {
      text: found.length === 1 ? `${finishLabel(found[0])} is a ${found[0].category.toLowerCase()} from our ${COLLECTIONS.find((c) => c.id === found[0].collections[0])!.name} collection. It pairs well with ${found[0].pairsWith.map((p) => finishById(p)!.name).join(", ")}.` : `Here are the finishes you mentioned.`,
      cards: found.slice(0, 6).map((f) => ({ type: "finish", id: f.id })),
      chips: ["Show it in the Studio", "Add to my Sample Box", "Board size?"],
    };

  // descriptive search ("warm woodgrains", "dark marble")
  const words = q.split(/[^a-z]+/).filter((w) => w.length > 2);
  const tone = /\b(dark|black)\b/.test(q) ? "dark" : /\b(light|white|pale)\b/.test(q) ? "light" : /\bwarm\b/.test(q) ? "warm" : /\bcool\b/.test(q) ? "cool" : null;
  const coll = COLLECTIONS.find((c) => q.includes(c.id.replace("-", " ")) || q.includes(c.name.toLowerCase()) || (c.id === "woodgrain" && /\bwood/.test(q)) || (c.id === "real-stone" && /\bstone\b/.test(q)) || (c.id === "real-glass" && /\bglass\b/.test(q)) || (c.id === "metal" && /\bmetal/.test(q)) || (c.id === "marble" && /\bmarble/.test(q)) || (c.id === "matte" && /\bmatt/.test(q)) || (c.id === "gloss" && /\bgloss/.test(q)) || (c.id === "textured" && /\b(textur|leather|weave|fabric)/.test(q)));
  if (coll || tone) {
    const list = FINISHES.filter((f) => (!coll || f.collections.includes(coll.id)) && (!tone || f.tones.includes(tone as never)));
    if (list.length)
      return {
        text: `${list.length} ${tone ? `${tone} ` : ""}${coll ? `${coll.name.toLowerCase()} ` : ""}finishes to start with:`,
        cards: list.slice(0, 8).map((f) => ({ type: "finish", id: f.id })),
        chips: coll ? [`Open the ${coll.name} collection`, "Show the first one in the Studio"] : ["Browse all boards"],
      };
  }
  if (words.some((w) => ["studio", "visualiser", "visualizer", "3d"].includes(w))) return { text: "The Studio lets you restyle a kitchen, wardrobe, media wall, bathroom or a whole home with every finish, then download a branded spec sheet.", cards: [{ type: "link", href: "/studio/", label: "Open the Studio" }] };

  return {
    text: "I can help with finishes, the Studio, showroom hours and samples. Try one of these, or name a finish or code.",
    chips: STARTERS,
  };
}

/** Finishes mentioned in a free-text AI reply, shown as cards under it. */
export function cardsFromText(text: string): Card[] {
  return findFinishes(text)
    .slice(0, 6)
    .map((f) => ({ type: "finish", id: f.id }));
}

/** Map a quick-reply chip to an action that doesn't need the brain. */
export function chipRoute(chip: string): string | null {
  const c = chip.toLowerCase();
  if (c === "open the studio") return "/studio/";
  if (c === "order samples" || c === "build my sample box") return "/sample-box/";
  if (c === "find a showroom" || c === "book a visit") return "/showrooms/#book";
  if (c === "send an enquiry") return "/contact/";
  if (c === "browse all boards") return "/boards/";
  const coll = COLLECTIONS.find((x) => c === `open the ${x.name.toLowerCase()} collection`);
  if (coll) return `/collections/${coll.id}/`;
  return null;
}
