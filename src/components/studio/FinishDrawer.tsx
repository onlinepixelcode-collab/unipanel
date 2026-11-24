"use client";
import { useMemo, useState } from "react";
import { FINISHES, finishById, searchFinishes } from "@/data/catalogue";
import { COLLECTIONS } from "@/data/collections";
import type { CollectionId, Finish, Tone } from "@/data/types";

type Tab = "all" | "recent" | "favourites" | CollectionId;

interface Props {
  activeId?: string;
  recent: string[];
  favourites: string[];
  onPick: (f: Finish) => void;
  onToggleFavourite: (id: string) => void;
  layout?: "grid" | "carousel";
  /** Hide search and filters (mobile peek state). */
  bare?: boolean;
}

const TONES: { id: Tone | "all"; label: string }[] = [
  { id: "all", label: "All tones" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "warm", label: "Warm" },
  { id: "cool", label: "Cool" },
];

export function FinishDrawer({ activeId, recent, favourites, onPick, onToggleFavourite, layout = "grid", bare = false }: Props) {
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [tone, setTone] = useState<Tone | "all">("all");

  const list = useMemo(() => {
    let base: Finish[];
    if (tab === "recent") base = recent.map((id) => finishById(id)!).filter(Boolean);
    else if (tab === "favourites") base = favourites.map((id) => finishById(id)!).filter(Boolean);
    else base = searchFinishes("", { collection: tab === "all" ? "all" : tab });
    const n = q.trim().toLowerCase();
    return base.filter((f) => (tone === "all" || f.tones.includes(tone)) && (!n || `${f.name} ${f.fullName} ${f.code ?? ""} ${f.category}`.toLowerCase().includes(n)));
  }, [tab, q, tone, recent, favourites]);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "all", label: "All", count: FINISHES.length },
    { id: "recent", label: "Recent" },
    { id: "favourites", label: "Saved" },
    ...COLLECTIONS.map((c) => ({ id: c.id as Tab, label: c.name.replace("Premium Italian Range", "Italian") })),
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={`flex items-center gap-2 ${bare ? "hidden" : ""}`}>
        <label className="sr-only" htmlFor="finish-search">
          Search finishes by name or code
        </label>
        <input
          id="finish-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or code"
          className="h-11 w-full rounded-full border border-white/10 bg-white/5 px-4 text-[15px] text-porcelain placeholder:text-stone-light focus:border-champagne focus:outline-none"
        />
        <label className="sr-only" htmlFor="tone-filter">
          Tone
        </label>
        <select id="tone-filter" value={tone} onChange={(e) => setTone(e.target.value as Tone | "all")} className="h-11 rounded-full border border-white/10 bg-white/5 px-3 text-[14px] text-porcelain focus:border-champagne focus:outline-none">
          {TONES.map((t) => (
            <option key={t.id} value={t.id} className="bg-ink">
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div role="tablist" aria-label="Collections" className={`no-scrollbar -mx-1 mt-3 flex gap-1 overflow-x-auto px-1 pb-1 ${bare ? "hidden" : ""}`}>
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`h-9 shrink-0 rounded-full px-3.5 text-[13px] transition-colors duration-200 ${tab === t.id ? "bg-porcelain text-ink" : "text-stone-light hover:bg-white/10 hover:text-porcelain"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className={`caption mt-2 text-stone-light ${bare ? "sr-only" : ""}`} aria-live="polite">
        {list.length} finish{list.length === 1 ? "" : "es"}
      </p>

      {list.length === 0 ? (
        <p className="mt-6 text-[15px] text-stone-light">{tab === "favourites" ? "Tap the star on any finish to save it here." : tab === "recent" ? "Finishes you apply appear here." : "No finish matches that search."}</p>
      ) : (
        <ul
          className={
            layout === "carousel"
              ? "no-scrollbar -mx-4 mt-2 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2"
              : "no-scrollbar mt-2 grid min-h-0 flex-1 grid-cols-3 content-start gap-2.5 overflow-y-auto pb-6 pr-1 xl:grid-cols-4"
          }
        >
          {list.map((f) => {
            const active = f.id === activeId;
            const fav = favourites.includes(f.id);
            return (
              <li key={f.id} className={layout === "carousel" ? "w-[96px] shrink-0 snap-start" : ""}>
                <div className="group relative">
                  <button
                    onClick={() => onPick(f)}
                    aria-pressed={active}
                    aria-label={`${f.name}${f.code ? ` ${f.code}` : ""}, ${f.category}`}
                    data-loupe={f.textures.tex}
                    className={`block w-full overflow-hidden rounded-md text-left outline-offset-2 transition-transform duration-200 active:scale-[0.97] ${active ? "ring-2 ring-champagne" : "ring-1 ring-white/10 hover:ring-white/40"}`}
                  >
                    <span className="block aspect-square w-full" style={{ background: f.hex }}>
                      {!f.flat && <img src={f.textures.thumb} alt="" loading="lazy" className="h-full w-full object-cover" />}
                    </span>
                    <span className="block bg-black/40 px-2 py-1.5">
                      <span className="block truncate text-[13px] leading-tight text-porcelain">{f.name}</span>
                      <span className="block truncate font-mono text-[13px] leading-tight text-stone-light">{f.code ?? f.category}</span>
                    </span>
                  </button>
                  <button
                    onClick={() => onToggleFavourite(f.id)}
                    aria-pressed={fav}
                    aria-label={fav ? `Remove ${f.name} from saved` : `Save ${f.name}`}
                    className={`absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-black/45 text-[15px] backdrop-blur transition-opacity ${fav ? "text-champagne opacity-100" : "text-porcelain opacity-0 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"}`}
                  >
                    {fav ? "★" : "☆"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
