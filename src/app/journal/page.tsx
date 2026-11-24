import type { Metadata } from "next";
import { JOURNAL } from "@/data/journal";
export const metadata: Metadata = { title: "Journal", description: "Notes on surfaces, processing and materials from UnipanelSA." };

export default function Page() {
  const [lead, ...rest] = JOURNAL;
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
  return (
    <>
      <section data-theme="light" className="container-x pb-12 pt-[calc(var(--nav-h)+8vh)]">
        <p className="eyebrow text-stone">Journal</p>
        <h1 className="display mt-6 text-[clamp(3.2rem,9vw,9rem)]">
          Notes on
          <br />
          <em className="display-italic">surfaces.</em>
        </h1>
      </section>
      <section data-theme="light" className="container-x pb-28">
        <a href={lead.url} target="_blank" rel="noopener" className="group grid gap-6 border-t border-ink py-10 lg:grid-cols-12">
          <p className="eyebrow text-stone lg:col-span-2">{fmt(lead.date)}</p>
          <h2 className="display text-[clamp(2.2rem,4.6vw,4.4rem)] transition-transform duration-700 group-hover:translate-x-2 lg:col-span-7">{lead.title}</h2>
          <p className="text-stone lg:col-span-3">{lead.excerpt}</p>
        </a>
        <ul>
          {rest.map((p) => (
            <li key={p.url} className="border-t border-hairline">
              <a href={p.url} target="_blank" rel="noopener" className="group grid gap-2 py-6 md:grid-cols-12 md:gap-6">
                <span className="caption text-stone md:col-span-2">{fmt(p.date)}</span>
                <span className="text-[20px] transition-transform duration-500 group-hover:translate-x-2 md:col-span-6">{p.title}</span>
                <span className="caption text-stone md:col-span-3">{p.excerpt}</span>
                <span className="eyebrow text-stone md:col-span-1 md:text-right">{p.tag}</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="caption mt-8 text-stone">Articles open on unipanelsa.co.za.</p>
      </section>
    </>
  );
}
