"use client";
import { useMemo, useState } from "react";
import { COLLECTIONS } from "@/data/collections";
import { FINISHES, searchFinishes } from "@/data/catalogue";
import type { CollectionId, Tone } from "@/data/types";
import { SwatchCard } from "./SwatchCard";

const TONES: (Tone | "all")[] = ["all", "light", "mid", "dark", "warm", "cool"];

/** Every board on one page: grouped by collection, with instant search and filters. */
export function AllBoards() {
  const [q, setQ] = useState("");
  const [col, setCol] = useState<CollectionId | "all">("all");
  const [tone, setTone] = useState<Tone | "all">("all");
  const results = useMemo(() => searchFinishes(q, { collection: col, tone }), [q, col, tone]);
  const filtering = q.trim() !== "" || tone !== "all";

  // group by primary collection (each board appears once)
  const groups = useMemo(() => {
    if (col !== "all") return [{ c: COLLECTIONS.find((x) => x.id === col)!, list: results }];
    return COLLECTIONS.map((c) => ({ c, list: results.filter((f) => f.collections[0] === c.id) })).filter((g) => g.list.length);
  }, [results, col]);

  return (
    <>
      <section data-theme="light" className="container-x pb-6 pt-[calc(var(--nav-h)+8vh)]">
        <p className="eyebrow text-stone">All boards · {FINISHES.length}</p>
        <h1 className="display mt-6 text-[clamp(3.2rem,9vw,9rem)]">
          Every board,
          <br />
          <em className="display-italic">in one place.</em>
        </h1>
      </section>

      <div data-theme="light" className="sticky top-[var(--nav-h)] z-30 border-y border-hairline bg-porcelain/90 backdrop-blur-xl">
        <div className="container-x flex flex-wrap items-center gap-3 py-3">
          <label htmlFor="boards-q" className="sr-only">
            Search name or code
          </label>
          <input id="boards-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or code" className="h-10 w-full rounded-full border border-hairline bg-transparent px-4 text-[15px] focus:border-ink focus:outline-none sm:w-64" />
          <div className="no-scrollbar flex max-w-full gap-1.5 overflow-x-auto" role="group" aria-label="Collection">
            {(["all", ...COLLECTIONS.map((c) => c.id)] as (CollectionId | "all")[]).map((c) => (
              <button key={c} onClick={() => setCol(c)} aria-pressed={col === c} className={`h-9 shrink-0 rounded-full px-3.5 text-[13px] ${col === c ? "bg-ink text-porcelain" : "border border-hairline hover:border-ink"}`}>
                {c === "all" ? "All" : COLLECTIONS.find((x) => x.id === c)!.name.replace("Premium Italian Range", "Italian")}
              </button>
            ))}
          </div>
          <label htmlFor="boards-tone" className="sr-only">
            Tone
          </label>
          <select id="boards-tone" value={tone} onChange={(e) => setTone(e.target.value as Tone | "all")} className="h-9 rounded-full border border-hairline bg-transparent px-3 text-[13px] capitalize">
            {TONES.map((t) => (
              <option key={t} value={t}>
                {t === "all" ? "All tones" : t}
              </option>
            ))}
          </select>
          <span className="caption ml-auto text-stone" aria-live="polite">
            {results.length} board{results.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <section data-theme="light" className="container-x pb-32 pt-12">
        {results.length === 0 ? (
          <p className="display text-[36px]">Nothing by that name. Try a code, or another collection.</p>
        ) : filtering ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 xl:grid-cols-4">
            {results.map((f, i) => (
              <SwatchCard key={f.id} f={f} index={i} />
            ))}
          </div>
        ) : (
          groups.map(({ c, list }) => (
            <div key={c.id} id={c.id} className="mb-20 scroll-mt-40">
              <div className="mb-8 flex items-baseline justify-between border-t border-ink pt-4">
                <h2 className="display text-[clamp(2rem,4vw,3.4rem)]">
                  <span className="mr-4 font-mono text-[13px] text-stone">{c.no}</span>
                  {c.name}
                </h2>
                <span className="caption text-stone">{list.length} boards</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 xl:grid-cols-4">
                {list.map((f, i) => (
                  <SwatchCard key={f.id} f={f} index={i} />
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </>
  );
}
