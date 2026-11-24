"use client";
import { useEffect, useState } from "react";
import { asset } from "@/lib/asset";

/**
 * ≤2s, skippable, once per session: a macro slab edge, a laser line travels along it
 * sealing the edge ("Zero Glue Line"), then the view pulls back as the logo resolves.
 */
export function Preloader() {
  const [state, setState] = useState<"hidden" | "run" | "out">("hidden");
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("up-intro") === "1";
      sessionStorage.setItem("up-intro", "1");
    } catch {
      /* ignore */
    }
    if (seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setState("run");
    const t1 = setTimeout(() => setState("out"), 1750);
    const t2 = setTimeout(() => setState("hidden"), 2500);
    return () => (clearTimeout(t1), clearTimeout(t2));
  }, []);
  if (state === "hidden") return null;
  return (
    <div className={`fixed inset-0 z-[90] bg-ink transition-[clip-path] duration-700 ease-[cubic-bezier(.22,1,.36,1)] ${state === "out" ? "[clip-path:inset(0_0_100%_0)]" : "[clip-path:inset(0)]"}`} role="presentation">
      <div className="absolute inset-0 grid place-items-center overflow-hidden">
        <div className="pre-edge relative h-[28vh] w-[140vw]">
          <div className="absolute inset-x-0 top-0 h-[72%]" style={{ backgroundImage: `url(${asset("/tex/oxid-nero-real-stone.jpg")})`, backgroundSize: "40% auto" }} />
          <div className="absolute inset-x-0 bottom-0 h-[28%] bg-[#2a2826]" style={{ backgroundImage: `url(${asset("/tex/oxid-nero-real-stone.jpg")})`, backgroundSize: "40% auto", filter: "brightness(.55)" }} />
          <div className="pre-seal absolute bottom-[28%] left-0 h-px bg-champagne" />
          <div className="pre-laser absolute bottom-[28%] h-[3px] w-24 -translate-y-px rounded-full bg-[#ffe2b0] shadow-[0_0_24px_6px_rgba(255,214,150,.65)]" />
        </div>
      </div>
      <img src={asset("/brand/Logo_UNIPANEL_white.png")} alt="UnipanelSA" className="pre-logo absolute left-1/2 top-1/2 w-[min(360px,70vw)] -translate-x-1/2 -translate-y-1/2" />
      <p className="eyebrow pre-cap absolute bottom-10 left-1/2 -translate-x-1/2 text-stone-light">Zero Glue Line</p>
      <button onClick={() => setState("hidden")} className="eyebrow absolute right-6 top-6 text-stone-light hover:text-porcelain">
        Skip intro
      </button>
      <style>{`
        .pre-edge{animation:pre-pull 1.75s cubic-bezier(.22,1,.36,1) forwards}
        .pre-laser{animation:pre-laser 1.05s cubic-bezier(.6,0,.2,1) forwards}
        .pre-seal{animation:pre-seal 1.05s cubic-bezier(.6,0,.2,1) forwards}
        .pre-logo{opacity:0;animation:pre-logo .6s 1.05s cubic-bezier(.22,1,.36,1) forwards}
        .pre-cap{opacity:0;animation:pre-logo .5s .3s forwards}
        @keyframes pre-laser{from{left:-6rem}to{left:100%}}
        @keyframes pre-seal{from{width:0}to{width:100%}}
        @keyframes pre-pull{0%,55%{transform:scale(1);opacity:1}100%{transform:scale(.22);opacity:.0}}
        @keyframes pre-logo{from{opacity:0;filter:blur(8px)}to{opacity:1;filter:blur(0)}}
      `}</style>
    </div>
  );
}
