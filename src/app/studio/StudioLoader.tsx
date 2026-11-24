"use client";
import dynamic from "next/dynamic";

const StudioApp = dynamic(() => import("@/components/studio/StudioApp"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 grid place-items-center bg-ink pt-[var(--nav-h)] text-porcelain">
      <div className="text-center">
        <p className="eyebrow text-champagne">The Studio</p>
        <p className="display mt-3 text-[40px]">Preparing the room</p>
        <div className="mx-auto mt-6 h-px w-48 overflow-hidden bg-white/15">
          <div className="h-full w-1/3 animate-[load_1.2s_ease-in-out_infinite] bg-champagne" />
        </div>
      </div>
    </div>
  ),
});

export default function StudioLoader() {
  return <StudioApp />;
}
