"use client";
import { useEffect, useRef, useState } from "react";
import { finishById } from "@/data/catalogue";
import type { Finish } from "@/data/types";

/**
 * A presentation tray in CSS 3D: an open black box with two banks of slots and real
 * board samples standing in them, each wrapped with a dark spec band (name + code).
 * Samples drop into their slots when the tray scrolls into view.
 */

type Face = { w: number; h: number; t: string; style?: React.CSSProperties; children?: React.ReactNode };

function Box({ w, h, d, at, faces, className = "" }: { w: number; h: number; d: number; at: string; faces: Partial<Record<"front" | "back" | "left" | "right" | "top" | "bottom", React.CSSProperties & { children?: React.ReactNode }>>; className?: string }) {
  const list: (Face & { key: string })[] = [
    { key: "front", w, h, t: `translateZ(${d / 2}px)` },
    { key: "back", w, h, t: `rotateY(180deg) translateZ(${d / 2}px)` },
    { key: "right", w: d, h, t: `rotateY(90deg) translateZ(${w / 2}px)` },
    { key: "left", w: d, h, t: `rotateY(-90deg) translateZ(${w / 2}px)` },
    { key: "top", w, h: d, t: `rotateX(90deg) translateZ(${h / 2}px)` },
    { key: "bottom", w, h: d, t: `rotateX(-90deg) translateZ(${h / 2}px)` },
  ];
  return (
    <div className={`absolute left-1/2 top-1/2 ${className}`} style={{ transformStyle: "preserve-3d", transform: at }}>
      {list.map((f) => {
        const s = faces[f.key as keyof typeof faces];
        if (!s) return null;
        const { children, ...style } = s;
        return (
          <div key={f.key} className="absolute" style={{ width: f.w, height: f.h, left: -f.w / 2, top: -f.h / 2, transform: f.t, backfaceVisibility: "hidden", ...style }}>
            {children}
          </div>
        );
      })}
    </div>
  );
}

const TRAY = { w: 480, d: 420, wall: 62, t: 14 };
const CHIP = { w: 176, h: 128, d: 20 };
const ROWS = [-150, -92, -34, 24];
const COLS = [-110, 110];

function Chip({ f, x, z, seated, delay }: { f: Finish; x: number; z: number; seated: boolean; delay: number }) {
  const tex = f.flat ? { background: f.hex } : { backgroundImage: `url(${f.textures.tex})`, backgroundSize: "cover", backgroundPosition: "center" };
  const side = { ...tex, filter: "brightness(.72)" };
  const yUp = CHIP.h / 2 - 22; // bottom sits in the slot
  const band = (
    <div className="absolute inset-x-[16%] top-[30%] flex h-[34%] flex-col justify-center bg-[#151514] px-2 text-left shadow-[0_1px_0_rgba(255,255,255,.06)_inset]">
      <span className="block truncate text-[13px] leading-tight text-porcelain">{f.name}</span>
      <span className="block truncate font-mono text-[13px] leading-tight text-champagne">{f.code ?? f.category.split(" ").pop()}</span>
    </div>
  );
  return (
    <div
      className="absolute left-0 top-0 transition-transform duration-[1100ms] ease-[cubic-bezier(.22,1,.36,1)]"
      style={{ transformStyle: "preserve-3d", transform: `translate3d(${x}px, ${seated ? -yUp : -yUp - 220}px, ${z}px)`, transitionDelay: `${delay}ms`, opacity: seated ? 1 : 0, transitionProperty: "transform, opacity" }}
    >
      <Box
        w={CHIP.w}
        h={CHIP.h}
        d={CHIP.d}
        at="none"
        faces={{
          front: { ...tex, children: band, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.15)" },
          back: tex,
          top: { ...tex, filter: "brightness(1.08)" },
          left: side,
          right: side,
        }}
      />
    </div>
  );
}

