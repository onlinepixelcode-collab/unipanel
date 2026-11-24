"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SHOWROOMS, SITE, showroomById, type CityId } from "@/lib/site";
import { asset } from "@/lib/asset";
import { EnquiryForm } from "@/components/ui/EnquiryForm";
import { ShowroomStatus } from "@/components/ui/ShowroomStatus";
import { decodeScheme, usedFinishes, SCENE_LABEL } from "@/lib/studio/scheme";
import { finishById, finishLabel } from "@/data/catalogue";

const Icon = {
  phone: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
    </svg>
  ),
  mail: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6 8.5 7 8.5-7" />
    </svg>
  ),
  pin: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  ),
  insta: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r=".9" fill="currentColor" />
    </svg>
  ),
  arrow: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
};

/**
 * Contact & order page. Pick a showroom (live open/closed status, hours, directions),
 * and the enquiry or order form below is routed to that showroom's inbox. Prefills from
 * the Studio (?s=), a finish page (?finish=) or the concierge (?message=).
 */
export function ContactPage() {
  const [mode, setMode] = useState<"enquiry" | "order">("enquiry");
  const [city, setCity] = useState<CityId>("jhb");
  const [pre, setPre] = useState<{ message: string; extra: Record<string, string> }>({ message: "", extra: {} });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const u = new URL(window.location.href);
    if (u.searchParams.get("type") === "order") setMode("order");
    const c = u.searchParams.get("city") as CityId;
    if (["jhb", "cpt", "dbn"].includes(c)) setCity(c);
    let message = u.searchParams.get("message") ?? "";
    const extra: Record<string, string> = {};
    const f = finishById(u.searchParams.get("finish"));
    if (f) message = message || `I’d like to know more about ${finishLabel(f)}.`;
    const s = decodeScheme(u.searchParams.get("s"));
    if (s) {
      const lines = usedFinishes(s).map((x) => `${x.label}: ${finishLabel(x.finish)}`);
      extra.scheme = `${SCENE_LABEL[s.scene]} · ${lines.join("; ")}`;
      extra.schemeLink = `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/studio/?s=${u.searchParams.get("s")}`;
      message = message || `Please advise on this Studio scheme:\n${lines.join("\n")}`;
    }
    setPre({ message, extra });
    setReady(true);
  }, []);

  const room = showroomById(city);
  const toForm = () => document.getElementById("contact-form")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      {/* ---------------------------------------------------------- hero */}
      <section data-theme="dark" className="relative overflow-hidden bg-ink text-porcelain">
        <div className="absolute inset-0">
          <img src={asset("/inspiration/ALVIC-Hermosilla-77_Zenit-Metal-Plus-Kitchen-min-scaled-1.webp")} alt="" className="contact-zoom h-full w-full object-cover opacity-45" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/30" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent" />
        </div>
        <div className="container-x relative grid gap-12 pb-16 pt-[calc(var(--nav-h)+9vh)] lg:grid-cols-12 lg:pb-24">
          <div className="lg:col-span-7">
            <p className="eyebrow text-champagne">Contact · Order form</p>
            <h1 className="display mt-6 text-[clamp(3.2rem,8.5vw,8.5rem)] leading-[0.92]">
              Let’s talk
              <br />
              <em className="display-italic text-champagne">surfaces.</em>
            </h1>
            <p className="mt-8 max-w-[34rem] text-[17px] leading-relaxed text-porcelain/75">
              Three showrooms, one team. Call, email or send the form below and it goes straight to the showroom you choose: Johannesburg, Cape Town or Durban.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <button onClick={toForm} className="btn btn-light">
                Send an enquiry {Icon.arrow}
              </button>
              <button
                onClick={() => {
                  setMode("order");
                  toForm();
                }}
                className="btn btn-line !border-white/30 !text-porcelain hover:!border-champagne"
              >
                Place an order
              </button>
            </div>
          </div>

          {/* quick contact: follows the selected showroom */}
          <div className="self-end lg:col-span-4 lg:col-start-9">
            <div className="rounded-[4px] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-md">
              <div className="flex items-center justify-between gap-3">
                <p className="eyebrow text-stone-light">Quick contact</p>
                <ShowroomStatus city={city} className="text-porcelain/70" />
              </div>
              <div role="radiogroup" aria-label="Showroom" className="mt-4 grid grid-cols-3 gap-1 rounded-full bg-white/[0.06] p-1">
                {SHOWROOMS.map((s) => (
                  <button key={s.id} role="radio" aria-checked={city === s.id} onClick={() => setCity(s.id)} className={`h-9 rounded-full text-[13px] transition-colors ${city === s.id ? "bg-champagne text-ink" : "text-porcelain/75 hover:text-porcelain"}`}>
                    {s.id === "jhb" ? "Joburg" : s.city}
                  </button>
                ))}
              </div>
              <ul className="mt-5 divide-y divide-white/10 text-[15px]">
                <li>
                  <a href={room.phoneHref} className="group flex items-center gap-3 py-3.5">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-champagne text-ink">{Icon.phone}</span>
                    <span className="flex-1">{room.phone}</span>
                    <span className="opacity-40 transition-transform group-hover:translate-x-1">{Icon.arrow}</span>
                  </a>
                </li>
                <li>
                  <a href={`mailto:${room.email}`} className="group flex items-center gap-3 py-3.5">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10">{Icon.mail}</span>
                    <span className="min-w-0 flex-1 truncate">{room.email}</span>
                    <span className="opacity-40 transition-transform group-hover:translate-x-1">{Icon.arrow}</span>
                  </a>
                </li>
                <li>
                  <a href={room.mapsUrl} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 py-3.5">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10">{Icon.pin}</span>
                    <span className="flex-1">
                      {room.street}, {room.suburb}
                    </span>
                    <span className="opacity-40 transition-transform group-hover:translate-x-1">{Icon.arrow}</span>
                  </a>
                </li>
                <li>
                  <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 py-3.5">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10">{Icon.insta}</span>
                    <span className="flex-1">{SITE.instagramHandle}</span>
                    <span className="opacity-40 transition-transform group-hover:translate-x-1">{Icon.arrow}</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- showrooms */}
      <section data-theme="light" className="bg-porcelain py-20 lg:py-28">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow text-stone">01 · Choose your showroom</p>
              <h2 className="display mt-4 text-[clamp(2.2rem,4.6vw,4rem)]">Visit, call or write.</h2>
            </div>
            <p className="max-w-sm text-[15px] text-stone">Pick a showroom and your enquiry is addressed straight to that team’s inbox.</p>
          </div>
          <div role="radiogroup" aria-label="Showroom for your enquiry" className="mt-12 grid gap-4 md:grid-cols-3">
            {SHOWROOMS.map((s, i) => {
              const on = city === s.id;
              return (
                <div
                  key={s.id}
                  className={`group relative flex flex-col overflow-hidden rounded-[4px] border bg-white transition-[border-color,box-shadow,transform] duration-500 ${on ? "border-ink shadow-[0_24px_60px_-28px_rgba(15,15,14,.45)]" : "border-hairline hover:-translate-y-1 hover:border-stone"}`}
                >
                  <button role="radio" aria-checked={on} onClick={() => setCity(s.id)} className="absolute inset-0 z-0" aria-label={`Send my enquiry to ${s.city}`} />
                  <div className="relative h-28 overflow-hidden bg-ink">
                    <img
                      src={asset(`/tex/${["calacatta-bianco", "black-matte", "woodline-02"][i]}.jpg`)}
                      alt=""
                      className="h-full w-full object-cover opacity-80 transition-transform duration-[1.2s] group-hover:scale-110"
                    />
                    <span className="absolute left-4 top-4 font-mono text-[12px] tracking-[0.2em] text-white mix-blend-difference">0{i + 1}</span>
                    {on && <span className="absolute right-4 top-4 rounded-full bg-champagne px-3 py-1 text-[12px] font-medium text-ink">Selected</span>}
                  </div>
                  <div className="pointer-events-none relative z-10 flex flex-1 flex-col p-6">
                    <p className="caption text-stone">{s.region}</p>
                    <p className="display mt-1 text-[34px] leading-none">{s.city}</p>
                    <ShowroomStatus city={s.id} className="mt-3 text-stone" />
                    <address className="mt-5 text-[15px] not-italic leading-relaxed">
                      {s.street}
                      <br />
                      {s.suburb}, {s.postcode}
                    </address>
                    <ul className="mt-4 space-y-0.5 text-[14px] text-stone">
                      {s.hoursText.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                    <div className="pointer-events-auto mt-6 space-y-1 border-t border-hairline pt-5 text-[15px]">
                      <a href={s.phoneHref} className="link-u flex items-center gap-2">
                        {Icon.phone} {s.phone}
                      </a>
                      <a href={`mailto:${s.email}`} className="link-u flex items-center gap-2 break-all">
                        {Icon.mail} {s.email}
                      </a>
                    </div>
                    <div className="pointer-events-auto mt-auto flex gap-2 pt-6">
                      <a href={s.mapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-line !min-h-10 flex-1 !px-3 !text-[14px]">
                        Directions
                      </a>
                      <button
                        onClick={() => {
                          setCity(s.id);
                          toForm();
                        }}
                        className={`btn !min-h-10 flex-1 !px-3 !text-[14px] ${on ? "btn-ink" : "btn-line"}`}
                      >
                        Enquire
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- form */}
      <section id="contact-form" data-theme="light" className="scroll-mt-[var(--nav-h)] border-t border-hairline bg-[#f7f5f1] py-20 lg:py-28">
        <div className="container-x grid gap-14 lg:grid-cols-12">
          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-[calc(var(--nav-h)+2rem)]">
              <p className="eyebrow text-stone">02 · {mode === "enquiry" ? "Send an enquiry" : "Order form"}</p>
              <h2 className="display mt-4 text-[clamp(2.2rem,4vw,3.4rem)] leading-[1]">{mode === "enquiry" ? "Tell us about your project." : "Request an order."}</h2>
              <div className="mt-8 rounded-[4px] border border-hairline bg-white p-5">
                <p className="caption text-stone">Sending to</p>
                <p className="display mt-1 text-[26px]">{room.city} showroom</p>
                <p className="mt-1 break-all text-[14px] text-stone">{room.email}</p>
                <ShowroomStatus city={city} className="mt-3 text-stone" />
              </div>
              <ol className="mt-8 space-y-5 text-[15px]">
                {(mode === "enquiry"
                  ? [`Your message goes to the ${room.city} team’s inbox.`, "They get back to you by email or phone.", "Visit the showroom or order a Sample Box to see the boards."]
                  : [`Your order request goes to the ${room.city} team.`, "They confirm availability, processing and delivery with you.", "Collect from the showroom or have it delivered."]
                ).map((t, i) => (
                  <li key={t} className="flex gap-4">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-ink font-mono text-[12px]">{i + 1}</span>
                    <span className="pt-0.5 text-ink/80">{t}</span>
                  </li>
                ))}
              </ol>
            </div>
          </aside>

          <div className="lg:col-span-7 lg:col-start-6">
            <div className="rounded-[6px] border border-hairline bg-white p-6 shadow-[0_30px_80px_-50px_rgba(15,15,14,.35)] sm:p-10">
              <div role="tablist" aria-label="Form type" className="mb-10 grid grid-cols-2 gap-1 rounded-full bg-[#f1eee8] p-1">
                {(["enquiry", "order"] as const).map((m) => (
                  <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`h-11 rounded-full text-[14px] transition-colors ${mode === m ? "bg-ink text-porcelain" : "text-ink/70 hover:text-ink"}`}>
                    {m === "enquiry" ? "Enquiry" : "Order form"}
                  </button>
                ))}
              </div>
              {pre.extra.scheme && (
                <div className="mb-8 rounded-[3px] border border-champagne/60 bg-[#fbf7e6] p-4 text-[15px]">
                  <p className="eyebrow text-champagne">Attached Studio scheme</p>
                  <p className="mt-2">{pre.extra.scheme}</p>
                </div>
              )}
              {ready &&
                (mode === "enquiry" ? (
                  <EnquiryForm
                    key="enq"
                    kind="Website enquiry"
                    city={city}
                    onCityChange={setCity}
                    defaults={{ message: pre.message }}
                    extra={pre.extra}
                    submitLabel="Send enquiry"
                    fields={[
                      { name: "name", label: "Full name", type: "text", required: true, autoComplete: "name" },
                      { name: "email", label: "Email", type: "email", required: true, autoComplete: "email" },
                      { name: "phone", label: "Phone", type: "tel", autoComplete: "tel" },
                      { name: "company", label: "Company (optional)", type: "text", autoComplete: "organization" },
                      { name: "message", label: "Message", type: "textarea", required: true },
                    ]}
                  />
                ) : (
                  <EnquiryForm
                    key="ord"
                    kind="Order form"
                    city={city}
                    onCityChange={setCity}
                    defaults={{ items: pre.message }}
                    extra={pre.extra}
                    submitLabel="Submit order request"
                    successTitle="Order request received."
                    fields={[
                      { name: "company", label: "Company", type: "text", required: true, autoComplete: "organization" },
                      { name: "name", label: "Contact person", type: "text", required: true, autoComplete: "name" },
                      { name: "email", label: "Email", type: "email", required: true, autoComplete: "email" },
                      { name: "phone", label: "Phone", type: "tel", required: true, autoComplete: "tel" },
                      { name: "project", label: "Project reference", type: "text" },
                      { name: "services", label: "Processing needed", type: "select", options: ["Boards only", "Cutting & edging", "Door & panel processing", "Build-ups", "CNC routing", "Not sure yet"] },
                      { name: "items", label: "Finishes, quantities and notes", type: "textarea", required: true },
                      { name: "delivery", label: "Delivery or collection", type: "select", options: ["Delivery", "Collect from showroom"] },
                    ]}
                  />
                ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- other ways */}
      <section data-theme="light" className="bg-porcelain py-20 lg:py-24">
        <div className="container-x">
          <p className="eyebrow text-stone">03 · Other ways to start</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { t: "Order a Sample Box", d: "Hold the real boards before you choose.", href: "/sample-box/", img: "/swatch/champagne-metal.webp" },
              { t: "Design it in the Studio", d: "Try every finish on a full kitchen in 3D.", href: "/studio/", img: "/swatch/calacatta-bianco.webp" },
              { t: "Browse the catalogue", d: "Flip through the product catalogue.", href: "/catalogue/", img: "/swatch/nogal-rosales-02.webp" },
              { t: "Ask Unipanel", d: "Quick answers about finishes and showrooms.", concierge: true, img: "/swatch/oxid-nero-real-stone.webp" },
            ].map((c) => {
              const inner = (
                <>
                  <div className="relative h-40 overflow-hidden">
                    <img src={asset(c.img)} alt="" className="h-full w-full scale-125 object-cover transition-transform duration-[1.2s] group-hover:scale-[1.4]" />
                  </div>
                  <div className="flex flex-1 items-end justify-between gap-4 p-5">
                    <div>
                      <p className="display text-[22px] leading-tight">{c.t}</p>
                      <p className="mt-1 text-[14px] text-stone">{c.d}</p>
                    </div>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-hairline transition-colors group-hover:border-ink group-hover:bg-ink group-hover:text-porcelain">{Icon.arrow}</span>
                  </div>
                </>
              );
              const cls = "group flex flex-col overflow-hidden rounded-[4px] border border-hairline bg-white text-left transition-transform duration-500 hover:-translate-y-1";
              return c.concierge ? (
                <button key={c.t} onClick={() => window.dispatchEvent(new CustomEvent("unipanel:concierge"))} className={cls}>
                  {inner}
                </button>
              ) : (
                <Link key={c.t} href={c.href!} className={cls}>
                  {inner}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <style>{`
        .contact-zoom{animation:contact-zoom 22s ease-in-out infinite alternate}
        @keyframes contact-zoom{from{transform:scale(1.04)}to{transform:scale(1.16)}}
        @media (prefers-reduced-motion: reduce){.contact-zoom{animation:none}}
      `}</style>
    </>
  );
}
