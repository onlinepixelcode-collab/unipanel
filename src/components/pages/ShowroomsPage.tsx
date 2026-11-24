"use client";
import { useEffect, useState } from "react";
import { SHOWROOMS, type CityId } from "@/lib/site";
import { asset } from "@/lib/asset";
import { ShowroomStatus } from "@/components/ui/ShowroomStatus";
import { EnquiryForm } from "@/components/ui/EnquiryForm";

const BACKDROP: Record<CityId, string> = { jhb: "oxid-nero-real-stone", cpt: "satin-kashmir-glass", dbn: "nogal-rosales-02" };

export function ShowroomsPage() {
  const [prefill, setPrefill] = useState<{ city: CityId; date?: string; note?: string } | null>(null);
  useEffect(() => {
    const u = new URL(window.location.href);
    const c = u.searchParams.get("book") as CityId | null;
    if (c && ["jhb", "cpt", "dbn"].includes(c)) setPrefill({ city: c, date: u.searchParams.get("date") ?? undefined, note: u.searchParams.get("note") ?? undefined });
  }, []);

  return (
    <>
      <section data-theme="light" className="container-x pb-12 pt-[calc(var(--nav-h)+8vh)]">
        <p className="eyebrow text-stone">Showrooms</p>
        <h1 className="display mt-6 text-[clamp(3.2rem,9vw,9rem)]">
          Three cities.
          <br />
          <em className="display-italic">One standard.</em>
        </h1>
      </section>
      {SHOWROOMS.map((s, i) => (
        <section key={s.id} id={s.id} data-theme="dark" className="section-dark relative min-h-[88svh] overflow-hidden">
          <img src={asset(`/tex/${BACKDROP[s.id]}.jpg`)} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-45" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/20" />
          <div className="container-x relative flex min-h-[88svh] flex-col justify-end py-16">
            <p className="font-mono text-[13px] text-champagne">0{i + 1} · {s.region}</p>
            <h2 className="display mt-3 text-[clamp(3.6rem,11vw,11rem)]">{s.city}</h2>
            <ShowroomStatus city={s.id} className="mt-2 text-porcelain/80" />
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              <address className="not-italic text-[17px]">
                {s.street}
                <br />
                {s.suburb}
                <br />
                {s.postcode}
              </address>
              <ul className="space-y-1 text-[15px] text-porcelain/80">
                {s.hoursText.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
              <div className="flex flex-wrap content-start gap-2">
                <a href={s.phoneHref} className="btn btn-light !min-h-11">
                  Call {s.phone}
                </a>
                <a href={`mailto:${s.email}`} className="btn btn-line !min-h-11 text-porcelain">
                  <span>{s.email}</span>
                </a>
                <a href={s.mapsUrl} target="_blank" rel="noopener" className="btn btn-line !min-h-11 text-porcelain">
                  <span>Directions</span>
                </a>
                <a href={`?book=${s.id}#book`} onClick={() => setPrefill({ city: s.id })} className="btn btn-line !min-h-11 text-porcelain">
                  <span>Book a visit</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      ))}
      <section id="book" data-theme="light" className="py-24">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 className="display text-[clamp(2.4rem,4.4vw,4rem)]">Book a visit</h2>
            <p className="mt-4 text-stone">Tell us when suits you and what you’re working on. The showroom will confirm a time.</p>
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <EnquiryForm
              key={prefill?.city ?? "none"}
              kind="Showroom visit"
              defaultCity={prefill?.city ?? "jhb"}
              defaults={{ date: prefill?.date ?? "", message: prefill?.note ?? "" }}
              submitLabel="Request a visit"
              successTitle="See you soon."
              fields={[
                { name: "name", label: "Full name", type: "text", required: true, autoComplete: "name" },
                { name: "email", label: "Email", type: "email", required: true, autoComplete: "email" },
                { name: "phone", label: "Phone", type: "tel", required: true, autoComplete: "tel" },
                { name: "date", label: "Preferred date", type: "date" },
                { name: "message", label: "What are you working on?", type: "textarea" },
              ]}
            />
          </div>
        </div>
      </section>
    </>
  );
}
