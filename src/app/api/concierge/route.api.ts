import Anthropic from "@anthropic-ai/sdk";
import { FINISHES, finishById, searchFinishes } from "@/data/catalogue";
import { COLLECTIONS } from "@/data/collections";
import { SHOWROOMS, SERVICES, SITE } from "@/lib/site";
import { allStatuses, nowInSAST } from "@/lib/hours";
import { ZONE_LABEL, LAYOUT_LABEL, SCENE_LABEL } from "@/lib/studio/scheme";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

// ---------- rate limiting (per instance, sliding window) ----------
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 25;
}

// ---------- stable system prompt (cached) ----------
const catalogueLines = FINISHES.map((f) => `${f.id} | ${f.name}${f.code ? ` ${f.code}` : ""} | ${f.collections.join("+")} | ${f.category} | ${f.tones.join("/")}`).join("\n");

const SYSTEM = `You are "Ask Unipanel", the concierge on the UnipanelSA website. Speak like a calm, senior showroom consultant: short answers (2–4 sentences unless asked for more), British/South African spelling, no emoji, no hype. When you mention a finish, give its name and code (if it has one).

FACTS (use only these; never invent):
- UnipanelSA: South Africa’s premium supplier of imported European interior boards: kitchen doors, panels, wardrobes and interiors. Tagline: "${SITE.taglines.primary}". ${SITE.ksa}.
- Free sample boxes for interior designers, architects and manufacturers, delivered to their office (up to 8 finishes per box on this site).
- Product care: an all-inclusive cleaning solution is available for each product. Give only general care advice (soft microfibre cloth, mild soapy water, no abrasives or scourers, dry after cleaning) and point to the Care Guide and the showroom for the matching cleaning solution. Never invent chemicals.
- Exclusive Range: Real Stone, Real Glass and Ceramic, processed in Germany using laser edgebanding technology. Real Glass uses patented lamination.
- Services: ${SERVICES.map((s) => `${s.title}: ${s.body}`).join(" ")}
- Showrooms (all closed Sundays and public holidays):
${SHOWROOMS.map((s) => `  ${s.city}: ${s.street}, ${s.suburb} ${s.postcode} · ${s.phone} · ${s.email} · ${s.hoursText.join(", ")}`).join("\n")}
- Instagram ${SITE.instagramHandle}. Brochure: ${SITE.brochure}

GUARDRAILS:
- Never state prices, board sizes, thicknesses (other than the published 36–54mm build-up range), stock, lead times or technical specifications. Say they are available on request and give the right showroom contact.
- Stay on topic (UnipanelSA surfaces, services, showrooms, the Studio). Politely decline anything else.
- Only collect personal details needed for a visit or enquiry, and only through the booking/enquiry tools, which open a form the visitor completes themselves. Mention that details are handled under POPIA.
- Use only finish ids from the catalogue below in tool calls. If nothing fits, say so.

THE STUDIO (3D visualiser on this site): scenes ${Object.entries(SCENE_LABEL).map(([k, v]) => `${k}=${v}`).join(", ")}; kitchen layouts ${Object.entries(LAYOUT_LABEL).map(([k, v]) => `${k}=${v}`).join(", ")}; zones ${Object.entries(ZONE_LABEL).map(([k, v]) => `${k}=${v}`).join(", ")}, plus allDoors. When a visitor asks to see a look ("a dark island with a Calacatta splashback"), call set_scene/apply_finish; the site opens the Studio and applies it live. Worktops, floors, walls and handles are visual staging only, not sold by UnipanelSA.

COLLECTIONS: ${COLLECTIONS.map((c) => `${c.id} (${c.name})`).join(", ")}.

CATALOGUE (${FINISHES.length} finishes) — id | name code | collections | surface | tones:
${catalogueLines}`;

const tools: Anthropic.Messages.Tool[] = [
  {
    name: "get_showroom_status",
    description: "Current SAST time and whether each showroom is open right now, with the next opening time. Use before answering any 'are you open' question.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "search_catalogue",
    description: "Search finishes by words in the name, code, surface or collection. Returns ids, names and codes.",
    input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false },
  },
  {
    name: "apply_finish",
    description: "Apply a finish to a zone in the 3D Studio (opens the Studio if needed).",
    input_schema: {
      type: "object",
      properties: { zone: { type: "string", enum: [...Object.keys(ZONE_LABEL), "allDoors"] }, finishId: { type: "string" } },
      required: ["zone", "finishId"],
      additionalProperties: false,
    },
  },
  {
    name: "set_scene",
    description: "Switch the Studio scene and, for kitchens, the layout.",
    input_schema: {
      type: "object",
      properties: { scene: { type: "string", enum: Object.keys(SCENE_LABEL) }, layout: { type: "string", enum: Object.keys(LAYOUT_LABEL) } },
      required: ["scene"],
      additionalProperties: false,
    },
  },
  {
    name: "open_finish_page",
    description: "Open the detail page of one finish.",
    input_schema: { type: "object", properties: { id: { type: "string" } }, required: ["id"], additionalProperties: false },
  },
  {
    name: "add_to_sample_box",
    description: "Add finishes to the visitor's Sample Box (max 8 in total).",
    input_schema: { type: "object", properties: { ids: { type: "array", items: { type: "string" }, maxItems: 8 } }, required: ["ids"], additionalProperties: false },
  },
  {
    name: "book_showroom_visit",
    description: "Open the visit booking form for a showroom, prefilled with what the visitor told you. The visitor completes and submits it.",
    input_schema: {
      type: "object",
      properties: { city: { type: "string", enum: ["jhb", "cpt", "dbn"] }, date: { type: "string" }, note: { type: "string" } },
      required: ["city"],
      additionalProperties: false,
    },
  },
  {
    name: "start_enquiry",
    description: "Open the enquiry form prefilled with a short summary of what the visitor wants. The visitor completes and submits it.",
    input_schema: {
      type: "object",
      properties: { city: { type: "string", enum: ["jhb", "cpt", "dbn"] }, summary: { type: "string" } },
      required: ["summary"],
      additionalProperties: false,
    },
  },
].map((t) => ({ ...t, eager_input_streaming: true }) as Anthropic.Messages.Tool);

