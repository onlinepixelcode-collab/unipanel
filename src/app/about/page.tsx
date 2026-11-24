import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { asset } from "@/lib/asset";

export const metadata: Metadata = { title: "Our Story", description: "Unipanel SA is a premier independent board merchant supplying luxury, innovative imported European surfaces to designers and shopfitters across South Africa." };

const VALUES = ["Customer Commitment", "Quality", "Integrity", "Teamwork", "Respect for People", "Ownership and Leadership"];

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[3px] border border-dashed border-champagne/70 p-5 text-[15px]">
      <p className="eyebrow text-champagne">Content to be supplied by UnipanelSA</p>
      <p className="mt-2 opacity-80">{children}</p>
    </div>
  );
}

export default function Page() {
  return (
    <>
      <section data-theme="light" className="container-x pb-20 pt-[calc(var(--nav-h)+8vh)]">
        <p className="eyebrow text-stone">Our Story</p>
        <h1 className="display mt-6 max-w-5xl text-[clamp(3rem,7.4vw,7.4rem)]">
          A strategic partner, and a <em className="display-italic">business enabler.</em>
        </h1>
        <p className="lede mt-10 max-w-2xl text-stone">Our vision is to be a strategic partner and business enabler to clients, providing them with world class products and services.</p>
      </section>
      <section data-theme="dark" className="section-dark py-24">
        <div className="container-x grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <img src={asset("/inspiration/decorex2019stand-2.webp")} alt="The UnipanelSA stand at Decorex" className="aspect-[4/3] w-full rounded-[3px] object-cover" loading="lazy" />
          </div>
          <div className="space-y-6 text-porcelain/80 lg:col-span-5 lg:col-start-8">
            <p>Unipanel SA is a premier independent board merchant, focusing on luxury and innovative products tailored for interior designers and shopfitters across South Africa and its neighbouring countries.</p>
            <p>Advanced machinery and specialised technical expertise let us deliver high-quality products. Quality is a fundamental value: every product is made to the same rigorous standards.</p>
            <p>
              UnipanelSA is owned and managed by Zunaid Khan, Managing Director, supplying imported European surfaces to interior designers, architects, cabinetry professionals and property developers from showrooms in Durban, Johannesburg and Cape Town.
            </p>
            <p className="eyebrow text-champagne">{SITE.ksa}</p>
          </div>
        </div>
      </section>
      <section data-theme="light" className="py-24">
        <div className="container-x grid gap-10 lg:grid-cols-12">
          <h2 className="display text-[clamp(2.4rem,4.4vw,4rem)] lg:col-span-4">Values, lived by all our staff</h2>
          <ol className="grid gap-px bg-hairline sm:grid-cols-2 lg:col-span-7 lg:col-start-6">
            {VALUES.map((v, i) => (
              <li key={v} className="bg-porcelain p-6" data-reveal style={{ ["--d" as string]: `${i * 60}ms` }}>
                <span className="font-mono text-[13px] text-stone">0{i + 1}</span>
                <p className="display mt-2 text-[30px]">{v}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section data-theme="light" className="border-t border-hairline py-24">
        <div className="container-x grid gap-6 md:grid-cols-3">
          <Placeholder>Founding year and the story of how UnipanelSA began.</Placeholder>
          <Placeholder>Milestones: showroom openings, partnerships with European manufacturers.</Placeholder>
          <Placeholder>Team photography and a short message from the Managing Director.</Placeholder>
        </div>
        <div className="container-x mt-12">
          <Link href="/showrooms/" className="btn btn-ink">
            Visit a showroom
          </Link>
        </div>
      </section>
    </>
  );
}
