"use client";
import dynamic from "next/dynamic";
import { BrandLoader } from "@/components/ui/BrandLoader";

const PhotoStudio = dynamic(() => import("@/components/studio/PhotoStudio"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-[5] pt-[var(--nav-h)]">
      <div className="relative h-full w-full">
        <BrandLoader label="Your kitchen · getting ready" compact />
      </div>
    </div>
  ),
});

export default function PhotoLoader() {
  return <PhotoStudio />;
}
