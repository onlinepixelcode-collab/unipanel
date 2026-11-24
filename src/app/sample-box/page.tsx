import type { Metadata } from "next";
import { SampleBoxPage } from "@/components/pages/SampleBoxPage";
export const metadata: Metadata = { title: "Sample Box", description: "Free sample boxes for interior designers, architects and manufacturers, delivered to your office. Choose up to 8 UnipanelSA finishes." };
export default function Page() {
  return <SampleBoxPage />;
}
