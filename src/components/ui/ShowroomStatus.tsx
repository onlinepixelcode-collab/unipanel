"use client";
import { useEffect, useState } from "react";
import { showroomStatus, type OpenStatus } from "@/lib/hours";
import { showroomById, type CityId } from "@/lib/site";

/** Live "Open now / Closed" computed from SAST hours and SA public holidays. */
export function ShowroomStatus({ city, className = "" }: { city: CityId; className?: string }) {
  const [s, setS] = useState<OpenStatus | null>(null);
  useEffect(() => {
    const run = () => setS(showroomStatus(showroomById(city)));
    run();
    const t = setInterval(run, 60_000);
    return () => clearInterval(t);
  }, [city]);
  if (!s) return <span className={`caption opacity-0 ${className}`}>Checking hours</span>;
  return (
    <span className={`caption inline-flex items-center gap-2 ${className}`}>
      <span className={`relative h-2 w-2 rounded-full ${s.open ? "bg-[#7fb38a]" : "bg-stone"}`}>{s.open && <span className="absolute inset-0 animate-ping rounded-full bg-[#7fb38a] opacity-60" />}</span>
      <span>
        {s.label}
        {s.detail ? ` · ${s.detail}` : ""}
      </span>
    </span>
  );
}
