import type { Metadata } from "next";
import { ExclusiveStory } from "@/components/pages/ExclusiveStory";

export const metadata: Metadata = {
  title: "Exclusive Range · Made in Germany",
  description: "Real Stone, Real Glass and Ceramic, processed in Germany with laser edgebanding technology. Real Glass uses patented lamination.",
};
export default function Page() {
  return <ExclusiveStory />;
}
