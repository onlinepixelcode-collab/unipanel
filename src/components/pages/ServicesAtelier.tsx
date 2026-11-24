"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SERVICES } from "@/lib/site";
import { asset } from "@/lib/asset";

function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setOn(true), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, on] as const;
}

/** 01 · thickness slider morphing a tabletop edge from 36 to 54mm */
function BuildUp() {
  const [t, setT] = useState(36);
  const layers = t / 18;
  const tex = asset("/tex/nogal-rosales-02.jpg");
  return (
    <div>
      <div className="relative flex h-[300px] items-center justify-center overflow-hidden rounded-[3px] bg-[#1a1917]" aria-hidden>
        <div className="relative w-[78%]" style={{ perspective: "900px" }}>
          <div className="relative transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)]" style={{ height: `${t * 2.2}px`, transform: "rotateX(-14deg)" }}>
            <div className="absolute inset-0 rounded-[2px]" style={{ backgroundImage: `url(${tex})`, backgroundSize: "auto 600%", filter: "brightness(.85)" }} />
            {Array.from({ length: Math.ceil(layers) - 1 }).map((_, i) => (
              <div key={i} className="absolute inset-x-0 h-px bg-black/25" style={{ top: `${((i + 1) * 18 * 100) / t}%` }} />
            ))}
          </div>
          <div className="h-3 bg-gradient-to-b from-black/50 to-transparent" />
        </div>
        <span className="display absolute right-6 top-5 text-[64px] text-porcelain">{t}mm</span>
      </div>
      <label htmlFor="buildup" className="eyebrow mt-5 block text-stone-light">
        Build-up thickness
      </label>
      <input id="buildup" type="range" min={36} max={54} step={6} value={t} onChange={(e) => setT(Number(e.target.value))} className="mt-2 w-full accent-[#e4c020]" />
      <div className="caption mt-1 flex justify-between text-stone-light">
        <span>36mm</span>
        <span>42mm</span>
        <span>48mm</span>
        <span>54mm</span>
      </div>
    </div>
  );
}

/** 02 · beam saw cutting path drawn across a board */
function BeamSaw() {
  const [ref, on] = useInView<HTMLDivElement>();
  const cuts = ["M20 70 H380", "M20 140 H380", "M140 20 V70", "M260 20 V70", "M200 70 V140", "M120 140 V210", "M290 140 V210"];
  return (
    <div ref={ref} className="rounded-[3px] bg-[#1a1917] p-6">
      <svg viewBox="0 0 400 230" className="w-full" role="img" aria-label="Diagram of a beam saw cutting a board into panels">
        <rect x="20" y="20" width="360" height="190" fill="#2a2825" stroke="#5a554e" />
        {cuts.map((d, i) => (
          <path key={d} d={d} stroke="#e4c020" strokeWidth="1.5" fill="none" strokeDasharray="400" strokeDashoffset={on ? 0 : 400} style={{ transition: `stroke-dashoffset 1.1s cubic-bezier(.22,1,.36,1) ${i * 0.35}s` }} />
        ))}
      </svg>
      <p className="caption mt-3 text-stone-light">Computer-driven beam saws plan and cut every panel.</p>
    </div>
  );
}

/** 03 · PUR edge vs ordinary edge in a high-moisture area */
function PurEdge() {
  const [pur, setPur] = useState(true);
  return (
    <div className="rounded-[3px] bg-[#1a1917] p-6">
      <div className="flex gap-1.5">
        <button onClick={() => setPur(true)} aria-pressed={pur} className={`h-9 rounded-full px-3.5 text-[13px] ${pur ? "bg-porcelain text-ink" : "border border-white/20 text-porcelain"}`}>
          PUR, Zero Glue Line
        </button>
        <button onClick={() => setPur(false)} aria-pressed={!pur} className={`h-9 rounded-full px-3.5 text-[13px] ${!pur ? "bg-porcelain text-ink" : "border border-white/20 text-porcelain"}`}>
          Visible glue line
        </button>
      </div>
      <svg viewBox="0 0 400 200" className="mt-4 w-full" role="img" aria-label={pur ? "Edge with no visible glue line; water beads on the surface" : "Edge with a visible glue line where moisture can collect"}>
        <rect x="40" y="40" width="250" height="120" fill="#3b3833" />
        <rect x="290" y="40" width="14" height="120" fill="#5b5650" />
        <rect x="288" y="40" width={pur ? 0.6 : 4} height="120" fill={pur ? "#5b5650" : "#d9cdb4"} style={{ transition: "width .5s" }} />
        {[60, 95, 130].map((y, i) => (
          <circle key={y} cx={pur ? 318 : 300} cy={y} r={pur ? 6 : 4} fill="#9ec3d6" opacity={pur ? 0.9 : 0.6} style={{ transition: `all .7s ${i * 0.1}s` }} />
        ))}
        <text x="40" y="190" fill="#b3aea6" fontSize="13" fontFamily="monospace">
          {pur ? "Water beads off the sealed joint" : "A visible line is where moisture finds its way in"}
        </text>
      </svg>
    </div>
  );
}

