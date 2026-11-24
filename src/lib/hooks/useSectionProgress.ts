"use client";
import { useEffect, useRef, useState, type RefObject } from "react";

/** 0..1 progress of a tall section scrolling past a sticky viewport. Writes to a ref every frame (no re-render) and optionally to state. */
export function useSectionProgress(ref: RefObject<HTMLElement | null>, opts: { state?: boolean } = {}) {
  const progress = useRef(0);
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = ref.current;
      if (el) {
        const r = el.getBoundingClientRect();
        const span = Math.max(1, r.height - window.innerHeight);
        const p = Math.min(1, Math.max(0, -r.top / span));
        if (Math.abs(p - progress.current) > 0.0005) {
          progress.current = p;
          if (opts.state) setValue(p);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ref, opts.state]);
  return { progress, value };
}

/** True once the element is within `margin` of the viewport (and false again when far away). */
export function useNear(ref: RefObject<HTMLElement | null>, margin = "50%") {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: `${margin} 0px ${margin} 0px` });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
  return near;
}

export function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setR(m.matches);
    const on = () => setR(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return r;
}

/** Becomes true once the element comes within `margin` of the viewport, then stays true (no remount cost on scroll-back). */
export function useNearOnce(ref: RefObject<HTMLElement | null>, margin = "150%") {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setNear(true);
        io.disconnect();
      }
    }, { rootMargin: `${margin} 0px ${margin} 0px` });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin, near]);
  return near;
}
