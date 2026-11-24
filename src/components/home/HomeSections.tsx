"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { finishById, finishesIn, FINISH_COUNT, finishLabel } from "@/data/catalogue";
import { COLLECTIONS } from "@/data/collections";
import { SHOWROOMS } from "@/lib/site";
import { asset } from "@/lib/asset";
import { useNear, useNearOnce, useReducedMotion, useSectionProgress } from "@/lib/hooks/useSectionProgress";
import { detectTier, hasWebGL } from "@/components/three/quality";
import { DEFAULT_SCHEME, DOOR_ZONES, type Scheme } from "@/lib/studio/scheme";
import { ShowroomStatus } from "@/components/ui/ShowroomStatus";
import { SectionNo } from "@/components/ui/SpecTag";
import { Lines } from "@/components/ui/Reveal";
import { SampleTray } from "@/components/ui/SampleTray";
import { HERO_SEQUENCE } from "./heroSequence";

const HeroSlabCanvas = dynamic(() => import("./HeroSlabCanvas"), { ssr: false });
const AssemblyCanvas = dynamic(() => import("./AssemblyCanvas"), { ssr: false });
const StudioCanvas = dynamic(() => import("@/components/three/StudioCanvas"), { ssr: false });

function useGfx() {
  const [g, setG] = useState({ ok: false, high: false, tier: 1 as 0 | 1 | 2 });
  useEffect(() => {
    const t = detectTier();
    setG({ ok: hasWebGL(), high: t === 2, tier: t });
  }, []);
  return g;
}

/** Types out a string a few characters per frame whenever it changes. */
function Typed({ text }: { text: string }) {
  const [out, setOut] = useState(text);
  useEffect(() => {
    let i = 0;
    let raf = 0;
    const step = () => {
      i += 1;
      setOut(text.slice(0, i));
      if (i < text.length) raf = window.setTimeout(step, 28) as unknown as number;
    };
    step();
    return () => clearTimeout(raf);
  }, [text]);
  return (
    <>
      {out}
      <span className="ml-0.5 inline-block w-[0.5em] animate-pulse">_</span>
    </>
  );
}

// ------------------------------------------------------------------ 01 hero
export function HeroReveal() {
  const sec = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const gfx = useGfx();
  const { progress, value } = useSectionProgress(sec, { state: true });
  const heroOnScreen = useNear(sec, "5%");
  const idx = Math.min(HERO_SEQUENCE.length - 1, Math.round(value * (HERO_SEQUENCE.length - 1) + 0.2));
  const f = finishById(HERO_SEQUENCE[idx])!;
  const coll = COLLECTIONS.find((c) => c.id === f.collections[0])!;

  return (
    <section ref={sec} data-theme="dark" className="section-dark relative" style={{ height: reduced ? "100svh" : "560svh" }} aria-label="Luxury European Surfaces">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {gfx.ok ? (
          <div className="absolute inset-0">
            <HeroSlabCanvas progress={progress} high={gfx.high} active={heroOnScreen} />
          </div>
        ) : (
          <img src={f.textures.swatch} alt="" className="absolute right-[8%] top-1/2 h-[70%] -translate-y-1/2 object-contain" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(13,13,12,.75)_100%)]" />

        <div className="container-x relative flex h-full flex-col justify-between pb-10 pt-[calc(var(--nav-h)+4vh)]">
          <div className="flex items-start justify-between">
            <SectionNo no="01" label="The Surface Reveal" className="text-stone-light" />
            <p className="caption hidden max-w-[240px] text-right text-stone-light md:block">The World’s Best Interior Kitchen Doors and Panels at your fingertips.</p>
          </div>

          <div className="grid items-end gap-8 md:grid-cols-12">
            <div className="md:col-span-8">
              <h1 className="display text-[clamp(3.4rem,8.6vw,9.4rem)]">
                <span className="mask">
                  <span className="hero-line block" style={{ animationDelay: "2.1s" }}>
                    Luxury European
                  </span>
                </span>
                <span className="mask">
                  <span className="hero-line block" style={{ animationDelay: "2.2s" }}>
                    <em className="display-italic text-champagne">Surfaces.</em>
                  </span>
                </span>
              </h1>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/studio/" className="btn btn-light pointer-events-auto">
                  Open the Studio
                </Link>
                <Link href="/collections/" className="btn btn-line pointer-events-auto text-porcelain">
                  <span>Explore {FINISH_COUNT} finishes</span>
                </Link>
              </div>
            </div>
            <div className="md:col-span-4 md:justify-self-end" aria-live="polite">
              <p className="eyebrow mb-3 text-stone-light">Now showing</p>
              <span className="spec-tag text-porcelain">
                <span>
                  <Typed text={f.name} />
                </span>
                <span>{f.code ?? coll.name}</span>
              </span>
              <ol className="mt-6 flex gap-1.5" aria-hidden>
                {HERO_SEQUENCE.map((id, i) => (
                  <li key={id} className={`h-px w-8 transition-colors duration-500 ${i <= idx ? "bg-champagne" : "bg-white/20"}`} />
                ))}
              </ol>
            </div>
          </div>
        </div>
        {!reduced && (
          <p className="eyebrow absolute bottom-6 left-1/2 hidden -translate-x-1/2 text-stone-light transition-opacity duration-500 md:block" style={{ opacity: value > 0.02 ? 0 : 1 }}>
            Scroll to turn the slab
          </p>
        )}
      </div>
      <style>{`.hero-line{transform:translateY(105%);animation:hero-in 1.2s cubic-bezier(.22,1,.36,1) forwards}@keyframes hero-in{to{transform:none}}@media (prefers-reduced-motion: reduce){.hero-line{transform:none;animation:none}}`}</style>
    </section>
  );
}