/** 04 · CNC toolpath drawing with the cutter following it */
function CncPath() {
  const [ref, on] = useInView<HTMLDivElement>();
  const d = "M40 160 C 40 60, 120 40, 160 90 S 260 160, 300 80 S 360 40, 360 120 L 360 160 Z";
  return (
    <div ref={ref} className="rounded-[3px] bg-[#1a1917] p-6">
      <svg viewBox="0 0 400 200" className="w-full" role="img" aria-label="CNC router following a curved toolpath">
        <rect x="20" y="20" width="360" height="160" fill="#2a2825" />
        <path id="cnc" d={d} fill="none" stroke="#e4c020" strokeWidth="2" strokeDasharray="900" strokeDashoffset={on ? 0 : 900} style={{ transition: "stroke-dashoffset 4s linear" }} />
        {on && (
          <circle r="6" fill="#f4f1ec">
            <animateMotion dur="4s" fill="freeze" path={d} />
          </circle>
        )}
      </svg>
      <p className="caption mt-3 text-stone-light">Routed shapes for custom furniture and architectural components.</p>
    </div>
  );
}

const DIAGRAMS = [BuildUp, BeamSaw, PurEdge, CncPath];

const DETAIL: Record<string, { tags: string[]; img: string; lede: string }> = {
  "build-ups": { tags: ["36mm", "42mm", "48mm", "54mm", "Desktops", "Tabletops", "TV unit frames", "Shelving"], img: "/tex/nogal-rosales-02.jpg", lede: "Thickness that reads as solid." },
  "cutting-edging": { tags: ["Computer-driven beam saws", "PUR glue system", "Zero Glue Line guarantee", "High-moisture areas"], img: "/tex/calacatta-bianco.jpg", lede: "A joint you can’t find." },
  processing: { tags: ["Doors", "Panels", "Residential", "Commercial", "Open communication"], img: "/tex/kashmir.jpg", lede: "Your specification, to the millimetre." },
  cnc: { tags: ["Custom furniture", "Architectural components", "Intricate designs"], img: "/tex/oxid-nero-real-stone.jpg", lede: "Shapes a saw can’t make." },
};

const PROCESS = ["Specify", "Cut", "Edge", "Process & route", "Ready for installation"];

