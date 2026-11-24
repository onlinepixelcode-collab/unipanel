"use client";
import { usePathname } from "next/navigation";
/** The Studio is a full-screen app: no footer there. */
export function FooterGate({ children }: { children: React.ReactNode }) {
  const p = usePathname();
  return p?.startsWith("/studio") ? null : <>{children}</>;
}
