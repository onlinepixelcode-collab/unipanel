"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSampleBox, SAMPLE_LIMIT } from "@/lib/store/sampleBox";
import { finishById, searchFinishes, finishLabel } from "@/data/catalogue";
import { COLLECTIONS } from "@/data/collections";
import type { CollectionId } from "@/data/types";
import { EnquiryForm } from "@/components/ui/EnquiryForm";
import { SampleTray } from "@/components/ui/SampleTray";

/** Drag (or tap) finishes into a 3D box; trade form for free delivery to the office. */
export function SampleBoxPage() {
  const { ids, add, remove, clear } = useSampleBox();
  const [q, setQ] = useState("");
  const [col, setCol] = useState<CollectionId | "all">("all");
  const [over, setOver] = useState(false);
  const [note, setNote] = useState("");
  useEffect(() => {
    useSampleBox.persist.rehydrate();
  }, []);
  const list = useMemo(() => searchFinishes(q, { collection: col }), [q, col]);
  const full = ids.length >= SAMPLE_LIMIT;

  const put = (id: string) => {
    const r = add(id);
    setNote(r.skipped.length ? `The box holds ${SAMPLE_LIMIT}. Remove one to make room.` : r.added.length ? `${finishById(id)!.name} added.` : "");
  };

  return (
    <>
      <section data-theme="dark" className="section-dark pb-20 pt-[calc(var(--nav-h)+8vh)]">
        <div className="container-x grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="eyebrow text-champagne">Sample Box · free for trade</p>
            <h1 className="display mt-6 text-[clamp(3.2rem,7vw,7rem)]">
              Hold it
              <br />
              <em className="display-italic">before you choose.</em>
            </h1>
            <p className="lede mt-8 max-w-md text-porcelain/75">Free sample boxes for interior designers, architects and manufacturers, delivered to your office. Choose up to {SAMPLE_LIMIT} finishes.</p>
            <p role="status" className="caption mt-6 min-h-[1.3em] text-champagne">
              {note}
            </p>
          </div>
          {/* the box */}
          <div
            className={`relative flex min-h-[420px] items-center justify-center rounded-[4px] transition-colors lg:col-span-7 ${over ? "bg-white/[.06]" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              const id = e.dataTransfer.getData("text/plain");
              if (finishById(id)) put(id);
            }}
            aria-label="Your Sample Box. Drop finishes here."
            
          >
            <SampleTray ids={ids} animate={false} label={false} className="max-w-[640px] [--tray-scale:0.6] sm:[--tray-scale:0.85] lg:[--tray-scale:0.95]" />
            {!ids.length && <p className="caption absolute bottom-6 text-stone-light">Drag finishes here, or tap “Add” below.</p>}
            <p className="absolute right-4 top-4 font-mono text-[13px] text-stone-light">
              {ids.length}/{SAMPLE_LIMIT}
            </p>
          </div>
        </div>
        {ids.length > 0 && (
          <div className="container-x mt-10">
            <ul className="flex flex-wrap gap-2">
              {ids.map((id) => {
                const f = finishById(id)!;
                return (
                  <li key={id} className="flex items-center gap-2 rounded-full border border-white/15 py-1 pl-1 pr-2">
                    <span className="h-8 w-8 overflow-hidden rounded-full" style={{ background: f.hex }}>
                      {!f.flat && <img src={f.textures.thumb} alt="" className="h-full w-full object-cover" />}
                    </span>
                    <span className="text-[14px]">{finishLabel(f)}</span>
                    <button onClick={() => remove(id)} className="caption ml-1 text-stone-light hover:text-porcelain" aria-label={`Remove ${f.name}`}>
                      Remove
                    </button>
                  </li>
                );
              })}
              <li>
                <button onClick={clear} className="caption h-10 px-3 text-stone-light hover:text-porcelain">
                  Empty box
                </button>
              </li>
            </ul>
          </div>
        )}
      </section>

      <section data-theme="light" className="py-20">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="display text-[clamp(2rem,4vw,3.4rem)]">Choose finishes</h2>
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="sb-q" className="sr-only">
                Search
              </label>
              <input id="sb-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or code" className="h-11 rounded-full border border-hairline bg-transparent px-4 text-[15px] focus:border-ink focus:outline-none" />
              <label htmlFor="sb-c" className="sr-only">
                Collection
              </label>
              <select id="sb-c" value={col} onChange={(e) => setCol(e.target.value as CollectionId | "all")} className="h-11 rounded-full border border-hairline bg-transparent px-3 text-[14px]">
                <option value="all">All collections</option>
                {COLLECTIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <ul className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
            {list.map((f) => {
              const inBox = ids.includes(f.id);
              return (
                <li key={f.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", f.id)} className="cursor-grab active:cursor-grabbing">
                  <div className="aspect-[3/4] overflow-hidden rounded-[3px]" style={{ background: f.hex }} data-loupe={f.textures.tex}>
                    {!f.flat && <img src={f.textures.thumb} alt="" loading="lazy" className="pointer-events-none h-full w-full object-cover" />}
                  </div>
                  <p className="mt-1.5 truncate text-[14px]">{f.name}</p>
                  <p className="truncate font-mono text-[13px] text-stone">{f.code ?? f.category}</p>
                  <button onClick={() => (inBox ? remove(f.id) : put(f.id))} disabled={!inBox && full} className="caption mt-1 underline underline-offset-4 disabled:opacity-40">
                    {inBox ? "Remove" : "Add"}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section data-theme="dark" id="request" className="section-dark py-24">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 className="display text-[clamp(2.4rem,4.4vw,4rem)]">Request delivery</h2>
            <p className="mt-4 text-porcelain/75">For interior designers, architects and manufacturers. We’ll confirm the box with you before it goes out.</p>
            <Link href="/studio/" className="link-u mt-6 inline-block text-[15px]">
              Build a scheme in the Studio first
            </Link>
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            {ids.length === 0 ? (
              <p className="text-porcelain/75">Add at least one finish to your box to request it.</p>
            ) : (
              <EnquiryForm
                kind="Sample Box request"
                dark
                submitLabel="Request my Sample Box"
                successTitle="Your box is on its way to us."
                extra={{ samples: ids.map((id) => finishLabel(finishById(id)!)).join(", ") }}
                fields={[
                  { name: "name", label: "Full name", type: "text", required: true, autoComplete: "name" },
                  { name: "company", label: "Company", type: "text", required: true, autoComplete: "organization" },
                  { name: "role", label: "Role", type: "select", options: ["Interior designer", "Architect", "Manufacturer"], required: true },
                  { name: "email", label: "Email", type: "email", required: true, autoComplete: "email" },
                  { name: "phone", label: "Phone", type: "tel", required: true, autoComplete: "tel" },
                  { name: "address", label: "Office delivery address", type: "textarea", required: true },
                ]}
              />
            )}
          </div>
        </div>
      </section>
    </>
  );
}
