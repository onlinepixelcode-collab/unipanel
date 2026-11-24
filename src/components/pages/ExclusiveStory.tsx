"use client";
import Link from "next/link";
import { useRef } from "react";
import { asset } from "@/lib/asset";
import { finishesIn } from "@/data/catalogue";
import { useReducedMotion, useSectionProgress } from "@/lib/hooks/useSectionProgress";

const CHAPTERS = [
  { no: "01", title: "The substrate", body: "Every door starts as a stable core board, cut to size before anything precious touches it." },
  { no: "02", title: "The face", body: "A real face goes on: stone, glass or ceramic. Real Glass is bonded with patented lamination." },
  { no: "03", title: "The laser edge", body: "In Germany, the edge is sealed with laser edgebanding technology. Face and edge meet without a visible line." },
  { no: "04", title: "The finished door", body: "What arrives is a door that reads as one material from every angle, ready for the kitchen it was chosen for." },
];

/** Macro cutaway of a door edge that builds layer by layer as you scroll. */
export function ExclusiveStory() {
  const sec = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { value } = useSectionProgress(sec, { state: true });
  const step = reduced ? 3 : Math.min(3, Math.floor(value * 4.2));
  const stone = asset("/tex/oxid-nero-real-stone.jpg");
  const counts = { stone: finishesIn("real-stone").length, glass: finishesIn("real-glass").length };

  return (
    <>
      <section data-theme="dark" className="section-dark pb-16 pt-[calc(var(--nav-h)+10vh)]">
        <div className="container-x">
          <p className="eyebrow text-champagne">Exclusive Range</p>
          <h1 className="display mt-6 text-[clamp(3.4rem,10vw,10rem)]">
            Made in
            <br />
            <em className="display-italic">Germany.</em>
          </h1>
          <p className="lede mt-8 max-w-xl text-porcelain/75">Real Stone, Real Glass and Ceramic, processed in Germany using laser edgebanding technology. Four steps from board to door.</p>
        </div>
      </section>

      <section ref={sec} data-theme="dark" className="section-dark relative" style={{ height: reduced ? "auto" : "420svh" }}>
        <div className={reduced ? "py-16" : "sticky top-0 h-[100svh] overflow-hidden"}>
          <div className="container-x grid h-full items-center gap-10 lg:grid-cols-12">
            <ol className="lg:col-span-5">
              {CHAPTERS.map((c, i) => (
                <li key={c.no} className={`border-t border-hairline-dark py-6 transition-opacity duration-700 ${i === step || reduced ? "opacity-100" : "opacity-30"}`}>
                  <p className="font-mono text-[13px] text-champagne">{c.no}</p>
                  <h2 className="display mt-2 text-[clamp(2rem,3.4vw,3.2rem)]">{c.title}</h2>
                  <p className={`mt-3 max-w-md text-porcelain/75 transition-[max-height] duration-700 ${i === step || reduced ? "max-h-40" : "max-h-0 overflow-hidden lg:max-h-40"}`}>{c.body}</p>
                </li>
              ))}
            </ol>
            {/* the cutaway */}
            <div className="relative h-[56svh] lg:col-span-6 lg:col-start-7" style={{ perspective: "1600px" }} aria-hidden>
              <div className="absolute inset-0" style={{ transformStyle: "preserve-3d", transform: `rotateY(${-32 + step * 6}deg) rotateX(8deg)` }}>
                {/* core */}
                <div className="absolute inset-y-[6%] left-[18%] w-[56%] rounded-[2px] transition-all duration-1000" style={{ background: "repeating-linear-gradient(90deg,#c9b48f 0 3px,#b39d78 3px 5px,#d8c49f 5px 9px)", transform: "translateZ(0px)", boxShadow: "0 40px 80px rgba(0,0,0,.5)" }} />
                {/* face */}
                <div className="absolute inset-y-[6%] left-[18%] w-[56%] rounded-[2px] transition-all duration-1000 ease-[cubic-bezier(.22,1,.36,1)]" style={{ backgroundImage: `url(${stone})`, backgroundSize: "cover", transform: `translateZ(${step >= 1 ? 24 : 220}px)`, opacity: step >= 1 ? 1 : 0 }} />
                {/* edge band */}
                <div
                  className="absolute inset-y-[6%] w-[26px] origin-left transition-all duration-1000 ease-[cubic-bezier(.22,1,.36,1)]"
                  style={{ left: "74%", backgroundImage: `url(${stone})`, backgroundSize: "800% auto", filter: "brightness(.6)", transform: `rotateY(90deg) translateX(${step >= 2 ? 0 : -60}px)`, opacity: step >= 2 ? 1 : 0 }}
                />
                {/* laser */}
                <div className="absolute w-[3px] rounded-full bg-[#ffe2b0] shadow-[0_0_24px_6px_rgba(255,214,150,.7)] transition-all duration-[1600ms]" style={{ left: "74%", top: step >= 2 ? "94%" : "6%", height: "4%", opacity: step === 2 ? 1 : 0, transform: "translateZ(24px)" }} />
              </div>
              <p className="caption absolute bottom-0 right-0 text-stone-light">Illustrative cutaway</p>
            </div>
          </div>
        </div>
      </section>

      <section data-theme="light" className="py-28">
        <div className="container-x grid gap-3 md:grid-cols-2">
          {[
            { href: "/collections/real-stone/", name: "Real Stone", n: counts.stone, img: asset("/tex/iron-corten-real-stone.jpg") },
            { href: "/collections/real-glass/", name: "Real Glass", n: counts.glass, img: asset("/swatch/satin-kashmir-glass.webp") },
          ].map((c) => (
            <Link key={c.href} href={c.href} className="group relative block h-[60vh] overflow-hidden rounded-[3px] bg-ink">
              <img src={c.img} alt="" className="h-full w-full object-cover opacity-90 transition-transform duration-[1400ms] group-hover:scale-105" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-6 left-6 text-porcelain">
                <p className="display text-[52px]">{c.name}</p>
                <p className="caption">{c.n} finishes</p>
              </div>
            </Link>
          ))}
          <div className="rounded-[3px] border border-hairline p-8 md:col-span-2">
            <p className="display text-[36px]">Ceramic</p>
            <p className="mt-3 max-w-xl text-stone">Ceramic is part of the Exclusive Range. Ceramic finishes are not yet listed online; ask a showroom for the current selection.</p>
            <Link href="/showrooms/" className="link-u mt-4 inline-block">
              Find a showroom
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
