import type { Metadata } from "next";
import { CatalogueViewer } from "@/components/catalogue/CatalogueViewer";

export const metadata: Metadata = {
  title: "Product Catalogue",
  description: "Leaf through the UnipanelSA Product Catalogue: every finish with board sizes, cores and origins, the Exclusive Range, services and showrooms. Download the PDF.",
};

export default function Page() {
  return <CatalogueViewer />;
}
