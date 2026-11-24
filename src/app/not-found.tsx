import Link from "next/link";
import { asset } from "@/lib/asset";

const SHARDS = [
  "polygon(0 0, 46% 0, 38% 42%, 0 30%)",
  "polygon(46% 0, 100% 0, 100% 36%, 61% 48%, 38% 42%)",
  "polygon(0 30%, 38% 42%, 30% 100%, 0 100%)",
  "polygon(38% 42%, 61% 48%, 70% 100%, 30% 100%)",
  "polygon(61% 48%, 100% 36%, 100% 100%, 70% 100%)",
];

export default function NotFound() {
  return (
    <section data-theme="dark" className="section-dark flex min-h-[100svh] items-center pt-[var(--nav-h)]">
      <div className="container-x grid w-full items-center gap-14 lg:grid-cols-12">
        <div className="relative mx-auto aspect-[3/4] w-[min(360px,70vw)] lg:col-span-5">
          {SHARDS.map((c, i) => (
            <div key={i} className="shard absolute inset-0" style={{ clipPath: c, backgroundImage: `url(${asset("/tex/calacatta-bianco.jpg")})`, backgroundSize: "cover", animationDelay: `${0.4 + i * 0.08}s` }} />
          ))}
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          <p className="eyebrow text-champagne">404</p>
          <h1 className="display mt-6 text-[clamp(3rem,7vw,6.4rem)]">
            This slab
            <br />
            <em className="display-italic">went missing.</em>
          </h1>
          <p className="mt-6 max-w-md text-porcelain/75">The page you were looking for isn’t here. Every finish still is.</p>
          <div className="mt-8 flex flex-wrap gap-2">
            <Link href="/" className="btn btn-light">
              Back home
            </Link>
            <Link href="/collections/" className="btn btn-line text-porcelain">
              <span>Browse collections</span>
            </Link>
          </div>
        </div>
      </div>
      <style>{`.shard:nth-child(1){transform:translate(-40px,-30px) rotate(-8deg)}.shard:nth-child(2){transform:translate(50px,-40px) rotate(6deg)}.shard:nth-child(3){transform:translate(-60px,40px) rotate(5deg)}.shard:nth-child(4){transform:translate(10px,70px) rotate(-4deg)}.shard:nth-child(5){transform:translate(60px,30px) rotate(9deg)}
      .shard{animation:mend2 1.4s cubic-bezier(.22,1,.36,1) forwards}@keyframes mend2{to{transform:none}}`}</style>
    </section>
  );
}
