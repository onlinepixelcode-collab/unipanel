import type { Finish } from "@/data/types";

export function SpecTag({ finish, className = "" }: { finish: Finish; className?: string }) {
  return (
    <span className={`spec-tag ${className}`}>
      <span>{finish.name}</span>
      <span>{finish.code ?? finish.category}</span>
    </span>
  );
}

export function SectionNo({ no, label, className = "" }: { no: string; label: string; className?: string }) {
  return (
    <p className={`eyebrow flex items-center gap-3 ${className}`}>
      <span>{no}</span>
      <span className="h-px w-10 bg-current opacity-40" />
      <span>{label}</span>
    </p>
  );
}
