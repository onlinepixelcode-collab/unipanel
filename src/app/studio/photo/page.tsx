import type { Metadata } from "next";
import PhotoLoader from "./PhotoLoader";

export const metadata: Metadata = {
  title: "Your Kitchen · Try Our Boards on Your Photo",
  description: "Take or upload a photo of your kitchen, trace the doors and worktop, and try every UnipanelSA finish on it live. Your photo stays on your device.",
};

export default function PhotoPage() {
  return <PhotoLoader />;
}
