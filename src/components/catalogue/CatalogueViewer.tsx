"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { asset } from "@/lib/asset";
import { CATALOGUE_PAGES, CATALOGUE_PDF } from "@/data/catalogue-book";
import { hasWebGL } from "@/components/three/quality";
import { playPageFlip } from "@/lib/audio/pageFlip";
import { BrandLoader } from "@/components/ui/BrandLoader";

const FlipBook = dynamic(() => import("./FlipBook"), { ssr: false, loading: () => <BrandLoader label="Opening the catalogue" compact /> });
const SHEETS = Math.ceil(CATALOGUE_PAGES / 2);
const page = (n: number) => asset(`/catalogue/pages/p-${String(n).padStart(2, "0")}.jpg`);

export function CatalogueViewer() {
  const [spread, setSpread] = useState(0); // 0 = closed (cover), k = after k sheets turned
  const [dir, setDir] = useState<1 | -1 | 0>(0);
  const [gl, setGl] = useState(true);
  const touch = useRef<number | null>(null);
  const router = useRouter();
  const open = spread > 0 || dir !== 0;
  const [sound, setSound] = useState(true);
  const [reading, setReading] = useState(false);
  const [zoom, setZoom] = useState(false);
  useEffect(() => {
    try {
      setSound(localStorage.getItem("unipanel-flip-sound") !== "off");
    } catch {
      /* ignore */
    }
  }, []);
  const toggleSound = () => {
    setSound((v) => {
      try {
        localStorage.setItem("unipanel-flip-sound", v ? "off" : "on");
      } catch {
        /* ignore */
      }
      return !v;
    });
  };
  const flipSound = useCallback((cover: boolean) => sound && playPageFlip(cover ? "cover" : "page"), [sound]);
  useEffect(() => setGl(hasWebGL()), []);

  const next = useCallback(() => {
    if (dir !== 0 || spread >= SHEETS) return;
    flipSound(spread === 0 || spread === SHEETS - 1);
    setDir(1);
  }, [dir, spread, flipSound]);
  const prev = useCallback(() => {
    if (dir !== 0 || spread <= 0) return;
    flipSound(spread === 1 || spread === SHEETS);
    setDir(-1);
  }, [dir, spread, flipSound]);
  const done = useCallback(() => {
    setSpread((s) => s + (dir === 1 ? 1 : -1));
    setDir(0);
  }, [dir]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === "Escape") setReading(false);
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [next, prev]);

  const left = spread > 0 ? 2 * spread : 0;
  const right = spread < SHEETS && 2 * spread + 1 <= CATALOGUE_PAGES ? 2 * spread + 1 : 0;
  const label = spread === 0 ? "Cover" : right ? `${left}–${right} / ${CATALOGUE_PAGES}` : `${left} / ${CATALOGUE_PAGES}`;

  return (
    <>
      <section data-theme="dark" className="section-dark relative pt-[var(--nav-h)]">
        <div className="container-x flex flex-wrap items-end justify-between gap-6 pb-6 pt-10">
          <div>
            <p className="eyebrow text-champagne">Product Catalogue · {new Date().getFullYear()}</p>
            <h1 className="display mt-4 text-[clamp(2.8rem,6vw,6rem)]">
              Leaf through <em className="display-italic text-champagne">every surface.</em>
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={asset(CATALOGUE_PDF)} download className="btn btn-light">
              Download the catalogue (PDF)
            </a>
          </div>
        </div>

        <div
          className="relative h-[min(80svh,860px)] w-full select-none bg-[#070707]"
          onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touch.current === null) return;
            const dx = e.changedTouches[0].clientX - touch.current;
            if (dx < -40) next();
            if (dx > 40) prev();
            touch.current = null;
          }}
        >
          {gl ? (
            <FlipBook spread={spread} dir={dir} onDone={done} onOpen={next} onSample={(id) => router.push(`/finishes/${id}/`)} />
          ) : (
            <div className="flex h-full items-center justify-center gap-1 px-4">
              {left > 0 && <img src={page(left)} alt={`Catalogue page ${left}`} className="max-h-full w-1/2 max-w-[640px] object-contain" />}
              {right > 0 && <img src={page(right)} alt={`Catalogue page ${right}`} className="max-h-full w-1/2 max-w-[640px] object-contain" />}
            </div>
          )}
          {/* once open, tap either side of the book to turn */}
          {open && (
            <>
              <button className="absolute inset-y-[12%] left-[8%] w-[42%] cursor-w-resize" aria-label="Previous pages" onClick={prev} disabled={spread === 0} />
              <button className="absolute inset-y-[12%] right-[8%] w-[42%] cursor-e-resize" aria-label="Next pages" onClick={next} disabled={spread >= SHEETS} />
            </>
          )}
          {!open && (
            <p className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 rounded-full bg-black/55 px-4 py-2 text-[13px] text-porcelain backdrop-blur">
              Click the catalogue to open it · tap a sample to see the finish
            </p>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
            <div className="glass pointer-events-auto flex max-w-[calc(100vw-24px)] items-center gap-0.5 whitespace-nowrap rounded-full p-1 text-porcelain sm:gap-1">
              {open ? (
                <button onClick={() => (flipSound(true), setDir(0), setSpread(0))} className="h-10 rounded-full px-4 text-[13px] hover:bg-white/10">
                  Close
                </button>
              ) : (
                <button onClick={next} className="h-10 rounded-full bg-porcelain px-4 text-[13px] text-ink">
                  Open
                </button>
              )}
              <button onClick={prev} disabled={spread === 0} className="h-10 rounded-full px-3 text-[13px] hover:bg-white/10 disabled:opacity-40 sm:px-4" aria-label="Previous pages">
                ←<span className="hidden sm:inline"> Prev</span>
              </button>
              <span className="min-w-[96px] px-1 text-center font-mono text-[13px] sm:min-w-[150px] sm:px-2" aria-live="polite">
                {label}
              </span>
              <button onClick={next} disabled={spread >= SHEETS} className="h-10 rounded-full px-3 text-[13px] hover:bg-white/10 disabled:opacity-40 sm:px-4" aria-label="Next pages">
                <span className="hidden sm:inline">Next </span>→
              </button>
              <span className="h-5 w-px bg-white/15" />
              <button onClick={() => (setZoom(false), setReading(true))} className="h-10 rounded-full bg-champagne px-3.5 text-[13px] text-ink">
                Read
              </button>
              <button onClick={toggleSound} aria-pressed={sound} aria-label={sound ? "Turn page sound off" : "Turn page sound on"} className="h-10 rounded-full px-3 text-[13px] hover:bg-white/10">
                {sound ? "Sound" : "Muted"}
              </button>
            </div>
          </div>
        </div>
        <p className="caption container-x pt-4 text-champagne sm:hidden">Turn your phone sideways for a larger view, or tap any page below.</p>
        <p className="caption container-x pb-10 pt-4 text-stone-light">Click or swipe either side of the book, or use the arrow keys. Board sizes, cores and origins as published by UnipanelSA; confirm specifications with your showroom.</p>
      </section>

      {/* Read mode: the current spread at full resolution, crisp and zoomable */}
      {reading && (
        <div role="dialog" aria-modal="true" aria-label="Read catalogue pages" className="fixed inset-0 z-[95] flex flex-col bg-[#0a0a0a] text-porcelain">
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            <p className="font-mono text-[13px] text-stone-light">{label}</p>
            <div className="flex items-center gap-1">
              <button onClick={prev} disabled={spread === 0 || dir !== 0} className="h-10 rounded-full px-4 text-[13px] hover:bg-white/10 disabled:opacity-40" aria-label="Previous pages">
                ←
              </button>
              <button onClick={next} disabled={spread >= SHEETS || dir !== 0} className="h-10 rounded-full px-4 text-[13px] hover:bg-white/10 disabled:opacity-40" aria-label="Next pages">
                →
              </button>
              <button onClick={() => setZoom((z) => !z)} className="h-10 rounded-full px-4 text-[13px] hover:bg-white/10" aria-pressed={zoom}>
                {zoom ? "Fit" : "Zoom"}
              </button>
              <a href={asset(CATALOGUE_PDF)} download className="hidden h-10 rounded-full px-4 text-[13px] leading-10 hover:bg-white/10 sm:inline-block">
                PDF
              </a>
              <button onClick={() => setReading(false)} className="h-10 rounded-full bg-porcelain px-4 text-[13px] text-ink" autoFocus>
                Close
              </button>
            </div>
          </div>
          <div className={`flex-1 overflow-auto ${zoom ? "" : "grid place-items-center"}`}>
            <div className={`flex gap-1 p-3 ${zoom ? "w-[220vw] flex-col sm:w-[200vw] sm:flex-row" : "max-h-full w-full max-w-[1800px] flex-col items-center sm:flex-row sm:justify-center"}`}>
              {[left, right].filter(Boolean).map((n) => (
                <img
                  key={n}
                  src={page(n)}
                  alt={`Catalogue page ${n}`}
                  onClick={() => setZoom((z) => !z)}
                  className={`cursor-zoom-in bg-white shadow-2xl ${zoom ? "w-full cursor-zoom-out" : "max-h-[calc(100svh-90px)] w-full object-contain sm:w-1/2"}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* every page, for quick browsing and accessibility */}
      <section data-theme="light" className="py-20">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="display text-[clamp(2rem,4vw,3.4rem)]">All {CATALOGUE_PAGES} pages</h2>
            <a href={asset(CATALOGUE_PDF)} download className="btn btn-ink">
              Download PDF
            </a>
          </div>
          <ol className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: CATALOGUE_PAGES }, (_, i) => i + 1).map((n) => (
              <li key={n}>
                <button
                  onClick={() => {
                    setDir(0);
                    setSpread(Math.floor(n / 2));
                    setZoom(false);
                    setReading(true);
                  }}
                  className="group block w-full text-left"
                >
                  <img src={page(n)} alt={`Catalogue page ${n}`} loading="lazy" className="w-full rounded-[3px] shadow-sm ring-1 ring-hairline transition-transform duration-500 group-hover:-translate-y-1" />
                  <span className="caption mt-2 block text-stone">Page {n}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
