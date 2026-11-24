"use client";
import { useEffect, useState } from "react";
import { SHOWROOMS, type CityId } from "@/lib/site";
import { EnquiryForm } from "@/components/ui/EnquiryForm";
import { ShowroomStatus } from "@/components/ui/ShowroomStatus";
import { decodeScheme, usedFinishes, SCENE_LABEL } from "@/lib/studio/scheme";
import { finishById, finishLabel } from "@/data/catalogue";

/** General enquiry or order form, routed by city to the right showroom email. Prefills from the Studio, a finish page or the concierge. */
export function ContactPage() {
  const [mode, setMode] = useState<"enquiry" | "order">("enquiry");
  const [pre, setPre] = useState<{ city: CityId; message: string; extra: Record<string, string> }>({ city: "jhb", message: "", extra: {} });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const u = new URL(window.location.href);
    const type = u.searchParams.get("type");
    if (type === "order") setMode("order");
    const city = (u.searchParams.get("city") as CityId) || "jhb";
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
    setPre({ city: ["jhb", "cpt", "dbn"].includes(city) ? city : "jhb", message, extra });
    setReady(true);
  }, []);

  return (
    <>
      <section data-theme="light" className="container-x pb-16 pt-[calc(var(--nav-h)+8vh)]">
        <p className="eyebrow text-stone">Contact · Order form</p>
        <h1 className="display mt-6 text-[clamp(3.2rem,9vw,9rem)]">
          Let’s talk
          <br />
          <em className="display-italic">surfaces.</em>
        </h1>
      </section>
      <section data-theme="light" className="pb-28">
        <div className="container-x grid gap-14 lg:grid-cols-12">
          <aside className="space-y-8 lg:col-span-4">
            {SHOWROOMS.map((s) => (
              <div key={s.id} className="border-t border-hairline pt-5">
                <p className="display text-[28px]">{s.city}</p>
                <ShowroomStatus city={s.id} className="mt-1 text-stone" />
                <a href={s.phoneHref} className="link-u mt-3 block text-[15px]">
                  {s.phone}
                </a>
                <a href={`mailto:${s.email}`} className="link-u block text-[15px]">
                  {s.email}
                </a>
              </div>
            ))}
          </aside>
          <div className="lg:col-span-7 lg:col-start-6">
            <div role="tablist" aria-label="Form type" className="mb-10 flex gap-1.5">
              {(["enquiry", "order"] as const).map((m) => (
                <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`h-10 rounded-full px-4 text-[14px] ${mode === m ? "bg-ink text-porcelain" : "border border-hairline"}`}>
                  {m === "enquiry" ? "Enquiry" : "Order form"}
                </button>
              ))}
            </div>
            {pre.extra.scheme && (
              <div className="mb-8 rounded-[3px] border border-hairline p-4 text-[15px]">
                <p className="eyebrow text-stone">Attached Studio scheme</p>
                <p className="mt-2">{pre.extra.scheme}</p>
              </div>
            )}
            {ready &&
              (mode === "enquiry" ? (
                <EnquiryForm
                  key="enq"
                  kind="Website enquiry"
                  defaultCity={pre.city}
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
                  defaultCity={pre.city}
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
      </section>
    </>
  );
}
