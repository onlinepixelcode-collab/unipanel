import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FINISHES, finishById } from "@/data/catalogue";
import { COLLECTIONS } from "@/data/collections";
import { SITE } from "@/lib/site";
import { FinishDetail } from "@/components/catalogue/FinishDetail";

export function generateStaticParams() {
  return FINISHES.map((f) => ({ id: f.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const f = finishById(id);
  if (!f) return {};
  const coll = COLLECTIONS.find((c) => c.id === f.collections[0])!;
  const title = `${f.name}${f.code ? ` ${f.code}` : ""} · ${coll.name}`;
  const description = `${f.name}${f.code ? ` ${f.code}` : ""}: ${f.category.toLowerCase()} from the UnipanelSA ${coll.name} collection for kitchen doors, panels, wardrobes and interiors. See it in 3D, order a free sample, specification on request.`;
  return { title, description, openGraph: { title, description, images: [{ url: f.textures.tex }] } };
}

export default async function FinishPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = finishById(id);
  if (!f) notFound();
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${f.name}${f.code ? ` ${f.code}` : ""}`,
    ...(f.code ? { mpn: f.code } : {}),
    category: f.category,
    image: `${SITE.url}${f.textures.swatch.replace(process.env.NEXT_PUBLIC_BASE_PATH ?? "/unipanel", "")}`,
    brand: { "@type": "Brand", name: "UnipanelSA" },
    description: `${f.category} interior board finish for kitchen doors, panels, wardrobes and interiors.`,
    url: `${SITE.url}/finishes/${f.id}/`,
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <FinishDetail id={f.id} />
    </>
  );
}
