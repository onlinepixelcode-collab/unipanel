import type { Metadata } from "next";
import { Spaces } from "@/components/pages/Spaces";
export const metadata: Metadata = { title: "Inspiration · Spaces", description: "Kitchens, bathrooms and interiors from the UnipanelSA archive. Open named finishes straight in the 3D Studio." };
export default function Page() {
  return <Spaces />;
}
