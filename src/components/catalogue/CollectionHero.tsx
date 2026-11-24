"use client";
import { useEffect, useRef, useState } from "react";
import type { Collection } from "@/data/collections";
import { finishById } from "@/data/catalogue";
import type { Finish } from "@/data/types";

/**
 * One template, nine art directions. Each collection gets its own hero behaviour:
 * matte fades, gloss follows the cursor with a light, metal streaks with scroll,
 * woodgrain runs sideways, marble is bookmatched, textured rakes light, Italian is
 * an editorial spread, stone stacks in strata, glass layers frosted depth.
 */
export function CollectionHero({ c, count }: { c: Collection; count: number }) {
  const hero = c.hero.map((id) => finishById(id)!).filter(Boolean);
  const Title = (
    <>
      <p className="eyebrow opacity-70">
        Collection {c.no} · {count} finishes{c.group ? " · Exclusive Range" : ""}
      </p>
      <h1 className="display mt-6 text-[clamp(3.2rem,9vw,9.4rem)]" data-reveal-group>
        <span className="mask">
          <span data-line>{c.headline[0]}</span>
        </span>
        <span className="mask">
          <span data-line style={{ ["--d" as string]: "120ms" }}>
            <em className="display-italic">{c.headline[1]}</em>
          </span>
        </span>
      </h1>
      <p className="lede mt-8 max-w-xl opacity-80">{c.intro}</p>
    </>
  );
  switch (c.id) {
    case "matte":
      return <MatteHero hero={hero}>{Title}</MatteHero>;
    case "gloss":
      return <GlossHero hero={hero}>{Title}</GlossHero>;
    case "metal":
      return <MetalHero hero={hero}>{Title}</MetalHero>;
    case "woodgrain":
      return <WoodHero hero={hero}>{Title}</WoodHero>;
    case "marble":
      return <MarbleHero hero={hero}>{Title}</MarbleHero>;
    case "textured":
      return <TexturedHero hero={hero}>{Title}</TexturedHero>;
    case "premium-italian":
      return <ItalianHero hero={hero} c={c} count={count} />;
    case "real-stone":
      return <StoneHero hero={hero}>{Title}</StoneHero>;
    case "real-glass":
      return <GlassHero hero={hero}>{Title}</GlassHero>;
  }
}

type HP = { hero: Finish[]; children?: React.ReactNode };
const bg = (f: Finish) => (f.flat ? { background: f.hex } : { backgroundImage: `url(${f.textures.tex})`, backgroundSize: "cover", backgroundPosition: "center" });

function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setY(window.scrollY);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return y;
}