export function SampleTray({ ids, animate = true, className = "", label = true }: { ids: string[]; animate?: boolean; className?: string; label?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seated, setSeated] = useState(!animate);
  useEffect(() => {
    if (!animate) return;
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setSeated(true);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeated(true), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [animate]);

  const chips = ids.map((id) => finishById(id)).filter(Boolean).slice(0, 8) as Finish[];
  const dark = { background: "#1b1b1a" };
  const darker = { background: "#121211" };
  const wallFace = { background: "linear-gradient(180deg,#232322,#171716)" };

  return (
    <div ref={ref} className={`relative aspect-square w-full ${className}`} style={{ perspective: "2200px" }} aria-label={`Sample tray with ${chips.length} finish${chips.length === 1 ? "" : "es"}: ${chips.map((c) => c.name).join(", ")}`} role="img">
      <div className="absolute left-1/2 top-[56%] h-0 w-0" style={{ transformStyle: "preserve-3d", transform: "rotateX(-28deg) rotateY(-34deg) scale(var(--tray-scale,1))" }}>
        {/* floor of the tray with slot grooves */}
        <Box w={TRAY.w} h={TRAY.t} d={TRAY.d} at={`translate3d(0, ${TRAY.t / 2}px, 0)`} faces={{ top: { ...darker, children: (
          <div className="absolute inset-0">
            {COLS.map((cx) =>
              [...ROWS, 82, 140].map((rz) => (
                <div key={`${cx}${rz}`} className="absolute bg-black shadow-[inset_0_2px_3px_rgba(0,0,0,.9)]" style={{ width: CHIP.w + 8, height: CHIP.d + 8, left: TRAY.w / 2 + cx - (CHIP.w + 8) / 2, top: TRAY.d / 2 + rz - (CHIP.d + 8) / 2 }} />
              )),
            )}
          </div>
        ) }, bottom: darker }} />
        {/* outer walls */}
        <Box w={TRAY.w} h={TRAY.wall} d={TRAY.t} at={`translate3d(0, ${-TRAY.wall / 2 + TRAY.t}px, ${TRAY.d / 2 - TRAY.t / 2}px)`} faces={{ front: wallFace, top: dark, back: darker }} />
        <Box w={TRAY.w} h={TRAY.wall} d={TRAY.t} at={`translate3d(0, ${-TRAY.wall / 2 + TRAY.t}px, ${-TRAY.d / 2 + TRAY.t / 2}px)`} faces={{ front: darker, top: dark, back: wallFace }} />
        <Box w={TRAY.t} h={TRAY.wall} d={TRAY.d} at={`translate3d(${TRAY.w / 2 - TRAY.t / 2}px, ${-TRAY.wall / 2 + TRAY.t}px, 0)`} faces={{ right: { background: "#141413" }, top: dark, left: darker }} />
        <Box w={TRAY.t} h={TRAY.wall} d={TRAY.d} at={`translate3d(${-TRAY.w / 2 + TRAY.t / 2}px, ${-TRAY.wall / 2 + TRAY.t}px, 0)`} faces={{ left: { background: "#1d1d1c" }, top: dark, right: darker }} />
        {/* centre divider */}
        <Box w={6} h={TRAY.wall - 18} d={TRAY.d - TRAY.t * 2} at={`translate3d(0, ${-(TRAY.wall - 18) / 2 + TRAY.t}px, 0)`} faces={{ top: dark, left: darker, right: darker }} />
        {chips.map((f, i) => (
          <Chip key={f.id} f={f} x={COLS[i % 2]} z={ROWS[Math.floor(i / 2)]} seated={seated} delay={200 + i * 110} />
        ))}
      </div>
      {label && (
        <div className="pointer-events-none absolute bottom-[6%] left-1/2 -translate-x-1/2 text-center">
          <p className="font-mono text-[13px] tracking-[0.2em] text-stone-light">UNIPANEL SA · SAMPLE BOX</p>
        </div>
      )}
    </div>
  );
}
