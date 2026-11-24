"use client";
import { useEffect, useRef, useState } from "react";
import { asset } from "@/lib/asset";
import { BrandLoader } from "@/components/ui/BrandLoader";

const MIN_MS = 1100; // long enough to read as intentional
const MAX_MS = 2400; // never hold the visitor longer than this

/**
 * Intro, once per visit and skippable. It is in the server-rendered HTML (no flash of
 * the hero first); an inline script in the layout hides it straight away for visitors
 * who have already seen it this session. Progress is real: the hero's textures, the
 * fonts and the 3D code are preloaded while the line fills.
 */
export function Preloader() {
  const [progress, setProgress] = useState(0); // what the visitor sees, eased
  const target = useRef(0); // how much has actually loaded
  const [phase, setPhase] = useState<"run" | "leave" | "done">("run");

  useEffect(() => {
    const html = document.documentElement;
    if (html.classList.contains("intro-seen") || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("done");
      return;
    }
    try {
      sessionStorage.setItem("up-intro", "1");
    } catch {
      /* ignore */
    }
    document.documentElement.style.overflow = "hidden";
    const start = performance.now();
    const jobs: Promise<unknown>[] = [
      ...["calacatta-bianco", "black-matte", "woodline-02"].map(
        (id) =>
          new Promise((res) => {
            const i = new Image();
            i.onload = i.onerror = res;
            i.src = asset(`/tex/${id}.jpg`);
          }),
      ),
      document.fonts?.ready ?? Promise.resolve(),
      import("@/components/home/HeroSlabCanvas"),
    ];
    let done = 0;
    let loaded = false;
    let shown = 0;
    let raf = 0;
    let last = start;
    // the line eases toward what has loaded, never faster than a full sweep in MIN_MS
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      const goal = loaded ? 1 : Math.min(0.94, Math.max(target.current, (now - start) / MAX_MS));
      shown = Math.min(goal, shown + Math.max((goal - shown) * (1 - Math.exp(-dt / 160)), dt / 20000), shown + dt / MIN_MS);
      setProgress(shown);
      if (shown >= 0.999) {
        setTimeout(() => setPhase("leave"), 220);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    jobs.forEach((j) =>
      Promise.resolve(j)
        .catch(() => {})
        .then(() => {
          done++;
          target.current = done / jobs.length;
          if (done === jobs.length) loaded = true;
        }),
    );
    const cap = setTimeout(() => (loaded = true), MAX_MS); // never wait on a slow asset
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(cap);
    };
  }, []);

  useEffect(() => {
    if (phase === "leave") {
      const t = setTimeout(() => setPhase("done"), 1000);
      return () => clearTimeout(t);
    }
    if (phase === "done") document.documentElement.style.overflow = "";
  }, [phase]);

  if (phase === "done") return null;
  return (
    <div className="intro-loader fixed inset-0 z-[90]" role="progressbar" aria-label="Loading UnipanelSA" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
      <BrandLoader progress={progress} leaving={phase === "leave"} />
      <button onClick={() => setPhase("leave")} className="eyebrow absolute right-6 top-6 z-10 text-stone-light hover:text-porcelain sm:right-10">
        Skip intro
      </button>
    </div>
  );
}
