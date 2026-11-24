"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { SHOWROOMS, showroomById, type CityId } from "@/lib/site";
import { asset, IS_STATIC } from "@/lib/asset";

export type FieldDef =
  | { name: string; label: string; type: "text" | "email" | "tel" | "date"; required?: boolean; autoComplete?: string; span?: 1 | 2 }
  | { name: string; label: string; type: "textarea"; required?: boolean; span?: 1 | 2 }
  | { name: string; label: string; type: "select"; options: string[]; required?: boolean; span?: 1 | 2 };

interface Props {
  kind: string;
  fields: FieldDef[];
  submitLabel: string;
  defaultCity?: CityId;
  defaults?: Record<string, string>;
  extra?: Record<string, string>;
  dark?: boolean;
  successTitle?: string;
  onSuccess?: () => void;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^[+()\d\s-]{9,20}$/;

/**
 * Validated form with honeypot + timing spam checks. Routed to the chosen showroom's
 * email. With FORM_WEBHOOK_URL configured the server delivers it; otherwise (and in the
 * static build) the visitor's email app opens, pre-addressed to that showroom.
 */
export function EnquiryForm({ kind, fields, submitLabel, defaultCity = "jhb", defaults = {}, extra = {}, dark, successTitle = "Thank you.", onSuccess }: Props) {
  const started = useRef(Date.now());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "sent" | "mailto">("idle");
  const [city, setCity] = useState<CityId>(defaultCity);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (fd.get("website") || Date.now() - started.current < 2500) {
      setState("sent"); // silently drop bots
      return;
    }
    const data: Record<string, string> = {};
    fd.forEach((v, k) => (data[k] = String(v).trim()));
    const errs: Record<string, string> = {};
    for (const f of fields) {
      const v = data[f.name] ?? "";
      if (f.required && !v) errs[f.name] = "Required";
      else if (v && f.type === "email" && !EMAIL.test(v)) errs[f.name] = "Please enter a valid email";
      else if (v && f.type === "tel" && !PHONE.test(v)) errs[f.name] = "Please enter a valid phone number";
    }
    if (!data.consent) errs.consent = "Please confirm so we can respond";
    setErrors(errs);
    if (Object.keys(errs).length) {
      const first = e.currentTarget.querySelector<HTMLElement>(`[name="${Object.keys(errs)[0]}"]`);
      first?.focus();
      return;
    }
    delete data.website;
    const room = showroomById(city);
    const payload = { kind, city: room.city, to: room.email, ...extra, ...data };
    setState("sending");
    if (!IS_STATIC) {
      try {
        const r = await fetch(asset("/api/forms/"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
        const j = (await r.json()) as { delivered?: boolean };
        if (r.ok && j.delivered) {
          setState("sent");
          onSuccess?.();
          return;
        }
      } catch {
        /* fall through to email */
      }
    }
    const body = Object.entries({ ...extra, ...data })
      .filter(([k]) => k !== "consent")
      .map(([k, v]) => `${k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}: ${v}`)
      .join("\n");
    window.location.href = `mailto:${room.email}?subject=${encodeURIComponent(`${kind} – website enquiry`)}&body=${encodeURIComponent(body)}`;
    setState("mailto");
    onSuccess?.();
  };

  if (state === "sent" || state === "mailto") {
    const room = showroomById(city);
    return (
      <div role="status" className="py-10">
        <p className="display text-[44px]">{successTitle}</p>
        <p className="mt-4 max-w-md opacity-75">
          {state === "sent"
            ? `Your request is with our ${room.city} team at ${room.email}. We’ll be in touch shortly.`
            : `Your email app has opened with everything filled in, addressed to ${room.email}. Press send and our ${room.city} team will take it from there.`}
        </p>
        <p className="mt-4 text-[15px] opacity-75">
          Prefer to call? <a className="link-u" href={room.phoneHref}>{room.phone}</a>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className={`grid gap-x-6 gap-y-6 sm:grid-cols-2 ${dark ? "section-dark !bg-transparent" : ""}`}>
      <div className="field sm:col-span-2">
        <label htmlFor={`${kind}-city`}>Showroom</label>
        <select id={`${kind}-city`} name="showroom" value={city} onChange={(e) => setCity(e.target.value as CityId)}>
          {SHOWROOMS.map((s) => (
            <option key={s.id} value={s.id} className="text-ink">
              {s.city} · {s.email}
            </option>
          ))}
        </select>
      </div>
      {fields.map((f) => {
        const id = `${kind}-${f.name}`;
        const err = errors[f.name];
        const common = { id, name: f.name, required: f.required, "aria-invalid": !!err, "aria-describedby": err ? `${id}-err` : undefined, defaultValue: defaults[f.name] };
        return (
          <div key={f.name} className={`field ${f.span === 2 || f.type === "textarea" ? "sm:col-span-2" : ""}`}>
            <label htmlFor={id}>
              {f.label}
              {f.required ? " *" : ""}
            </label>
            {f.type === "textarea" ? (
              <textarea {...common} rows={4} />
            ) : f.type === "select" ? (
              <select {...common}>
                <option value="">Select</option>
                {f.options.map((o) => (
                  <option key={o} value={o} className="text-ink">
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input {...common} type={f.type} autoComplete={"autoComplete" in f ? f.autoComplete : undefined} />
            )}
            {err && (
              <span id={`${id}-err`} className="err">
                {err}
              </span>
            )}
          </div>
        );
      })}
      <div className="hp" aria-hidden>
        <label htmlFor={`${kind}-website`}>Website</label>
        <input id={`${kind}-website`} name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="sm:col-span-2">
        <label className="flex items-start gap-3 text-[15px]">
          <input type="checkbox" name="consent" value="yes" className="mt-1 h-5 w-5 accent-[#e4c020]" aria-invalid={!!errors.consent} />
          <span className="opacity-80">
            I agree that UnipanelSA may use these details to respond to this request, as set out in the{" "}
            <Link href="/privacy/" className="underline underline-offset-4">
              privacy notice
            </Link>{" "}
            (POPIA).
          </span>
        </label>
        {errors.consent && <span className="err mt-1 block text-[13px] text-[#b4553f]">{errors.consent}</span>}
      </div>
      <div className="sm:col-span-2">
        <button type="submit" disabled={state === "sending"} className={`btn ${dark ? "btn-light" : "btn-ink"}`}>
          {state === "sending" ? "Sending…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
