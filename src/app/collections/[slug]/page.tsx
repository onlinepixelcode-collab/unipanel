import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { COLLECTIONS, collectionById } from "@/data/collections";
import { finishesIn } from "@/data/catalogue";
import { CollectionHero } from "@/components/catalogue/CollectionHero";
import { SwatchCard } from "@/components/catalogue/SwatchCard";

export function generateStaticParams() {
  return COLLECTIONS.map((c) => ({ slug: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = collectionById(slug);
  if (!c) return {};
  const list = finishesIn(c.id);
  return { title: `${c.name} Collection`, description: `${c.intro} ${list.length} finishes: ${list.slice(0, 6).map((f) => f.name).join(", ")} and more.` };
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = collectionById(slug);
  if (!c) notFound();
  const list = finishesIn(c.id);
  const idx = COLLECTIONS.findIndex((x) => x.id === c.id);
  const next = COLLECTIONS[(idx + 1) % COLLECTIONS.length];
  return (
    <>
      <CollectionHero c={c} count={list.length} />
      <section data-theme={c.dark ? "dark" : "light"} className={`${c.dark ? "section-dark" : ""} py-24`}>
        <div className="container-x">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-4 border-t border-current/15 pt-6">
            <h2 className="display text-[clamp(2rem,4vw,3.4rem)]">All {list.length} finishes</h2>
            <p className={`caption max-w-sm ${c.dark ? "text-stone-light" : "text-stone"}`}>Board sizes, thicknesses and pricing: specification on request from any showroom.</p>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-14 md:grid-cols-3 xl:grid-cols-4">
            {list.map((f, i) => (
              <SwatchCard key={f.id} f={f} dark={c.dark} index={i} />
            ))}
          </div>
        </div>
      </section>
      <Link href={`/collections/${next.id}/`} data-theme="dark" className="section-dark group block border-t border-hairline-dark">
        <div className="container-x flex items-end justify-between py-16">
          <div>
            <p className="eyebrow text-stone-light">Next room · {next.no}</p>
            <p className="display mt-4 text-[clamp(2.6rem,7vw,7rem)] transition-transform duration-700 group-hover:translate-x-4">{next.name}</p>
          </div>
          <span className="eyebrow text-champagne">Enter</span>
        </div>
      </Link>
    </>
  );
}
