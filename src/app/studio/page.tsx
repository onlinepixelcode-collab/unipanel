import type { Metadata } from "next";
import StudioLoader from "./StudioLoader";

export const metadata: Metadata = {
  title: "The Studio · 3D Surface Visualiser",
  description: "Restyle a kitchen, walk-in wardrobe, media wall or vanity with every UnipanelSA finish in real-time 3D. Save, share, export a spec sheet and order samples of your scheme.",
};

export default function StudioPage() {
  return (
    <>
      <h1 className="sr-only">The Studio, 3D surface visualiser</h1>
      <StudioLoader />
    </>
  );
}
