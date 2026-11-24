"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

/** Lenis smooth scroll driven by the GSAP ticker; off for reduced motion and inside the Studio. */
export function SmoothScroll() {
  const path = usePathname();
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (path?.startsWith("/studio")) return;
    const lenis = new Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, [path]);

  useEffect(() => {
    window.scrollTo(0, 0);
    const t = setTimeout(() => ScrollTrigger.refresh(), 300);
    return () => clearTimeout(t);
  }, [path]);
  return null;
}

/**
 * Desktop-only cursor: a small ring that grows into a material loupe over any element
 * with data-loupe="<texture url>", showing that texture magnified under the pointer.
 */
export function Cursor() {
  const ring = useRef<HTMLDivElement>(null);
  const loupe = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    document.documentElement.classList.add("has-cursor");
    let x = innerWidth / 2,
      y = innerHeight / 2,
      rx = x,
      ry = y;
    let target: HTMLElement | null = null;
    let raf = 0;
    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      const t = (e.target as HTMLElement)?.closest?.("[data-loupe]") as HTMLElement | null;
      if (t !== target) {
        target = t;
        if (loupe.current) {
          loupe.current.style.backgroundImage = t ? `url("${t.dataset.loupe}")` : "none";
          loupe.current.style.opacity = t ? "1" : "0";
        }
        ring.current?.classList.toggle("is-loupe", !!t);
      }
      const hot = (e.target as HTMLElement)?.closest?.("a,button,[role=button],input,select,textarea,label");
      ring.current?.classList.toggle("is-hot", !!hot && !t);
    };
    const tick = () => {
      rx += (x - rx) * 0.2;
      ry += (y - ry) * 0.2;
      if (ring.current) ring.current.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      if (target && loupe.current) {
        const r = target.getBoundingClientRect();
        const px = ((x - r.left) / r.width) * 100;
        const py = ((y - r.top) / r.height) * 100;
        loupe.current.style.backgroundPosition = `${px}% ${py}%`;
      }
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", move);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove("has-cursor");
    };
  }, []);
  return (
    <div ref={ring} aria-hidden className="cursor-ring pointer-events-none fixed left-0 top-0 z-[100] hidden [@media(hover:hover)_and_(pointer:fine)]:block">
      <div ref={loupe} className="cursor-loupe" />
      <style>{`
        .cursor-ring{width:14px;height:14px;border:1px solid rgba(228, 192, 32,.95);border-radius:999px;mix-blend-mode:normal;transition:width .45s cubic-bezier(.22,1,.36,1),height .45s cubic-bezier(.22,1,.36,1),background-color .25s,border-color .25s;}
        .cursor-ring.is-hot{width:42px;height:42px;background:rgba(228, 192, 32,.12)}
        .cursor-ring.is-loupe{width:150px;height:150px;border-color:rgba(244,241,236,.9);box-shadow:0 18px 50px rgba(0,0,0,.35)}
        .cursor-loupe{position:absolute;inset:3px;border-radius:999px;background-size:520%;opacity:0;transition:opacity .3s}
      `}</style>
    </div>
  );
}
