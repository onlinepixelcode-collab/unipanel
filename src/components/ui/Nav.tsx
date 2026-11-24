"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV, SHOWROOMS, SITE } from "@/lib/site";
import { asset } from "@/lib/asset";
import { useSampleBox } from "@/lib/store/sampleBox";
import { ShowroomStatus } from "./ShowroomStatus";

const MENU_MATERIALS = ["nuvola-03", "calacatta-bianco", "champagne-metal", "oxid-nero-real-stone", "nogal-rosales-02", "loom-ah7", "satin-kashmir-glass", "verde-salvia", "firestone", "kashmir", "black-8102"];

export function Logo({ dark }: { dark: boolean }) {
  // The real wordmark, large: on its own over dark surfaces, on the brand's black (as in the
  // circle mark) over light ones, so the name stays readable at full size.
  return dark ? (
    <img src={asset("/brand/Logo_UNIPANEL_white.png")} alt="UnipanelSA, Luxury European Surfaces" width={150} height={30} className="h-[32px] w-auto sm:h-[40px]" />
  ) : (
    <span className="flex items-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#262626,#0b0b0b)] px-4 py-2.5 shadow-[0_6px_20px_-8px_rgba(0,0,0,.45)] sm:px-5 sm:py-3">
      <img src={asset("/brand/Logo_UNIPANEL_white.png")} alt="UnipanelSA, Luxury European Surfaces" width={150} height={30} className="h-[26px] w-auto sm:h-[32px]" />
    </span>
  );
}

