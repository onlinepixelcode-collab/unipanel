"use client";
import type * as THREE from "three";

/** iOS Safari AR Quick Look support (anchor rel="ar"). Android Scene Viewer needs a hosted file, so it is hidden there. */
export function supportsQuickLook() {
  if (typeof document === "undefined") return false;
  const a = document.createElement("a");
  return !!a.relList?.supports?.("ar");
}

export async function openQuickLook(object: THREE.Object3D) {
  const { USDZExporter } = await import("three/examples/jsm/exporters/USDZExporter.js");
  const exporter = new USDZExporter();
  const data = await exporter.parseAsync(object, { quickLookCompatible: true });
  const blob = new Blob([data], { type: "model/vnd.usdz+zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.rel = "ar";
  a.href = url;
  a.appendChild(document.createElement("img"));
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 30000);
}
