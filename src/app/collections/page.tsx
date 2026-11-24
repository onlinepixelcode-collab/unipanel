import type { Metadata } from "next";
import { Archive } from "@/components/catalogue/Archive";
import { FINISH_COUNT } from "@/data/catalogue";

export const metadata: Metadata = {
  title: "Collections · The Archive",
  description: `All ${FINISH_COUNT} UnipanelSA finishes across nine collections: Premium Italian, Matte, Gloss, Metal, Woodgrain, Marble, Textured, Real Stone and Real Glass. Search by name or code.`,
};

export default function CollectionsPage() {
  return <Archive />;
}