function MatteHero({ hero, children }: HP) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % hero.length), 3200);
    return () => clearInterval(t);
  }, [hero.length]);
  return (
    <section data-theme="light" className="relative overflow-hidden bg-porcelain pb-24 pt-[calc(var(--nav-h)+10vh)]">
      {hero.map((f, k) => (
        <div key={f.id} aria-hidden className="absolute -right-[10vw] top-[8vh] h-[80vh] w-[60vw] rounded-full blur-[80px] transition-opacity duration-[2400ms]" style={{ background: f.hex, opacity: i === k ? 0.55 : 0 }} />
      ))}
      <div className="container-x relative">{children}</div>
      <div className="container-x relative mt-16 grid grid-cols-4 gap-2">
        {hero.map((f, k) => (
          <button key={f.id} onMouseEnter={() => setI(k)} onFocus={() => setI(k)} className="text-left" aria-label={f.name}>
            <span className="block h-40 rounded-[3px] transition-transform duration-700 hover:-translate-y-1" style={{ background: f.hex }} />
            <span className="caption mt-2 block">{f.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function GlossHero({ hero, children }: HP) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    ref.current!.style.setProperty("--lx", `${((e.clientX - r.left) / r.width) * 100}%`);
    ref.current!.style.setProperty("--ly", `${((e.clientY - r.top) / r.height) * 100}%`);
  };
  return (
    <section data-theme="dark" className="section-dark relative overflow-hidden pb-24 pt-[calc(var(--nav-h)+10vh)]">
      <div className="container-x relative">{children}</div>
      <div ref={ref} onPointerMove={onMove} className="container-x relative mt-16 grid grid-cols-2 gap-2 md:grid-cols-4" style={{ ["--lx" as string]: "50%", ["--ly" as string]: "30%" }}>
        {hero.map((f) => (
          <div key={f.id} className="relative h-[46vh] overflow-hidden rounded-[3px]" style={bg(f)}>
            <div className="pointer-events-none absolute inset-0 mix-blend-screen" style={{ background: "radial-gradient(circle 220px at var(--lx) var(--ly), rgba(255,255,255,.55), transparent 70%)", backgroundAttachment: "fixed" }} />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_40%,rgba(255,255,255,.12)_48%,transparent_56%)]" />
            <span className="absolute bottom-3 left-3 rounded-sm bg-black/45 px-2 py-1 font-mono text-[13px]">{f.code ?? f.name}</span>
          </div>
        ))}
      </div>
      <p className="caption container-x mt-4 text-stone-light">Move across the panels: the light follows you, as it would on a gloss door.</p>
    </section>
  );
}

function MetalHero({ hero, children }: HP) {
  const y = useScrollY();
  return (
    <section data-theme="dark" className="section-dark relative overflow-hidden pb-24 pt-[calc(var(--nav-h)+10vh)]">
      <div className="container-x relative">{children}</div>
      <div className="container-x mt-16 grid gap-2 md:grid-cols-4">
        {hero.map((f, k) => (
          <div key={f.id} className="relative h-[52vh] overflow-hidden rounded-[3px]" style={{ background: f.hex }}>
            <div className="absolute inset-0 opacity-50 mix-blend-overlay" style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,.18) 0 1px, transparent 1px 3px)" }} />
            <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent ${20 + ((y * 0.06 + k * 18) % 60)}%, rgba(255,255,255,.35) ${28 + ((y * 0.06 + k * 18) % 60)}%, transparent ${36 + ((y * 0.06 + k * 18) % 60)}%)` }} />
            <span className="absolute bottom-3 left-3 font-mono text-[13px]">{f.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function WoodHero({ hero, children }: HP) {
  return (
    <section data-theme="light" className="relative overflow-hidden bg-[#efe8de] pb-24 pt-[calc(var(--nav-h)+10vh)]">
      <div className="container-x relative">{children}</div>
      <div className="mt-16 overflow-hidden">
        <div className="flex w-max animate-[grain_60s_linear_infinite] gap-2 motion-reduce:animate-none">
          {[...hero, ...hero].map((f, k) => (
            <div key={k} className="h-[38vh] w-[70vw] shrink-0 rounded-[3px] md:w-[44vw]" style={{ backgroundImage: `url(${f.textures.tex})`, backgroundSize: "auto 220%", backgroundPosition: "center", transform: "rotate(0deg)" }}>
              <span className="m-3 inline-block rounded-sm bg-black/40 px-2 py-1 font-mono text-[13px] text-porcelain">{f.code ? `${f.name} ${f.code}` : f.name}</span>
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes grain{to{transform:translateX(-50%)}}`}</style>
    </section>
  );
}

function MarbleHero({ hero, children }: HP) {
  const f = hero[0];
  return (
    <section data-theme="light" className="relative overflow-hidden pb-24 pt-[calc(var(--nav-h)+10vh)]">
      <div className="container-x relative grid gap-12 lg:grid-cols-2">
        <div>{children}</div>
        <div className="grid grid-cols-2" data-wipe>
          <div className="aspect-[1/2] rounded-l-[3px]" style={{ backgroundImage: `url(${f.textures.tex})`, backgroundSize: "200% auto", backgroundPosition: "right center" }} />
          <div className="aspect-[1/2] rounded-r-[3px]" style={{ backgroundImage: `url(${f.textures.tex})`, backgroundSize: "200% auto", backgroundPosition: "right center", transform: "scaleX(-1)" }} />
          <p className="caption col-span-2 mt-3 text-stone">Bookmatched: one face mirrored at the joint, as the Studio does across door pairs.</p>
        </div>
      </div>
    </section>
  );
}

