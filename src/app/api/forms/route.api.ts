import { SHOWROOMS } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hits = new Map<string, number[]>();
const ALLOWED_TO = new Set(SHOWROOMS.map((s) => s.email));

/**
 * Forwards a validated form to FORM_WEBHOOK_URL (Zapier, Make, Formspree, a CRM...).
 * Without a webhook it answers { delivered: false } and the browser falls back to a
 * pre-addressed email to the chosen showroom, so nothing is ever silently lost.
 */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (recent.length > 10) return Response.json({ delivered: false, error: "rate" }, { status: 429 });

  let data: Record<string, unknown>;
  try {
    data = await req.json();
  } catch {
    return Response.json({ delivered: false }, { status: 400 });
  }
  if (data.website) return Response.json({ delivered: true }); // honeypot
  if (typeof data.to !== "string" || !ALLOWED_TO.has(data.to)) return Response.json({ delivered: false }, { status: 400 });
  const clean = Object.fromEntries(Object.entries(data).map(([k, v]) => [k.slice(0, 40), String(v ?? "").slice(0, 4000)]));

  const hook = process.env.FORM_WEBHOOK_URL;
  if (!hook) return Response.json({ delivered: false });
  try {
    const r = await fetch(hook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...clean, receivedAt: new Date().toISOString() }) });
    return Response.json({ delivered: r.ok });
  } catch {
    return Response.json({ delivered: false });
  }
}
