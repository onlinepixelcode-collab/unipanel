"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** One observer for the whole page: adds .is-in to [data-reveal], [data-wipe] and .mask-group elements. */
export function RevealObserver() {
  const path = usePathname();
  useEffect(() => {
    const SEL = "[data-reveal]:not(.is-in), [data-wipe]:not(.is-in), [data-reveal-group]:not(.is-in)";
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.01 },
    );
    const scan = () => document.querySelectorAll(SEL).forEach((el) => io.observe(el));
    scan();
    // pick up content that mounts later (client components, filters, route changes)
    let t = 0;
    const mo = new MutationObserver(() => {
      clearTimeout(t);
      t = window.setTimeout(scan, 80);
    });
    mo.observe(document.body, { childList: true, subtree: true });
    // safety net: anything already on screen after load is shown even if an event was missed
    const safety = window.setInterval(() => {
      document.querySelectorAll(SEL).forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) el.classList.add("is-in");
      });
    }, 1200);
    return () => {
      io.disconnect();
      mo.disconnect();
      clearTimeout(t);
      clearInterval(safety);
    };
  }, [path]);
  return null;
}

/** Headline split into masked lines that slide up in sequence. */
export function Lines({ lines, className = "", as: Tag = "h2", delay = 0 }: { lines: React.ReactNode[]; className?: string; as?: "h1" | "h2" | "h3" | "p"; delay?: number }) {
  return (
    <Tag className={className} data-reveal-group>
      {lines.map((l, i) => (
        <span className="mask" key={i}>
          <span data-line style={{ ["--d" as string]: `${delay + i * 90}ms` }}>
            {l}
          </span>
        </span>
      ))}
    </Tag>
  );
}