type Emit = (o: Record<string, unknown>) => void;

/** Validate and run one tool call. Client-side actions are forwarded to the browser. */
function runTool(name: string, raw: unknown, emit: Emit): { content: string; is_error?: boolean } {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const str = (k: string) => (typeof input[k] === "string" ? (input[k] as string) : "");
  switch (name) {
    case "get_showroom_status": {
      const now = nowInSAST();
      const st = allStatuses();
      return {
        content: JSON.stringify({
          sast: `${now.year}-${String(now.month).padStart(2, "0")}-${String(now.day).padStart(2, "0")} ${String(Math.floor(now.minutes / 60)).padStart(2, "0")}:${String(now.minutes % 60).padStart(2, "0")}`,
          showrooms: SHOWROOMS.map((s) => ({ city: s.city, ...st[s.id], phone: s.phone, email: s.email })),
        }),
      };
    }
    case "search_catalogue": {
      const r = searchFinishes(str("query")).slice(0, 15).map((f) => ({ id: f.id, name: f.name, code: f.code, collections: f.collections, surface: f.category }));
      return { content: JSON.stringify(r.length ? r : { result: "no matches" }) };
    }
    case "apply_finish": {
      const f = finishById(str("finishId"));
      const zone = str("zone");
      if (!f || !(zone in ZONE_LABEL || zone === "allDoors")) return { content: "Unknown finish id or zone.", is_error: true };
      emit({ type: "action", name, input: { zone, finishId: f.id } });
      return { content: `Applied ${f.name} to ${zone}.` };
    }
    case "set_scene": {
      if (!(str("scene") in SCENE_LABEL)) return { content: "Unknown scene.", is_error: true };
      emit({ type: "action", name, input: { scene: str("scene"), layout: str("layout") || undefined } });
      return { content: "Scene set." };
    }
    case "open_finish_page": {
      const f = finishById(str("id"));
      if (!f) return { content: "Unknown finish id.", is_error: true };
      emit({ type: "action", name, input: { id: f.id } });
      return { content: `Opened ${f.name}.` };
    }
    case "add_to_sample_box": {
      const ids = (Array.isArray(input.ids) ? input.ids : []).filter((x): x is string => typeof x === "string" && !!finishById(x));
      if (!ids.length) return { content: "No valid finish ids.", is_error: true };
      emit({ type: "action", name, input: { ids } });
      return { content: `Requested ${ids.length} sample(s); the box holds 8 in total.` };
    }
    case "book_showroom_visit":
    case "start_enquiry":
      emit({ type: "action", name, input });
      return { content: "Form opened for the visitor to complete." };
    default:
      return { content: "Unknown tool.", is_error: true };
  }
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited(ip)) return Response.json({ error: "You’ve sent a lot of messages. Please wait a few minutes, or call a showroom." }, { status: 429 });
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) return Response.json({ error: "offline" }, { status: 503 });

  let body: { messages?: { role: "user" | "assistant"; content: string }[]; context?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  const history = (body.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-16)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
  if (!history.length || history[0].role !== "user") return Response.json({ error: "Bad request" }, { status: 400 });

  const client = new Anthropic();
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit: Emit = (o) => controller.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      const messages: Anthropic.Beta.BetaMessageParam[] = [...history];
      if (body.context) messages.push({ role: "system" as "user", content: `Page context: ${String(body.context).slice(0, 300)}` } as Anthropic.Beta.BetaMessageParam);
      try {
        for (let turn = 0; turn < 5; turn++) {
          const s = client.beta.messages.stream({
            model: MODEL,
            max_tokens: 4000,
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
            output_config: { effort: "low" },
            system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
            tools: tools as Anthropic.Beta.BetaToolUnion[],
            tool_choice: { type: "auto" },
            messages,
          } as Anthropic.Beta.Messages.MessageCreateParamsStreaming);
          s.on("text", (delta) => emit({ type: "text", delta }));
          const msg = await s.finalMessage();

          if (msg.stop_reason === "refusal") {
            emit({ type: "text", delta: "I can’t help with that here. For anything about our surfaces, a showroom team member is happy to help." });
            break;
          }
          if (msg.stop_reason === "max_tokens") break;
          if (msg.stop_reason !== "tool_use") break;

          messages.push({ role: "assistant", content: msg.content });
          const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
          for (const block of msg.content) {
            if (block.type !== "tool_use") continue;
            const r = runTool(block.name, block.input, emit);
            results.push({ type: "tool_result", tool_use_id: block.id, content: r.content, ...(r.is_error ? { is_error: true } : {}) });
          }
          messages.push({ role: "user", content: results });
        }
        emit({ type: "done" });
      } catch (err) {
        const status = err instanceof Anthropic.APIError ? err.status : 0;
        emit({ type: "error", message: status === 429 ? "The concierge is busy right now. Please try again in a moment." : "The concierge is unavailable right now." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
