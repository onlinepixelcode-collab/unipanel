"use client";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { COLLECTIONS } from "@/data/collections";
import { finishById, finishesIn, searchFinishes, FINISH_COUNT } from "@/data/catalogue";
import type { CollectionId, Tone } from "@/data/types";
import { useReducedMotion, useSectionProgress } from "@/lib/hooks/useSectionProgress";
import { SwatchCard } from "./SwatchCard";

const TONES: (Tone | "all")[] = ["all", "light", "mid", "dark", "warm", "cool"];

/** The Archive: collections as museum rooms on a horizontal track; filters and search switch to a results wall. */
export function Archive() {
  const [q, setQ] = useState("");
  const [col, setCol] = useState<CollectionId | "all">("all");
  const [tone, setTone] = useState<Tone | "all">("all");
  const filtering = q.trim() !== "" || col !== "all" || tone !== "all";
  const results = useMemo(() => searchFinishes(q, { collection: col, tone }), [q, col, tone]);
  const track = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { value } = useSectionProgress(track, { state: true });

  return (
    <>
      <section data-theme="light" className="container-x pb-10 pt-[calc(var(--nav-h)+8vh)]">
        <p className="eyebrow text-stone">The Archive · {FINISH_COUNT} finishes</p>
        <h1 className="display mt-6 text-[clamp(3.2rem,9vw,9rem)]">
          Every surface,
          <br />
          <em className="display-italic">catalogued.</em>
        </h1>
        <div className="mt-12 grid gap-4 border-t border-hairline pt-6 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <label htmlFor="archive-search" className="eyebrow text-stone">
              Search name or code
            </label>
            <input id="archive-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Calacatta, 8102, leather" className="mt-2 h-12 w-full border-b border-hairline bg-transparent text-[20px] placeholder:text-stone-light focus:border-ink focus:outline-none" />
          </div>
          <div className="lg:col-span-5">
            <p className="eyebrow text-stone">Collection</p>
            <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Filter by collection">
              {(["all", ...COLLECTIONS.map((c) => c.id)] as (CollectionId | "all")[]).map((c) => (
                <button key={c} onClick={() => setCol(c)} aria-pressed={col === c} className={`h-9 rounded-full px-3.5 text-[13px] transition-colors ${col === c ? "bg-ink text-porcelain" : "border border-hairline hover:border-ink"}`}>
                  {c === "all" ? "All" : COLLECTIONS.find((x) => x.id === c)!.name.replace("Premium Italian Range", "Italian")}
                </button>
              ))}
            </div>
          </div>
          <div className="lg:col-span-3">
            <p className="eyebrow text-stone">Tone</p>
            <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Filter by tone">
              {TONES.map((t) => (
                <button key={t} onClick={() => setTone(t)} aria-pressed={tone === t} className={`h-9 rounded-full px-3.5 text-[13px] capitalize transition-colors ${tone === t ? "bg-ink text-porcelain" : "border border-hairline hover:border-ink"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {filtering ? (
        <section data-theme="light" className="container-x pb-32" aria-live="polite">
          <p className="caption mb-8 text-stone">
            {results.length} finish{results.length === 1 ? "" : "es"}
            {filtering && (
              <button
                className="link-u ml-4 text-ink"
                onClick={() => {
                  setQ("");
                  setCol("all");
                  setTone("all");
                }}
              >
                Clear filters
              </button>
            )}
          </p>
          {results.length ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 xl:grid-cols-4">
              {results.map((f, i) => (
                <SwatchCard key={f.id} f={f} index={i} />
              ))}
            </div>
          ) : (
            <p className="display text-[36px]">Nothing by that name. Try a code, or a collection.</p>
          )}
        </section>
      ) : (
        <section ref={track} data-theme="dark" className="section-dark relative" style={{ height: reduced ? "auto" : `${COLLECTIONS.length * 70 + 100}svh` }} aria-label="Collections">
          <div className={reduced ? "" : "sticky top-0 flex h-[100svh] items-center overflow-hidden max-md:static max-md:h-auto"}>
            <ol
              className="flex gap-[3vw] px-[var(--gutter)] max-md:flex-col max-md:py-20 md:w-max md:will-change-transform"
              style={reduced ? undefined : { transform: `translate3d(calc(${-value} * (100% - 100vw)), 0, 0)` }}
            >
              {COLLECTIONS.map((c) => {
                const cover = finishById(c.cover)!;
                const list = finishesIn(c.id);
                return (
                  <li key={c.id} className="w-[min(78vw,640px)] shrink-0 max-md:w-full">
                    <Link href={`/collections/${c.id}/`} className="group block">
                      <div className="relative h-[62svh] overflow-hidden rounded-[3px] max-md:h-[52svh]" data-loupe={cover.textures.tex} style={{ background: cover.hex }}>
                        <img src={cover.flat ? cover.textures.swatch : cover.textures.tex} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        <div className="absolute left-5 top-5 font-mono text-[13px] text-porcelain/80">Room {c.no}</div>
                        <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
                          <h2 className="display text-[clamp(2.2rem,4vw,3.6rem)] text-porcelain">{c.name}</h2>
                          <span className="caption text-porcelain/80">{list.length} finishes</span>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-1">
                        {list.slice(0, 8).map((f) => (
                          <span key={f.id} className="h-8 flex-1 overflow-hidden rounded-[2px]" style={{ background: f.hex }} title={f.name}>
                            {!f.flat && <img src={f.textures.thumb} alt="" className="h-full w-full object-cover" loading="lazy" />}
                          </span>
                        ))}
                      </div>
                      <p className="mt-4 max-w-md text-[15px] text-porcelain/70">{c.intro}</p>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      )}
    </>
  );
}
