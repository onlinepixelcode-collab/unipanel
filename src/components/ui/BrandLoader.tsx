"use client";
import { asset } from "@/lib/asset";

const STRIPS = ["calacatta-bianco", "black-matte", "nogal-rosales-02", "champagne-metal", "oxid-nero-real-stone"];

/**
 * The branded loading visual shared by the intro, the Studio and the catalogue:
 * five real board renders rise into a material wall behind the logo, and a yellow
 * laser line seals across as loading progresses.
 * `progress` 0..1 drives the line and counter; omit it for an indeterminate shimmer.
 */
export function BrandLoader({ progress, label, leaving = false, compact = false }: { progress?: number; label?: string; leaving?: boolean; compact?: boolean }) {
  const p = progress === undefined ? null : Math.max(0, Math.min(1, progress));
  return (
    <div className={`bl-root absolute inset-0 overflow-hidden bg-ink text-porcelain ${leaving ? "bl-leaving" : ""}`}>
      {/* the material wall */}
      <div className="absolute inset-0 grid grid-cols-5 gap-[2px]" aria-hidden>
        {STRIPS.map((id, i) => (
          <div key={id} className="bl-strip relative overflow-hidden" style={{ ["--i" as string]: i }}>
            <img src={asset(`/swatch/${id}.webp`)} alt="" className="absolute inset-0 h-full w-full scale-[1.35] object-cover" />
            <div className="absolute inset-0 bg-ink/45" />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(15,15,14,.55),rgba(15,15,14,.2)_45%,rgba(15,15,14,.85)_100%)]" aria-hidden />

      {/* logo + seal line */}
      <div className="bl-center absolute inset-0 flex flex-col items-center justify-center px-6">
        <img src={asset("/brand/Logo_UNIPANEL_white.png")} alt="UnipanelSA" className={`bl-logo w-auto ${compact ? "h-8" : "h-10 sm:h-14"}`} />
        <div className="relative mt-8 h-px w-[min(320px,70vw)] bg-white/15">
          {p === null ? (
            <div className="bl-shimmer absolute inset-y-0 w-1/3 bg-champagne" />
          ) : (
            <>
              <div className="absolute inset-y-0 left-0 bg-champagne " style={{ width: `${p * 100}%` }} />
              <div className="absolute top-1/2 h-[3px] w-10 -translate-x-full -translate-y-1/2 rounded-full bg-[#fff1b0] shadow-[0_0_18px_5px_rgba(228,192,32,.65)] " style={{ left: `${p * 100}%` }} />
            </>
          )}
        </div>
        {label && <p className="eyebrow mt-5 text-stone-light">{label}</p>}
      </div>

      {!compact && (
        <>
          <p className="eyebrow absolute bottom-7 left-6 text-stone-light sm:left-10">96 finishes<span className="hidden sm:inline"> · Processed in Germany</span></p>
          {p !== null && <p className="absolute bottom-6 right-6 font-mono text-[13px] tracking-[0.2em] text-porcelain/80 sm:right-10">{String(Math.round(p * 100)).padStart(3, "0")}</p>}
        </>
      )}

      <style>{`
        .bl-strip{transform:translateY(102%);animation:bl-rise 900ms cubic-bezier(.22,1,.36,1) forwards;animation-delay:calc(var(--i) * 90ms)}
        @keyframes bl-rise{to{transform:none}}
        .bl-logo{opacity:0;filter:blur(10px);animation:bl-logo 900ms 250ms cubic-bezier(.22,1,.36,1) forwards}
        @keyframes bl-logo{to{opacity:1;filter:blur(0)}}
        .bl-shimmer{animation:bl-shim 1.3s ease-in-out infinite}
        @keyframes bl-shim{from{left:-33%}to{left:100%}}
        .bl-leaving .bl-strip{animation:bl-lift 800ms cubic-bezier(.7,0,.2,1) forwards;animation-delay:calc(var(--i) * 60ms)}
        @keyframes bl-lift{from{transform:none}to{transform:translateY(-102%)}}
        .bl-leaving .bl-center{transition:opacity 400ms,transform 700ms cubic-bezier(.22,1,.36,1);opacity:0;transform:scale(1.04)}
        .bl-leaving{background:transparent!important;transition:background 300ms 500ms}
        @media (prefers-reduced-motion: reduce){.bl-strip,.bl-logo{animation:none;transform:none;opacity:1;filter:none}}
      `}</style>
    </div>
  );
}
