import Link from "next/link";
import { SHOWROOMS, SITE, NAV } from "@/lib/site";
import { COLLECTIONS } from "@/data/collections";
import { FINISHES } from "@/data/catalogue";
import { asset } from "@/lib/asset";
import { ShowroomStatus } from "./ShowroomStatus";

export function Footer() {
  return (
    <footer data-theme="dark" className="section-dark relative overflow-hidden">
      {/* a strip of real boards */}
      <div className="flex h-16 overflow-hidden md:h-20" aria-hidden>
        {FINISHES.filter((_, i) => i % 3 === 0).map((f) => (
          <Link key={f.id} href={`/finishes/${f.id}/`} tabIndex={-1} className="group relative h-full min-w-[40px] flex-1 overflow-hidden" style={{ background: f.hex }} title={f.name}>
            {!f.flat && <img src={f.textures.thumb} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-125" />}
          </Link>
        ))}
      </div>
      <div className="container-x pb-10 pt-24">
        <div className="grid-12 gap-y-14">
          <div className="col-span-12 lg:col-span-5">
            <img src={asset("/brand/Logo_UNIPANEL_white.png")} alt="UnipanelSA" width={220} height={44} className="h-9 w-auto" />
            <p className="display mt-10 text-[clamp(2.4rem,4.6vw,4.4rem)]">
              Order your
              <br />
              <em className="display-italic text-champagne">Sample Box</em> today.
            </p>
            <p className="mt-6 max-w-md text-porcelain/70">Free sample boxes for interior designers, architects and manufacturers, delivered to your office.</p>
            <Link href="/sample-box/" className="btn btn-light mt-8">
              Build your Sample Box
            </Link>
          </div>
          <div className="col-span-6 lg:col-span-2 lg:col-start-7">
            <p className="eyebrow text-stone-light">Collections</p>
            <ul className="mt-5 space-y-2 text-[15px]">
              {COLLECTIONS.map((c) => (
                <li key={c.id}>
                  <Link href={`/collections/${c.id}/`} className="link-u text-porcelain/80 hover:text-porcelain">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="col-span-6 lg:col-span-2">
            <p className="eyebrow text-stone-light">Explore</p>
            <ul className="mt-5 space-y-2 text-[15px]">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="link-u text-porcelain/80 hover:text-porcelain">
                    {n.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/care/" className="link-u text-porcelain/80 hover:text-porcelain">
                  Care Guide
                </Link>
              </li>
            </ul>
          </div>
          <div className="col-span-12 lg:col-span-2">
            <p className="eyebrow text-stone-light">Follow</p>
            <a href={SITE.instagram} target="_blank" rel="noopener" className="link-u mt-5 inline-block text-[15px] text-porcelain/80">
              Instagram {SITE.instagramHandle}
            </a>
            <img src={asset("/brand/KSA_logo_01.png")} alt="Kitchen Specialists Association member" width={120} height={90} className="mt-8 h-16 w-auto rounded bg-porcelain p-2" />
            <p className="caption mt-3 text-porcelain/60">{SITE.ksa}</p>
          </div>
        </div>

        <div className="mt-20 grid gap-10 border-t border-hairline-dark pt-10 md:grid-cols-3">
          {SHOWROOMS.map((s) => (
            <address key={s.id} className="not-italic">
              <p className="display text-[30px]">{s.city}</p>
              <ShowroomStatus city={s.id} className="mt-2 text-porcelain/70" />
              <p className="mt-4 text-[15px] text-porcelain/75">
                {s.street}, {s.suburb} {s.postcode}
              </p>
              <a href={s.phoneHref} className="link-u mt-2 block text-[15px]">
                {s.phone}
              </a>
              <a href={`mailto:${s.email}`} className="link-u block text-[15px]">
                {s.email}
              </a>
              <ul className="caption mt-3 space-y-0.5 text-porcelain/60">
                {s.hoursText.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </address>
          ))}
        </div>

        <div className="caption mt-16 flex flex-wrap items-center justify-between gap-4 text-porcelain/50">
          <p>© {new Date().getFullYear()} {SITE.legalName}. {SITE.taglines.primary}.</p>
          <div className="flex flex-wrap gap-6">
            <a href="#main" className="link-u">
              Back to top
            </a>
            <Link href="/privacy/" className="link-u">
              Privacy (POPIA)
            </Link>
            <Link href="/cookies/" className="link-u">
              Cookies
            </Link>
            <Link href="/care/" className="link-u">
              Care Guide
            </Link>
          </div>
        </div>
      </div>
      {/* the company name, sliding endlessly */}
      <div className="relative overflow-hidden border-t border-hairline-dark py-6" aria-label="UniPanel SA, Luxury European Surfaces">
        <div className="footer-marquee flex w-max" aria-hidden>
          {[0, 1].map((k) => (
            <div key={k} className="flex shrink-0 items-center">
              {["UniPanel SA", "Luxury European Surfaces", "UniPanel SA", "Johannesburg · Cape Town · Durban"].map((t, i) => (
                <span key={i} className="flex items-center">
                  <span className={`whitespace-nowrap px-[3vw] text-[clamp(4rem,11vw,11rem)] leading-[1] ${i % 2 === 0 ? "font-sans font-medium tracking-[-0.04em] text-porcelain" : "display-italic text-champagne/80"}`}>{t}</span>
                  <span className="h-3 w-3 shrink-0 rounded-full bg-champagne/70" />
                </span>
              ))}
            </div>
          ))}
        </div>
        <style>{`.footer-marquee{animation:fmq 38s linear infinite}.footer-marquee:hover{animation-play-state:paused}@keyframes fmq{to{transform:translateX(-50%)}}@media (prefers-reduced-motion: reduce){.footer-marquee{animation:none}}`}</style>
      </div>
    </footer>
  );
}