export function Nav() {
  const path = usePathname();
  const [dark, setDark] = useState(false);
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(0);
  const count = useSampleBox((s) => s.ids.length);
  const studio = path?.startsWith("/studio");

  useEffect(() => {
    useSampleBox.persist.rehydrate();
  }, []);

  // read the theme of whatever sits under the bar
  useEffect(() => {
    const check = () => {
      setSolid(window.scrollY > 40);
      const el = document.elementsFromPoint(window.innerWidth / 2, 36).find((e) => !(e as HTMLElement).closest("header"));
      const themed = el?.closest("[data-theme]") as HTMLElement | null;
      setDark(studio || themed?.dataset.theme === "dark");
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    const t = setInterval(check, 800);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
      clearInterval(t);
    };
  }, [path, studio]);

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const onDark = dark || open;
  return (
    <header className="fixed inset-x-0 top-0 z-[60]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-porcelain">
        Skip to content
      </a>
      <div
        className={`container-x flex h-[var(--nav-h)] items-center justify-between transition-[background-color,color,backdrop-filter] duration-500 ${onDark ? "text-porcelain" : "text-ink"} ${
          open ? "bg-transparent" : solid || studio ? (onDark ? "bg-ink/70 backdrop-blur-xl" : "bg-porcelain/75 backdrop-blur-xl") : "bg-transparent"
        }`}
      >
        <Link href="/" aria-label="UnipanelSA home" className="relative z-10 flex items-center">
          <Logo dark={onDark} />
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-7 text-[14px] xl:flex">
          {[...NAV.slice(0, 6), ...NAV.filter((n) => n.href.startsWith("/contact"))].map((n) => (
            <Link key={n.href} href={n.href} className={`link-u ${path?.startsWith(n.href) ? "opacity-100" : "opacity-75 hover:opacity-100"}`}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="relative z-10 flex items-center gap-2">
          {/* Contact: in the link row on wide screens, its own link below that, an icon on phones */}
          <Link href="/contact/" className={`link-u hidden px-2 text-[14px] sm:inline-block xl:hidden ${path?.startsWith("/contact") ? "opacity-100" : "opacity-80 hover:opacity-100"}`}>
            Contact
          </Link>
          <Link href="/contact/" aria-label="Contact us" className="grid h-10 w-10 place-items-center sm:hidden">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
            </svg>
          </Link>
          {!studio && (
            <Link href="/studio/" className={`btn hidden !min-h-10 !px-4 !text-[14px] md:inline-flex ${onDark ? "btn-light" : "btn-ink"}`}>
              Studio
            </Link>
          )}
          <Link href="/sample-box/" className="btn btn-line !min-h-10 !px-4 !text-[14px]" aria-label={`Sample Box, ${count} finish${count === 1 ? "" : "es"}`}>
            <span>
              <span className="max-sm:hidden">Sample </span>Box <span className="font-mono">({count})</span>
            </span>
          </Link>
          <button onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="site-menu" className="grid h-10 w-10 place-items-center" aria-label={open ? "Close menu" : "Open menu"}>
            <span className="relative block h-3 w-6">
              <span className={`absolute left-0 h-px w-6 bg-current transition-transform duration-300 ${open ? "top-1.5 rotate-45" : "top-0"}`} />
              <span className={`absolute left-0 h-px w-6 bg-current transition-transform duration-300 ${open ? "top-1.5 -rotate-45" : "top-3"}`} />
            </span>
          </button>
        </div>
      </div>

      {/* full-screen menu, the background material follows the hovered link */}
      <div
        id="site-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        className={`fixed inset-0 -z-10 bg-ink text-porcelain transition-[clip-path] duration-[900ms] ease-[cubic-bezier(.22,1,.36,1)] ${open ? "[clip-path:inset(0_0_0_0)]" : "pointer-events-none [clip-path:inset(0_0_100%_0)]"}`}
      >
        {MENU_MATERIALS.map((m, i) => (
          <img
            key={m}
            src={asset(`/tex/${m}.jpg`)}
            alt=""
            loading="lazy"
            className={`absolute inset-y-0 right-0 hidden h-full w-[42%] object-cover transition-[opacity,transform] duration-700 lg:block ${hover === i ? "scale-100 opacity-70" : "scale-105 opacity-0"}`}
          />
        ))}
        <div className="absolute inset-y-0 right-0 hidden w-[42%] bg-gradient-to-r from-ink via-transparent to-transparent lg:block" />
        <div className="relative h-full overflow-y-auto overscroll-contain">
          {/* desktop: one column of large links beside the material panel */}
          <div className="container-x hidden min-h-full flex-col justify-between pb-8 pt-[calc(var(--nav-h)+3vh)] lg:flex">
            <ul className="max-w-[58%]">
              {NAV.map((n, i) => (
                <li key={n.href} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)}>
                  <Link href={n.href} tabIndex={open ? 0 : -1} className="group flex items-baseline gap-4 py-[0.35vh]">
                    <span className="font-mono text-[13px] text-stone-light">{n.no}</span>
                    <span className={`display text-[clamp(2.1rem,5.4vh,4.6rem)] transition-[color,transform] duration-500 group-hover:translate-x-3 ${hover === i ? "text-porcelain" : "text-porcelain/55"}`}>{n.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="grid max-w-[58%] grid-cols-3 gap-6 border-t border-hairline-dark pt-6 text-[14px]">
              {SHOWROOMS.map((s) => (
                <div key={s.id}>
                  <p className="eyebrow text-champagne">{s.city}</p>
                  <a href={s.phoneHref} tabIndex={open ? 0 : -1} className="link-u mt-2 block text-porcelain/85">
                    {s.phone}
                  </a>
                  <a href={`mailto:${s.email}`} tabIndex={open ? 0 : -1} className="link-u block text-porcelain/85">
                    {s.email}
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* phones & tablets: primary links with material swatches, secondary grid, quick actions */}
          <div className="container-x flex min-h-full flex-col pb-[max(env(safe-area-inset-bottom),24px)] pt-[calc(var(--nav-h)+12px)] lg:hidden">
            <ul className="border-t border-hairline-dark">
              {NAV.slice(0, 6).map((n, i) => (
                <li key={n.href} className="border-b border-hairline-dark">
                  <Link
                    href={n.href}
                    tabIndex={open ? 0 : -1}
                    className={`flex items-center gap-4 py-3.5 transition-[opacity,transform] duration-700 ease-[cubic-bezier(.22,1,.36,1)] ${open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"} ${path?.startsWith(n.href) ? "text-champagne" : "text-porcelain"}`}
                    style={{ transitionDelay: open ? `${80 + i * 45}ms` : "0ms" }}
                  >
                    <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full ring-1 ring-white/15">
                      <img src={asset(`/thumb/${MENU_MATERIALS[i]}.webp`)} alt="" loading="lazy" className="h-full w-full object-cover" />
                    </span>
                    <span className="display flex-1 text-[30px] leading-none">{n.label}</span>
                    <span className="text-stone-light">→</span>
                  </Link>
                </li>
              ))}
            </ul>
            <ul className={`mt-5 grid grid-cols-2 gap-x-4 gap-y-1 transition-opacity delay-300 duration-700 ${open ? "opacity-100" : "opacity-0"}`}>
              {NAV.slice(6).map((n) => (
                <li key={n.href}>
                  <Link href={n.href} tabIndex={open ? 0 : -1} className={`block py-2 text-[17px] ${path?.startsWith(n.href) ? "text-champagne" : "text-porcelain/80"}`}>
                    {n.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/care/" tabIndex={open ? 0 : -1} className="block py-2 text-[17px] text-porcelain/80">
                  Care Guide
                </Link>
              </li>
            </ul>
            <div className={`mt-6 grid grid-cols-2 gap-2 transition-opacity delay-300 duration-700 ${open ? "opacity-100" : "opacity-0"}`}>
              <Link href="/studio/" tabIndex={open ? 0 : -1} className="btn btn-light justify-center">
                Open the Studio
              </Link>
              <Link href="/sample-box/" tabIndex={open ? 0 : -1} className="btn btn-line justify-center text-porcelain">
                <span>
                  Sample Box <span className="font-mono">({count})</span>
                </span>
              </Link>
            </div>
            <div className="mt-auto pt-8">
              <p className="eyebrow text-stone-light">Call a showroom</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {SHOWROOMS.map((s) => (
                  <a key={s.id} href={s.phoneHref} tabIndex={open ? 0 : -1} className="rounded-2xl bg-white/[0.05] px-3 py-3 ring-1 ring-white/10 active:bg-white/10">
                    <span className="block text-[15px] text-porcelain">{s.city === "Johannesburg" ? "Jo’burg" : s.city}</span>
                    <ShowroomStatus city={s.id} className="mt-1 !text-[13px] text-stone-light [&>span:last-child]:hidden" />
                    <span className="mt-1 block text-[13px] text-champagne">Call</span>
                  </a>
                ))}
              </div>
              <a href={SITE.instagram} target="_blank" rel="noopener" tabIndex={open ? 0 : -1} className="mt-5 inline-block text-[14px] text-stone-light">
                Instagram {SITE.instagramHandle}
              </a>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
