import type { Metadata } from "next";
import { ServicesAtelier } from "@/components/pages/ServicesAtelier";

export const metadata: Metadata = {
  title: "Services · The Atelier",
  description: "Build-ups from 36 to 54mm, cutting on computer-driven beam saws, PUR edge banding with a Zero Glue Line guarantee, door and panel processing, and CNC routing.",
};
export default function Page() {
  return <ServicesAtelier />;
}
