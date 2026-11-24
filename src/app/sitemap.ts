import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { FINISHES } from "@/data/catalogue";
import { COLLECTIONS } from "@/data/collections";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "boards", "collections", "catalogue", "studio", "studio/photo", "exclusive", "services", "inspiration", "sample-box", "professionals", "showrooms", "about", "care", "journal", "contact", "privacy", "cookies"];
  return [
    ...pages.map((p) => ({ url: `${SITE.url}/${p ? p + "/" : ""}`, changeFrequency: "monthly" as const, priority: p === "" ? 1 : 0.7 })),
    ...COLLECTIONS.map((c) => ({ url: `${SITE.url}/collections/${c.id}/`, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...FINISHES.map((f) => ({ url: `${SITE.url}/finishes/${f.id}/`, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
