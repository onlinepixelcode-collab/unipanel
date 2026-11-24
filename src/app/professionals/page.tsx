import type { Metadata } from "next";
import Link from "next/link";
import { SERVICES, SITE } from "@/lib/site";
import { FINISH_COUNT } from "@/data/catalogue";
import { EnquiryForm } from "@/components/ui/EnquiryForm";
import { asset } from "@/lib/asset";
import { CATALOGUE_PDF } from "@/data/catalogue-book";

export const metadata: Metadata = { title: "For Professionals", description: "Sample boxes, showroom use, order forms, the brochure, processing services and project enquiries for designers, architects and manufacturers." };

const TOOLS = [
  { no: "01", title: "Free sample boxes", body: "Up to eight finishes, delivered to your office. Free for interior designers, architects and manufacturers.", href: "/sample-box/", cta: "Build a box" },
  { no: "02", title: "Showrooms for client meetings", body: "Bring clients to Kramerville, Paarden Eiland or Jacobs to see full doors in person.", href: "/showrooms/", cta: "Book a visit" },
  { no: "03", title: "Order form", body: "Send finishes, quantities and processing requirements straight to your nearest showroom.", href: "/contact/?type=order", cta: "Open order form" },
  { no: "04", title: "The Studio", body: `Present schemes in 3D with all ${FINISH_COUNT} finishes, then export a branded spec sheet.`, href: "/studio/", cta: "Open the Studio" },
];

export default function Page() {
  return (
    <>
      <section data-theme="dark" className="section-dark pb-20 pt-[calc(var(--nav-h)+10vh)]">
        <div className="container-x grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <p className="eyebrow text-champagne">For professionals</p>
            <h1 className="display mt-6 text-[clamp(3.2rem,8.6vw,8.6rem)]">
              Built for the people
              <br />
              <em className="display-italic">who specify.</em>
            </h1>
          </div>
          <div className="self-end lg:col-span-4">
            <p className="text-porcelain/75">A premier independent board merchant for interior designers, shopfitters, architects and manufacturers across South Africa and its neighbouring countries.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/catalogue/" className="btn btn-light">
                Open the product catalogue
              </Link>
              <a href={asset(CATALOGUE_PDF)} download className="btn btn-line text-porcelain">
                <span>Download PDF</span>
              </a>
            </div>
          </div>
        </div>
      </section>
      <section data-theme="light" className="py-24">
        <div className="container-x grid gap-px overflow-hidden rounded-[3px] bg-hairline md:grid-cols-2">
          {TOOLS.map((t) => (
            <div key={t.no} className="flex flex-col justify-between gap-10 bg-porcelain p-8" data-reveal>
              <div>
                <p className="font-mono text-[13px] text-stone">{t.no}</p>
                <h2 className="display mt-3 text-[40px]">{t.title}</h2>
                <p className="mt-3 max-w-md text-stone">{t.body}</p>
              </div>
              <Link href={t.href} className="link-u self-start text-[15px]">
                {t.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>
      <section data-theme="light" className="border-t border-hairline py-24">
        <div className="container-x grid gap-10 lg:grid-cols-12">
          <h2 className="display text-[clamp(2.4rem,4.4vw,4rem)] lg:col-span-4">Processing services</h2>
          <ul className="lg:col-span-7 lg:col-start-6">
            {SERVICES.map((s) => (
              <li key={s.id} className="grid grid-cols-[3rem_1fr] gap-4 border-t border-hairline py-5">
                <span className="font-mono text-[13px] text-stone">{s.no}</span>
                <div>
                  <Link href={`/services/#${s.id}`} className="link-u text-[20px]">
                    {s.title}
                  </Link>
                  <p className="mt-1 text-stone">{s.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section data-theme="dark" className="section-dark py-24">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 className="display text-[clamp(2.4rem,4.4vw,4rem)]">Project enquiry</h2>
            <p className="mt-4 text-porcelain/75">Residential or commercial, small or large. Tell us about the project and the right showroom will respond.</p>
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <EnquiryForm
              kind="Project enquiry"
              dark
              submitLabel="Send project enquiry"
              fields={[
                { name: "name", label: "Full name", type: "text", required: true, autoComplete: "name" },
                { name: "company", label: "Company", type: "text", required: true, autoComplete: "organization" },
                { name: "role", label: "Role", type: "select", options: ["Interior designer", "Architect", "Manufacturer", "Shopfitter", "Developer", "Other"], required: true },
                { name: "email", label: "Email", type: "email", required: true, autoComplete: "email" },
                { name: "phone", label: "Phone", type: "tel", autoComplete: "tel" },
                { name: "projectType", label: "Project type", type: "select", options: ["Residential", "Commercial"] },
                { name: "message", label: "Project details", type: "textarea", required: true },
              ]}
            />
          </div>
        </div>
      </section>
    </>
  );
}
