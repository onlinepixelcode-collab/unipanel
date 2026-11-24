"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { asset } from "@/lib/asset";
import { finishById } from "@/data/catalogue";
import { SITE } from "@/lib/site";

/**
 * Real project and stand photography from unipanelsa.co.za. Finish tags appear only where
 * the source names the finish; untagged images say so rather than guessing.
 */
const SPACES: { src: string; title: string; tags: string[]; w: "wide" | "tall" | "square" }[] = [
  { src: "ambiente-cocina-titan-01-y-titan-03-min-scaled-1", title: "Kitchen in Titan", tags: ["titan-01"], w: "wide" },
  { src: "ALVIC-Hermosilla-77_Zenit-Metal-Plus-Kitchen-min-scaled-1", title: "Metal-front kitchen", tags: [], w: "tall" },
  { src: "ambiente-bano-Titan-01-y-Titan-02-min-scaled-1", title: "Bathroom in Titan 01 and Titan 02", tags: ["titan-01", "titan-02"], w: "wide" },
  { src: "2-1", title: "Open-plan kitchen", tags: [], w: "wide" },
  { src: "ALVIC-Hermosilla-77-035-min", title: "Kitchen detail", tags: [], w: "tall" },
  { src: "Alvic_Zenit-metal-plus-champagne-gold-light-min", title: "Champagne-toned metal fronts", tags: [], w: "wide" },
  { src: "1A", title: "Contemporary kitchen", tags: [], w: "wide" },
  { src: "ALVIC-Hermosilla-77-038-min", title: "Cabinetry detail", tags: [], w: "tall" },
  { src: "1-1", title: "Living space", tags: [], w: "wide" },
  { src: "12", title: "Interior project", tags: [], w: "square" },
  { src: "decorex2019stand-2", title: "UnipanelSA at Decorex", tags: [], w: "wide" },
  { src: "decorex2019stand-4", title: "UnipanelSA at Decorex", tags: [], w: "tall" },
];

type VTDoc = Document & { startViewTransition?: (cb: () => void) => void };

export function Spaces() {
  const [open, setOpen] = useState<number | null>(null);
  const go = (i: number | null) => {
    const d = document as VTDoc;
    if (d.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) d.startViewTransition(() => flushSync(() => setOpen(i)));
    else setOpen(i);
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (open === null) return;
      if (e.key === "Escape") go(null);
      if (e.key === "ArrowRight") go((open + 1) % SPACES.length);
      if (e.key === "ArrowLeft") go((open - 1 + SPACES.length) % SPACES.length);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  return (
    <>
      <section data-theme="light" className="container-x pb-14 pt-[calc(var(--nav-h)+8vh)]">
        <p className="eyebrow text-stone">Inspiration · Spaces</p>
        <h1 className="display mt-6 text-[clamp(3.2rem,9vw,9rem)]">
          Rooms made
          <br />
          <em className="display-italic">of surfaces.</em>
        </h1>
        <p className="lede mt-8 max-w-xl text-stone">
          Projects and stands from our archive. Where a finish is named, tap it to open it in the Studio. More on Instagram{" "}
          <a href={SITE.instagram} className="link-u text-ink" target="_blank" rel="noopener">
            {SITE.instagramHandle}
          </a>
          .
        </p>
      </section>
      <section data-theme="light" className="container-x pb-32">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          {SPACES.map((s, i) => (
            <figure key={s.src + i} className={s.w === "wide" ? "col-span-2 md:col-span-4" : s.w === "tall" ? "col-span-1 md:col-span-2 md:row-span-2" : "col-span-1 md:col-span-2"} data-reveal style={{ ["--d" as string]: `${(i % 3) * 80}ms` }}>
              <button onClick={() => go(i)} className="group block h-full w-full overflow-hidden rounded-[3px] bg-hairline" aria-label={`Open ${s.title}`}>
                <img
                  src={asset(`/inspiration/${s.src}.webp`)}
                  alt={s.title}
                  loading="lazy"
                  className={`h-full w-full object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.03] ${s.w === "wide" ? "aspect-[16/9]" : s.w === "tall" ? "aspect-[3/4] md:aspect-auto" : "aspect-square"}`}
                  style={{ viewTransitionName: open === null ? `space-${i}` : undefined }}
                />
              </button>
              <figcaption className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-[15px]">{s.title}</span>
                {s.tags.map((t) => (
                  <Link key={t} href={`/studio/?finish=${t}&zone=baseDoors`} className="spec-tag !text-[13px] hover:bg-ink hover:text-porcelain">
                    <span>{finishById(t)?.name}</span>
                  </Link>
                ))}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
      {open !== null && (
        <div role="dialog" aria-modal="true" aria-label={SPACES[open].title} className="fixed inset-0 z-[80] flex flex-col bg-ink/95 text-porcelain backdrop-blur" onClick={() => go(null)}>
          <div className="container-x flex h-[var(--nav-h)] items-center justify-between" onClick={(e) => e.stopPropagation()}>
            <p className="text-[15px]">
              {SPACES[open].title} <span className="font-mono text-stone-light">{open + 1}/{SPACES.length}</span>
            </p>
            <div className="flex gap-2">
              <button className="h-10 rounded-full px-4 text-[13px] hover:bg-white/10" onClick={() => go((open - 1 + SPACES.length) % SPACES.length)}>
                Previous
              </button>
              <button className="h-10 rounded-full px-4 text-[13px] hover:bg-white/10" onClick={() => go((open + 1) % SPACES.length)}>
                Next
              </button>
              <button className="h-10 rounded-full px-4 text-[13px] hover:bg-white/10" onClick={() => go(null)} autoFocus>
                Close
              </button>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center p-4">
            <img src={asset(`/inspiration/${SPACES[open].src}.webp`)} alt={SPACES[open].title} className="max-h-full max-w-full object-contain" style={{ viewTransitionName: `space-${open}` }} />
          </div>
          {!SPACES[open].tags.length && <p className="caption pb-6 text-center text-stone-light">Ask a showroom which finishes were used in this space.</p>}
        </div>
      )}
    </>
  );
}