export function ServicesAtelier() {
  return (
    <>
      {/* hero: macro edge, headline, service index */}
      <section data-theme="dark" className="section-dark relative overflow-hidden">
        <div aria-hidden className="svc-zoom absolute inset-0" style={{ backgroundImage: `url(${asset("/tex/nogal-rosales-02.jpg")})`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/40" />
        <div className="container-x relative grid min-h-[100svh] items-end gap-12 pb-16 pt-[calc(var(--nav-h)+10vh)] lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="eyebrow text-champagne">Services · The Atelier</p>
            <h1 className="display mt-6 text-[clamp(3.4rem,9vw,9.4rem)]">
              Edges without
              <br />
              <em className="display-italic text-champagne">compromise.</em>
            </h1>
            <p className="lede mt-8 max-w-xl text-porcelain/80">A comprehensive array of services to simplify your installations: build-ups, cutting and edging, door and panel processing, and CNC routing.</p>
          </div>
          <nav aria-label="Services" className="lg:col-span-5">
            <ol className="border-t border-white/15">
              {SERVICES.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="group grid grid-cols-[3rem_1fr_auto] items-baseline gap-4 border-b border-white/15 py-5 transition-colors hover:bg-white/[.03]">
                    <span className="font-mono text-[13px] text-champagne">{s.no}</span>
                    <span className="display text-[30px] transition-transform duration-500 group-hover:translate-x-2">{s.title}</span>
                    <span className="caption text-stone-light">{s.short}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>
        <style>{`.svc-zoom{animation:svcz 24s ease-in-out infinite alternate;opacity:.55}@keyframes svcz{from{transform:scale(1.05)}to{transform:scale(1.25) translateX(-3%)}}@media (prefers-reduced-motion: reduce){.svc-zoom{animation:none}}`}</style>
      </section>

      {/* chapters */}
      {SERVICES.map((s, i) => {
        const D = DIAGRAMS[i];
        const d = DETAIL[s.id];
        const light = i % 2 === 1;
        return (
          <section key={s.id} id={s.id} data-theme={light ? "light" : "dark"} className={`relative scroll-mt-16 overflow-hidden py-28 ${light ? "" : "section-dark"}`}>
            <span aria-hidden className="display pointer-events-none absolute -top-10 right-[4vw] select-none text-[34vw] leading-none opacity-[0.05] lg:text-[22vw]">{s.no}</span>
            <div className="container-x relative grid items-center gap-14 lg:grid-cols-12">
              <div className={`lg:row-start-1 lg:col-span-5 ${i % 2 ? "lg:col-start-8" : "lg:col-start-1"}`}>
                <p className="font-mono text-[13px] text-champagne">Chapter {s.no}</p>
                <h2 className="display mt-3 text-[clamp(2.8rem,5.4vw,5.2rem)]">{s.title}</h2>
                <p className="display-italic mt-2 text-[26px] opacity-80">{d.lede}</p>
                <p className={`mt-6 max-w-md ${light ? "text-stone" : "text-porcelain/80"}`}>{s.body}</p>
                <ul className="mt-8 flex flex-wrap gap-2">
                  {d.tags.map((t) => (
                    <li key={t} className={`rounded-full border px-3.5 py-1.5 text-[13px] ${light ? "border-hairline" : "border-white/15"}`}>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={`lg:row-start-1 lg:col-span-6 ${i % 2 ? "lg:col-start-1" : "lg:col-start-7"}`}>
                <div className="relative overflow-hidden rounded-[4px] bg-[#121211] p-3 shadow-[0_40px_80px_rgba(0,0,0,.35)] ring-1 ring-white/10">
                  <div className="mb-3 flex items-center justify-between px-2 pt-1">
                    <span className="eyebrow text-stone-light">{s.title} · interactive</span>
                    <span className="h-2 w-2 rounded-full bg-champagne" />
                  </div>
                  <D />
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* the guarantee */}
      <section data-theme="dark" className="section-dark border-y border-hairline-dark py-24">
        <div className="container-x grid items-center gap-12 md:grid-cols-12">
          <div className="relative mx-auto h-56 w-56 md:col-span-4">
            <svg viewBox="0 0 200 200" className="seal absolute inset-0 h-full w-full" aria-hidden>
              <defs>
                <path id="seal-c" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
              </defs>
              <text fill="#e4c020" fontSize="13" letterSpacing="5" fontFamily="var(--font-mono)">
                <textPath href="#seal-c">ZERO GLUE LINE · GUARANTEE · PUR · </textPath>
              </text>
            </svg>
            <div className="absolute inset-[22%] grid place-items-center rounded-full border border-champagne/50">
              <span className="display text-[42px] text-champagne">0</span>
            </div>
            <style>{`.seal{animation:seal 30s linear infinite}@keyframes seal{to{transform:rotate(360deg)}}@media (prefers-reduced-motion: reduce){.seal{animation:none}}`}</style>
          </div>
          <div className="md:col-span-7 md:col-start-6">
            <p className="eyebrow text-champagne">Our signature</p>
            <h2 className="display mt-4 text-[clamp(2.6rem,5vw,4.6rem)]">The Zero Glue Line guarantee.</h2>
            <p className="mt-6 max-w-xl text-porcelain/80">A specialised PUR glue system gives the highest quality bond between board and edging, and our boards the best chance of surviving high-moisture environments.</p>
          </div>
        </div>
      </section>

      {/* process */}
      <section data-theme="light" className="py-24">
        <div className="container-x">
          <p className="eyebrow text-stone">From board to door</p>
          <ol className="mt-10 grid gap-px overflow-hidden rounded-[3px] bg-hairline sm:grid-cols-5">
            {PROCESS.map((p, i) => (
              <li key={p} className="bg-porcelain p-6" data-reveal style={{ ["--d" as string]: `${i * 80}ms` }}>
                <span className="font-mono text-[13px] text-stone">0{i + 1}</span>
                <p className="display mt-6 text-[26px]">{p}</p>
              </li>
            ))}
          </ol>
          <div className="mt-16 flex flex-wrap items-end justify-between gap-6 border-t border-hairline pt-10">
            <h2 className="display text-[clamp(2.4rem,5vw,4.6rem)]">
              Have a project
              <br />
              <em className="display-italic">to process?</em>
            </h2>
            <div className="flex flex-wrap gap-2">
              <Link href="/contact/?type=order" className="btn btn-ink">
                Open the order form
              </Link>
              <Link href="/showrooms/" className="btn btn-line">
                <span>Talk to a showroom</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
