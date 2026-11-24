"use client";

export type Tier = 0 | 1 | 2; // 0 low, 1 mid, 2 high

export function hasWebGL(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export const isMobile = () => typeof navigator !== "undefined" && (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && window.innerWidth < 1024));

/** Lightweight GPU tier guess (no network benchmark): renderer string + cores + memory + form factor. */
export function detectTier(): Tier {
  if (typeof window === "undefined") return 1;
  const mobile = isMobile();
  let renderer = "";
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    renderer = ext && gl ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "";
  } catch {
    /* ignore */
  }
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  if (/swiftshader|llvmpipe|software/i.test(renderer)) return 0;
  if (mobile) return cores >= 6 && mem >= 4 && !/Mali-G5|Adreno \(TM\) [3-5]/i.test(renderer) ? 1 : 0;
  if (/Intel/i.test(renderer) && !/Iris Xe|Arc/i.test(renderer)) return 1;
  return cores >= 4 ? 2 : 1;
}

export const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