function TexturedHero({ hero, children }: HP) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    ref.current!.style.setProperty("--lx", `${e.clientX - r.left}px`);
    ref.current!.style.setProperty("--ly", `${e.clientY - r.top}px`);
  };
  return (
    <section data-theme="dark" className="section-dark relative overflow-hidden pb-24 pt-[calc(var(--nav-h)+10vh)]">
      <div className="container-x relative">{children}</div>
      <div ref={ref} onPointerMove={onMove} className="container-x mt-16 grid gap-2 md:grid-cols-4" style={{ ["--lx" as string]: "50%", ["--ly" as string]: "50%" }}>
        {hero.map((f) => (
          <div key={f.id} className="group relative h-[50vh] overflow-hidden rounded-[3px]">
            <div className="absolute inset-0 transition-transform duration-[1600ms] group-hover:scale-[1.8]" style={{ backgroundImage: `url(${f.textures.tex})`, backgroundSize: "60%", filter: "contrast(1.15)" }} />
            {f.textures.normal && <div className="absolute inset-0 mix-blend-soft-light opacity-70 transition-transform duration-[1600ms] group-hover:scale-[1.8]" style={{ backgroundImage: `url(${f.textures.normal})`, backgroundSize: "60%" }} />}
            <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle 260px at var(--lx) var(--ly), rgba(255,240,220,.28), rgba(0,0,0,.35) 70%)" }} />
            <span className="absolute bottom-3 left-3 font-mono text-[13px]">{f.code ? `${f.name} ${f.code}` : f.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ItalianHero({ hero, c, count }: { hero: Finish[]; c: Collection; count: number }) {
  return (
    <section data-theme="light" className="relative overflow-hidden pb-20 pt-[calc(var(--nav-h)+6vh)]">
      <div className="container-x grid-12 gap-y-10">
        <div className="col-span-12 flex items-baseline justify-between border-b border-ink pb-3">
          <p className="display-italic text-[22px]">Nuova collezione</p>
          <p className="eyebrow">
            N° {c.no} · {count} finiture
          </p>
        </div>
        <div className="col-span-12 lg:col-span-7">
          <div className="aspect-[4/5] overflow-hidden rounded-[2px]" data-wipe style={bg(hero[0])} />
          <p className="caption mt-2 text-stone">{hero[0].name}, in copertina.</p>
        </div>
        <div className="col-span-12 flex flex-col justify-between lg:col-span-5">
          <div>
            <h1 className="display text-[clamp(3.4rem,7vw,7.6rem)]">
              Premium
              <br />
              <em className="display-italic">Italian</em>
              <br />
              Range
            </h1>
            <p className="lede mt-8 max-w-md text-stone">{c.intro}</p>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-2">
            {hero.slice(1).map((f) => (
              <figure key={f.id}>
                <div className="aspect-[3/4] rounded-[2px]" style={bg(f)} />
                <figcaption className="caption mt-1.5">{f.name}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StoneHero({ hero, children }: HP) {
  const y = useScrollY();
  return (
    <section data-theme="dark" className="section-dark relative overflow-hidden pb-24 pt-[calc(var(--nav-h)+10vh)]">
      <div className="container-x relative z-10">{children}</div>
      <div className="relative mt-16 h-[60vh]">
        {hero.map((f, k) => (
          <div key={f.id} className="absolute inset-x-0 h-[22vh] shadow-[0_-20px_40px_rgba(0,0,0,.5)]" style={{ ...bg(f), top: `${k * 12}vh`, transform: `translateX(${(k % 2 ? 1 : -1) * Math.min(80, y * 0.04 * (k + 1))}px)` }}>
            <span className="m-4 inline-block rounded-sm bg-black/45 px-2 py-1 font-mono text-[13px]">{f.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function GlassHero({ hero, children }: HP) {
  return (
    <section data-theme="dark" className="section-dark relative overflow-hidden pb-24 pt-[calc(var(--nav-h)+10vh)]">
      <div className="container-x relative z-10">{children}</div>
      <div className="container-x relative mt-16 h-[56vh]">
        {hero.map((f, k) => (
          <div key={f.id} className="absolute h-[44vh] w-[40%] rounded-[4px] border border-white/20 shadow-2xl" style={{ left: `${k * 18}%`, top: `${(k % 2) * 8}vh`, background: f.hex, zIndex: k }}>
            <div className="absolute inset-0 rounded-[4px] bg-gradient-to-br from-white/35 via-white/5 to-transparent" />
            {k > 0 && <div className="absolute inset-0 rounded-[4px] backdrop-blur-[2px]" />}
            <span className="absolute bottom-3 left-3 font-mono text-[13px] text-porcelain mix-blend-difference">{f.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
