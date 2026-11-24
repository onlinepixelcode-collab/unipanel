import type { Metadata } from "next";
import Link from "next/link";
import { CARE } from "@/data/care";
import { asset } from "@/lib/asset";

export const metadata: Metadata = { title: "Care Guide", description: "How to clean matte, gloss, metal, Real Glass and Real Stone surfaces from UnipanelSA, and the all-inclusive cleaning solution available for each product." };

const IMG: Record<string, string> = { matte: "kashmir", gloss: "black-8102", metal: "champagne-metal", glass: "satin-kashmir-glass", stone: "oxid-nero-real-stone" };

export default function Page() {
  return (
    <>
      <section data-theme="light" className="container-x pb-16 pt-[calc(var(--nav-h)+8vh)]">
        <p className="eyebrow text-stone">Care Guide</p>
        <h1 className="display mt-6 text-[clamp(3.2rem,9vw,9rem)]">
          Keep it
          <br />
          <em className="display-italic">as it arrived.</em>
        </h1>
        <p className="lede mt-8 max-w-xl text-stone">An all-inclusive cleaning solution is available for each product. Ask your showroom for the one matched to your finish. The basics below apply every day.</p>
      </section>
      {Object.entries(CARE).map(([k, c], i) => (
        <section key={k} id={k} data-theme={i % 2 ? "dark" : "light"} className={`${i % 2 ? "section-dark" : "border-t border-hairline"} py-20`}>
          <div className="container-x grid items-center gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="font-mono text-[13px] opacity-60">0{i + 1}</p>
              <h2 className="display mt-2 text-[clamp(2.4rem,4.4vw,4rem)]">{c.title}</h2>
              <ol className="mt-8 space-y-3">
                {c.steps.map((s, j) => (
                  <li key={j} className="flex gap-4 border-t border-current/15 pt-3">
                    <span className="font-mono text-[13px] opacity-60">0{j + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="aspect-[16/10] overflow-hidden rounded-[3px] lg:col-span-6 lg:col-start-7">
              <img src={asset(`/swatch/${IMG[k]}.webp`)} alt="" loading="lazy" className="h-full w-full bg-black object-cover" />
            </div>
          </div>
        </section>
      ))}
      <section data-theme="light" className="border-t border-hairline py-16">
        <div className="container-x flex flex-wrap items-center justify-between gap-4">
          <p className="text-stone">Not sure which applies to your finish? Each finish page lists its care notes.</p>
          <Link href="/showrooms/" className="btn btn-ink">
            Ask a showroom
          </Link>
        </div>
      </section>
    </>
  );
}
