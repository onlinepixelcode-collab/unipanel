"use client";
import Link from "next/link";
import type { Finish } from "@/data/types";
import { useSampleBox } from "@/lib/store/sampleBox";

export function SwatchCard({ f, dark, index = 0 }: { f: Finish; dark?: boolean; index?: number }) {
  const add = useSampleBox((s) => s.add);
  const has = useSampleBox((s) => s.ids.includes(f.id));
  return (
    <article className="group relative" data-reveal style={{ ["--d" as string]: `${(index % 4) * 70}ms` }}>
      <Link href={`/finishes/${f.id}/`} className="block" aria-label={`${f.name}${f.code ? ` ${f.code}` : ""}`}>
        <div className="relative aspect-[4/5] overflow-hidden rounded-[3px] bg-black" data-loupe={f.textures.tex}>
          <img src={f.textures.swatch} alt={`${f.name} ${f.category.toLowerCase()} door render`} loading="lazy" className="h-full w-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.04]" />
        </div>
      </Link>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[17px]">{f.name}</h3>
          <p className={`font-mono text-[13px] ${dark ? "text-stone-light" : "text-stone"}`}>{f.code ?? f.category}</p>
          <p className={`caption mt-1 ${dark ? "text-stone-light" : "text-stone"}`}>{f.tones.join(" · ")}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={`/studio/?finish=${f.id}&zone=baseDoors`} className={`btn !min-h-9 !px-3.5 !text-[13px] ${dark ? "btn-light" : "btn-ink"}`}>
          Apply in Studio
        </Link>
        <button onClick={() => add(f.id)} disabled={has} aria-label={has ? `${f.name} is in your Sample Box` : `Add ${f.name} to Sample Box`} className="btn btn-line !min-h-9 !px-3.5 !text-[13px] disabled:opacity-50">
          <span>{has ? "In box" : "+ Sample"}</span>
        </button>
      </div>
    </article>
  );
}
