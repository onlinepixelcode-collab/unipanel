"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { finishById, finishLabel } from "@/data/catalogue";
import { COLLECTIONS } from "@/data/collections";
import { CARE, careFor } from "@/data/care";
import { useSampleBox, SAMPLE_LIMIT } from "@/lib/store/sampleBox";
import { hasWebGL } from "@/components/three/quality";

const SwatchViewer = dynamic(() => import("./SwatchViewer"), { ssr: false });

export function FinishDetail({ id }: { id: string }) {
  const f = finishById(id)!;
  const colls = f.collections.map((c) => COLLECTIONS.find((x) => x.id === c)!);
  const care = CARE[careFor(f.kind)];
  const [gl, setGl] = useState(true);
  const [grain, setGrain] = useState<"v" | "h">("v");
  const [view, setView] = useState<"3d" | "render">("3d");
  const add = useSampleBox((s) => s.add);
  const count = useSampleBox((s) => s.ids.length);
  const has = useSampleBox((s) => s.ids.includes(f.id));
  const [msg, setMsg] = useState("");
  useEffect(() => {
    setGl(hasWebGL());
    useSampleBox.persist.rehydrate();
  }, []);

  const onAdd = () => {
    const r = add(f.id);
    setMsg(r.skipped.length ? `Your Sample Box is full (${SAMPLE_LIMIT}). Remove one to add ${f.name}.` : `${f.name} added to your Sample Box.`);
  };

  return (
    <>
      <section data-theme="dark" className="section-dark relative pt-[var(--nav-h)]">
        <div className="grid min-h-[calc(100svh-var(--nav-h))] lg:grid-cols-12">
          <div className="relative h-[62svh] lg:col-span-7 lg:h-auto">
            {gl && view === "3d" ? <SwatchViewer id={f.id} grain={grain} /> : <img src={f.textures.swatch} alt={`${f.name} door render`} className="h-full w-full object-contain p-8" />}
            <div className="absolute left-4 top-4 flex gap-1.5">
              {gl && (
                <>
                  <button onClick={() => setView("3d")} aria-pressed={view === "3d"} className={`h-9 rounded-full px-3.5 text-[13px] ${view === "3d" ? "bg-porcelain text-ink" : "border border-white/20"}`}>
                    3D sample
                  </button>
                  <button onClick={() => setView("render")} aria-pressed={view === "render"} className={`h-9 rounded-full px-3.5 text-[13px] ${view === "render" ? "bg-porcelain text-ink" : "border border-white/20"}`}>
                    Product render
                  </button>
                </>
              )}
              {(f.kind === "wood" || f.kind.startsWith("marble") || f.kind === "metal") && view === "3d" && (
                <button onClick={() => setGrain(grain === "v" ? "h" : "v")} className="h-9 rounded-full border border-white/20 px-3.5 text-[13px]">
                  Grain {grain === "v" ? "vertical" : "horizontal"}
                </button>
              )}
            </div>
            {view === "3d" && <p className="caption pointer-events-none absolute bottom-4 left-4 text-stone-light">Drag to turn · move the pointer to rake the light across the surface</p>}
          </div>
          <div className="flex flex-col justify-center gap-8 px-[var(--gutter)] py-14 lg:col-span-5 lg:pl-10">
            <nav aria-label="Breadcrumb" className="caption text-stone-light">
              <Link href="/collections/" className="link-u">
                Collections
              </Link>{" "}
              /{" "}
              <Link href={`/collections/${colls[0].id}/`} className="link-u">
                {colls[0].name}
              </Link>
            </nav>
            <div>
              <h1 className="display text-[clamp(3rem,6vw,5.6rem)]">{f.name}</h1>
              <span className="spec-tag mt-6 text-porcelain">
                <span>{f.code ?? colls[0].name}</span>
                <span>{f.category}</span>
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-hairline-dark pt-6 text-[15px]">
              <div>
                <dt className="eyebrow text-stone-light">Collection</dt>
                <dd className="mt-1.5">
                  {colls.map((c, i) => (
                    <span key={c.id}>
                      {i > 0 && ", "}
                      <Link href={`/collections/${c.id}/`} className="link-u">
                        {c.name}
                      </Link>
                    </span>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="eyebrow text-stone-light">Tone</dt>
                <dd className="mt-1.5 capitalize">{f.tones.join(", ")}</dd>
              </div>
              <div>
                <dt className="eyebrow text-stone-light">Applications</dt>
                <dd className="mt-1.5">Kitchen doors, panels, wardrobes, interiors</dd>
              </div>
              <div>
                <dt className="eyebrow text-stone-light">Specification</dt>
                <dd className="mt-1.5">Sizes, thickness and pricing on request</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <Link href={`/studio/?finish=${f.id}&zone=baseDoors`} className="btn btn-light">
                See it in a kitchen
              </Link>
              <button onClick={onAdd} disabled={has} className="btn btn-line text-porcelain disabled:opacity-60">
                <span>{has ? "In your Sample Box" : `Add to Sample Box (${count}/${SAMPLE_LIMIT})`}</span>
              </button>
              <Link href={`/contact/?finish=${f.id}`} className="btn btn-line text-porcelain">
                <span>Enquire</span>
              </Link>
            </div>
            <p role="status" className="caption min-h-[1.2em] text-champagne">
              {msg}
            </p>
          </div>
        </div>
      </section>

      <section data-theme="light" className="py-24">
        <div className="container-x grid-12 gap-y-14">
          <div className="col-span-12 lg:col-span-7">
            <p className="eyebrow text-stone">Pairs beautifully with</p>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {f.pairsWith.map((pid) => {
                const p = finishById(pid)!;
                return (
                  <Link key={pid} href={`/finishes/${pid}/`} className="group">
                    <div className="aspect-[3/4] overflow-hidden rounded-[3px] bg-black">
                      <img src={p.textures.swatch} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                    </div>
                    <p className="mt-2 text-[15px]">{p.name}</p>
                    <p className="font-mono text-[13px] text-stone">{p.code ?? p.category}</p>
                  </Link>
                );
              })}
            </div>
            <Link href={`/studio/?finish=${f.id}&zone=baseDoors`} className="link-u mt-6 inline-block text-[15px]">
              Try {finishLabel(f)} with these in the Studio
            </Link>
          </div>
          <div className="col-span-12 lg:col-span-4 lg:col-start-9">
            <p className="eyebrow text-stone">Care · {care.title}</p>
            <ol className="mt-6 space-y-3 text-[15px]">
              {care.steps.map((s, i) => (
                <li key={i} className="flex gap-3 border-t border-hairline pt-3">
                  <span className="font-mono text-[13px] text-stone">0{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
            <p className="caption mt-4 text-stone">An all-inclusive cleaning solution is available for each product. Ask your showroom for the right one.</p>
            <Link href="/care/" className="link-u mt-3 inline-block text-[15px]">
              Full care guide
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
