"use client";
import dynamic from "next/dynamic";
import { BrandLoader } from "@/components/ui/BrandLoader";

const StudioApp = dynamic(() => import("@/components/studio/StudioApp"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-[5] pt-[var(--nav-h)]">
      <div className="relative h-full w-full">
        <BrandLoader label="The Studio · preparing the room" compact />
      </div>
    </div>
  ),
});

export default function StudioLoader() {
  return <StudioApp />;
}