// ------------------------------------------------------------------ 02 assembly
const STEPS = [
  { at: 0.12, label: "Plinth & carcasses" },
  { at: 0.32, label: "Base fronts" },
  { at: 0.5, label: "Wall & tall units" },
  { at: 0.7, label: "Island & waterfall ends" },
  { at: 0.88, label: "Splashback & shelving" },
];

export function Assembly() {
  const sec = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const gfx = useGfx();
  // mount two screens ahead and keep it mounted, so it is ready when you arrive
  const near = useNearOnce(sec, "200%");
  const onScreen = useNear(sec, "10%");
  const { progress, value } = useSectionProgress(sec, { state: true });
  const stillProgress = useRef(1);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // fetch the 3D chunk as soon as the page is idle
    const id = window.setTimeout(() => import("./AssemblyCanvas"), 1200);
    return () => clearTimeout(id);
  }, []);

  return (
    <section ref={sec} data-theme="dark" className="section-dark relative" style={{ height: reduced ? "100svh" : "420svh" }} aria-label="Assembly">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <img src={asset("/inspiration/ambiente-cocina-titan-01-y-titan-03-min-scaled-1.webp")} alt="" aria-hidden className={`absolute inset-x-0 top-[10%] h-[46%] w-full object-cover transition-opacity duration-700 md:inset-0 md:h-full ${ready ? "opacity-0" : "opacity-50"}`} />
        {gfx.ok && near && (
          <div className={`absolute inset-x-0 top-[8%] h-[50%] transition-opacity duration-700 md:inset-0 md:h-auto ${ready ? "opacity-100" : "opacity-0"}`}>
            <AssemblyCanvas progress={reduced ? stillProgress : progress} high={gfx.high} onReady={() => setReady(true)} active={onScreen || !ready} />
          </div>
        )}
        {/* phones: solid fade under the text so it never sits on the 3D kitchen */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,var(--color-ink)_46%,rgba(15,15,14,.85)_56%,transparent_68%)] md:bg-gradient-to-t md:from-ink md:via-ink/30 md:to-transparent" />
        <div className="container-x pointer-events-none relative flex h-full flex-col justify-between pb-8 pt-[calc(var(--nav-h)+2vh)] md:pb-10 md:pt-[calc(var(--nav-h)+4vh)]">
          <SectionNo no="02" label="Assembly" className="text-stone-light" />
          <div className="grid gap-8 md:grid-cols-12">
            <div className="md:col-span-6">
              <Lines as="h2" className="display text-[clamp(2.3rem,6vw,6rem)]" lines={["Your kitchen,", <em key="e" className="display-italic">before it exists.</em>]} />
              <p className="mt-4 max-w-md text-[15px] text-porcelain/75 md:mt-6 md:text-[17px]">Flat panels become a kitchen: base, wall, tall and island, built from real door proportions in millimetres.</p>
            </div>
            <ol className="self-end md:col-span-4 md:col-start-9">
              {STEPS.map((s, i) => {
                const on = reduced || value >= s.at;
                return (
                  <li key={s.label} className={`flex items-baseline gap-4 border-t border-hairline-dark py-2 transition-colors duration-500 md:py-3 ${on ? "text-porcelain" : "text-porcelain/30"}`}>
                    <span className="font-mono text-[13px]">0{i + 1}</span>
                    <span className="text-[15px] md:text-[17px]">{s.label}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ 03 mini studio
const MINI = ["black-matte", "verde-salvia", "nogal-rosales-02", "calacatta-bianco", "champagne-metal", "satin-kashmir-glass"];

export function MiniStudio() {
  const sec = useRef<HTMLElement>(null);
  const near = useNear(sec, "20%");
  const gfx = useGfx();
  const [pick, setPick] = useState(MINI[0]);
  const scheme: Scheme = useMemo(() => {
    const zones = { ...DEFAULT_SCHEME.zones };
    for (const z of DOOR_ZONES) zones[z] = pick;
    zones.islandFronts = pick === "nogal-rosales-02" ? "black-matte" : "nogal-rosales-02";
    return { ...DEFAULT_SCHEME, zones };
  }, [pick]);

  return (
    <section ref={sec} data-theme="light" className="relative py-28 md:py-40">
      <div className="container-x grid-12 items-center gap-y-12">
        <div className="col-span-12 lg:col-span-4">
          <SectionNo no="03" label="Live Studio" className="text-stone" />
          <Lines as="h2" className="display mt-6 text-[clamp(2.6rem,5vw,4.8rem)]" lines={["Touch a finish.", <em key="e" className="display-italic">Watch it change.</em>]} />
          <p className="mt-6 max-w-md text-stone">Six of our finishes, applied to every door in real time. The full Studio holds all {FINISH_COUNT}, four rooms, five kitchen layouts and a spec sheet you can send to a showroom.</p>
          <div role="radiogroup" aria-label="Hero finishes" className="mt-8 grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-3">
            {MINI.map((id) => {
              const f = finishById(id)!;
              return (
                <button key={id} role="radio" aria-checked={pick === id} onClick={() => setPick(id)} data-loupe={f.textures.tex} className={`group text-left ${pick === id ? "" : "opacity-80 hover:opacity-100"}`}>
                  <span className={`block aspect-square overflow-hidden rounded-md ring-offset-2 ring-offset-porcelain transition-shadow duration-200 ${pick === id ? "ring-2 ring-ink" : "ring-1 ring-hairline"}`} style={{ background: f.hex }}>
                    {!f.flat && <img src={f.textures.thumb} alt="" className="h-full w-full object-cover" loading="lazy" />}
                  </span>
                  <span className="caption mt-1.5 block truncate">{f.name}</span>
                </button>
              );
            })}
          </div>
          <Link href={`/studio/?finish=${pick}&zone=baseDoors`} className="btn btn-ink mt-10">
            Open the full Studio
          </Link>
        </div>
        <div className="col-span-12 lg:col-span-8">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[4px] bg-ink">
            {gfx.ok && near ? (
              <StudioCanvas scheme={scheme} mood="gallery" camera="overview" cameraNonce={0} tier={Math.min(gfx.tier, 1) as 0 | 1} compact />
            ) : (
              <img src={finishById(pick)!.textures.swatch} alt="" className="h-full w-full object-contain" />
            )}
            <p className="caption pointer-events-none absolute bottom-3 left-4 text-porcelain/70">
              {finishLabel(finishById(pick)!)} on all doors · worktop, floor and handles are visual staging
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ 04 material wall
export function MaterialWall() {
  const [open, setOpen] = useState(0);
  return (
    <section data-theme="light" className="py-28 md:py-36">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <SectionNo no="04" label="The Material Wall" className="text-stone" />
            <Lines as="h2" className="display mt-6 text-[clamp(2.6rem,5.5vw,5.4rem)]" lines={["Nine collections.", <em key="e" className="display-italic">Endless applications.</em>]} />
          </div>
          <Link href="/boards/" className="btn btn-ink">
            <span>See all boards</span>
          </Link>
        </div>
        <div className="mt-14 flex h-[72vh] min-h-[520px] gap-1.5 max-md:h-auto max-md:flex-col">
          {COLLECTIONS.map((c, i) => {
            const cover = finishById(c.cover)!;
            const count = finishesIn(c.id).length;
            const active = open === i;
            return (
              <Link
                key={c.id}
                href={`/collections/${c.id}/`}
                onMouseEnter={() => setOpen(i)}
                onFocus={() => setOpen(i)}
                data-loupe={cover.textures.tex}
                className="group relative overflow-hidden rounded-[3px] transition-[flex-grow] duration-[900ms] ease-[cubic-bezier(.22,1,.36,1)] max-md:h-[96px] max-md:data-[on=true]:h-[300px]"
                data-on={active}
                style={{ flexGrow: active ? 6 : 1, flexBasis: 0, background: cover.hex }}
              >
                <img src={cover.flat ? cover.textures.swatch : cover.textures.tex} alt="" loading="lazy" className={`absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(.22,1,.36,1)] ${active ? "scale-100" : "scale-125"}`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <span className="font-mono text-[13px] text-porcelain/70">{c.no}</span>
                  <p className={`display mt-1 whitespace-nowrap text-porcelain transition-[font-size] duration-700 ${active ? "text-[34px]" : "text-[20px] md:[writing-mode:vertical-rl] md:rotate-180"}`}>{c.name}</p>
                  <p className={`caption mt-2 text-porcelain/80 transition-opacity duration-500 ${active ? "opacity-100" : "opacity-0"}`}>
                    {count} finishes{c.group ? " · Exclusive Range" : ""}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ 05 exclusive teaser
const EXCL = ["oxid-nero-real-stone", "satin-kashmir-glass", "iron-corten-real-stone"];
export function ExclusiveTeaser() {
  const stone = asset("/tex/oxid-nero-real-stone.jpg");
  const facts = [
    { k: "Laser edgebanding", v: "Face and edge meet without a visible line" },
    { k: "Patented lamination", v: "How Real Glass is bonded to the door" },
    { k: "Real Stone · Real Glass · Ceramic", v: `${finishesIn("real-stone").length + finishesIn("real-glass").length} exclusive finishes online` },
  ];
  return (
    <section data-theme="dark" className="section-dark relative overflow-hidden py-28 md:py-40">
      <div aria-hidden className="pointer-events-none absolute -right-[20vw] top-0 h-full w-[70vw] opacity-[0.14]" style={{ backgroundImage: `url(${stone})`, backgroundSize: "cover", maskImage: "linear-gradient(90deg,transparent,black 40%)" }} />
      <div className="container-x relative grid-12 items-center gap-y-16">
        <div className="col-span-12 lg:col-span-5">
          <SectionNo no="05" label="Exclusive Range" className="text-stone-light" />
          <Lines as="h2" className="display mt-6 text-[clamp(2.6rem,5.5vw,5.4rem)]" lines={["Processed", <em key="e" className="display-italic text-champagne">in Germany.</em>]} />
          <ul className="mt-10 border-t border-hairline-dark">
            {facts.map((f) => (
              <li key={f.k} className="grid grid-cols-[1fr_auto] items-baseline gap-4 border-b border-hairline-dark py-4">
                <span className="text-[17px]">{f.k}</span>
                <span className="caption text-right text-stone-light">{f.v}</span>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap gap-2">
            <Link href="/exclusive/" className="btn btn-light">
              The making of a door
            </Link>
            <Link href="/collections/real-stone/" className="btn btn-line text-porcelain">
              <span>Real Stone</span>
            </Link>
            <Link href="/collections/real-glass/" className="btn btn-line text-porcelain">
              <span>Real Glass</span>
            </Link>
          </div>
        </div>
        <div className="col-span-12 lg:col-span-7">
          <div className="relative grid grid-cols-3 items-end gap-3">
            {EXCL.map((id, i) => {
              const f = finishById(id)!;
              return (
                <Link key={id} href={`/finishes/${id}/`} className={`group block ${i === 1 ? "-translate-y-10" : ""}`}>
                  <div className="relative aspect-[3/4.4] overflow-hidden rounded-[3px] bg-black" data-loupe={f.textures.tex}>
                    <img src={f.textures.swatch} alt={`${f.name} ${f.category.toLowerCase()}`} loading="lazy" className="h-full w-full object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-105" />
                  </div>
                  <p className="mt-3 text-[15px]">{f.name}</p>
                  <p className="caption text-stone-light">{f.category}</p>
                </Link>
              );
            })}
          </div>
          {/* macro: a laser travelling along a stone edge, sealing it */}
          <div className="relative mt-10 h-28 overflow-hidden rounded-[3px] bg-black">
            <div className="absolute inset-x-0 top-0 h-[62%]" style={{ backgroundImage: `url(${stone})`, backgroundSize: "30% auto" }} />
            <div className="absolute inset-x-0 bottom-0 h-[38%]" style={{ backgroundImage: `url(${stone})`, backgroundSize: "30% auto", filter: "brightness(.5)" }} />
            <div className="laser-seal absolute bottom-[38%] left-0 h-px bg-champagne/80" />
            <div className="laser-dot absolute bottom-[38%] h-[3px] w-20 -translate-y-px rounded-full bg-[#ffe2b0] shadow-[0_0_22px_6px_rgba(255,214,150,.6)]" />
            <span className="eyebrow absolute right-4 top-3 text-porcelain/80">Laser edge · macro</span>
          </div>
          <style>{`.laser-dot{animation:ldot 4.5s cubic-bezier(.6,0,.2,1) infinite}.laser-seal{animation:lseal 4.5s cubic-bezier(.6,0,.2,1) infinite}@keyframes ldot{0%{left:-5rem}70%,100%{left:100%}}@keyframes lseal{0%{width:0;opacity:1}70%{width:100%;opacity:1}100%{width:100%;opacity:0}}@media (prefers-reduced-motion: reduce){.laser-dot{display:none}.laser-seal{animation:none;width:100%}}`}</style>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ 06 proof strip
export function ProofStrip() {
  const items = [
    { big: "KSA", small: "Proud member of the Kitchen Specialists Association" },
    { big: "3", small: "Showrooms: Johannesburg, Cape Town, Durban" },
    { big: String(FINISH_COUNT), small: "Finishes across nine collections" },
    { big: "Free", small: "Sample boxes for designers, architects and manufacturers" },
  ];
  return (
    <section data-theme="light" className="border-y border-hairline">
      <div className="container-x grid grid-cols-2 lg:grid-cols-4">
        {items.map((it, i) => (
          <div key={it.big} className={`py-10 pr-6 ${i > 0 ? "lg:border-l lg:border-hairline lg:pl-8" : ""} ${i % 2 === 1 ? "max-lg:border-l max-lg:border-hairline max-lg:pl-6" : ""} ${i > 1 ? "max-lg:border-t max-lg:border-hairline" : ""}`} data-reveal style={{ ["--d" as string]: `${i * 80}ms` }}>
            <p className="display text-[clamp(2.6rem,4vw,3.8rem)]">{it.big}</p>
            <p className="caption mt-2 max-w-[220px] text-stone">{it.small}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ 07 sample box CTA
const BOX = ["calacatta-bianco", "black-matte", "nogal-rosales-02", "champagne-metal", "satin-kashmir-glass", "oxid-nero-real-stone", "verde-salvia", "loom-ah7"];
export function SampleCTA() {
  const steps = [
    { no: "01", t: "Choose up to eight", d: "From any collection, or straight from a Studio scheme." },
    { no: "02", t: "Delivered to your office", d: "For interior designers, architects and manufacturers." },
    { no: "03", t: "Free for trade", d: "Touch the finish before you specify it." },
  ];
  return (
    <section data-theme="dark" className="section-dark relative overflow-hidden py-28 md:py-40">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[70vh] w-[70vh] -translate-y-1/2 rounded-full bg-champagne/10 blur-[120px] lg:left-[62%]" />
      <div className="container-x relative grid-12 items-center gap-y-12">
        <div className="col-span-12 lg:col-span-5">
          <SectionNo no="06" label="Sample Box" className="text-stone-light" />
          <Lines as="h2" className="display mt-6 text-[clamp(2.6rem,5.5vw,5.4rem)]" lines={["Hold it", <em key="e" className="display-italic text-champagne">before you choose.</em>]} />
          <ol className="mt-10 border-t border-hairline-dark">
            {steps.map((s) => (
              <li key={s.no} className="grid grid-cols-[3rem_1fr] gap-4 border-b border-hairline-dark py-4">
                <span className="font-mono text-[13px] text-champagne">{s.no}</span>
                <span>
                  <span className="block text-[17px]">{s.t}</span>
                  <span className="caption text-stone-light">{s.d}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-wrap gap-2">
            <Link href="/sample-box/" className="btn btn-light">
              Order your Sample Box
            </Link>
            <Link href="/boards/" className="btn btn-line text-porcelain">
              <span>Browse all boards</span>
            </Link>
          </div>
        </div>
        <div className="col-span-12 lg:col-span-7">
          <SampleTray ids={BOX} className="mx-auto max-w-[720px] [--tray-scale:0.66] sm:[--tray-scale:0.95] lg:[--tray-scale:1.12]" />
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ 08 showrooms
export function ShowroomsStrip() {
  return (
    <section data-theme="light" className="py-28 md:py-36">
      <div className="container-x">
        <SectionNo no="07" label="Showrooms" className="text-stone" />
        <Lines as="h2" className="display mt-6 text-[clamp(2.6rem,5.5vw,5.4rem)]" lines={["Touch the", <em key="e" className="display-italic">difference.</em>]} />
        <div className="mt-14 grid gap-px overflow-hidden rounded-[3px] bg-hairline md:grid-cols-3">
          {SHOWROOMS.map((s, i) => (
            <div key={s.id} className="bg-porcelain p-7" data-reveal style={{ ["--d" as string]: `${i * 100}ms` }}>
              <p className="display text-[40px]">{s.city}</p>
              <ShowroomStatus city={s.id} className="mt-3 text-stone" />
              <p className="mt-6 text-[15px]">
                {s.street}
                <br />
                {s.suburb} {s.postcode}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <a href={s.phoneHref} className="btn btn-ink !min-h-10 !px-4 !text-[14px]">
                  Call
                </a>
                <a href={s.mapsUrl} target="_blank" rel="noopener" className="btn btn-line !min-h-10 !px-4 !text-[14px]">
                  <span>Directions</span>
                </a>
              </div>
            </div>
          ))}
        </div>
        <Link href="/showrooms/" className="link-u mt-8 inline-block text-[15px]">
          Hours and booking a visit
        </Link>
      </div>
    </section>
  );
}
