import type { Metadata } from "next";
import { AllBoards } from "@/components/catalogue/AllBoards";
import { FINISH_COUNT } from "@/data/catalogue";

export const metadata: Metadata = {
  title: "All Boards",
  description: `All ${FINISH_COUNT} UnipanelSA boards on one page: matte, gloss, metal, woodgrain, marble, textured, Premium Italian, Real Stone and Real Glass. Search by name or code.`,
};

export default function Page() {
  return <AllBoards />;
}
