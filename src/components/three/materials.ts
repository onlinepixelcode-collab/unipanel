"use client";
import * as THREE from "three";
import { finishById } from "@/data/catalogue";
import type { Finish } from "@/data/types";

/**
 * One MeshPhysicalMaterial per (finish, grain, quality), shared by every panel that
 * uses it. UVs are authored in millimetres (see PanelMesh), so texture.repeat = 1/texMM
 * locks every texture to its real-world size: a woodgrain or a vein is the same size
 * on a 300mm drawer as on a 2m tall door.
 */

export type Quality = "low" | "high";
const loader = typeof window !== "undefined" ? new THREE.TextureLoader() : null;
const texCache = new Map<string, THREE.Texture>();
const matCache = new Map<string, THREE.MeshPhysicalMaterial>();
let maxAniso = 8;
let onLoad: (() => void) | null = null;

export function configureMaterials(opts: { maxAnisotropy: number; invalidate: () => void }) {
  maxAniso = opts.maxAnisotropy;
  onLoad = opts.invalidate;
}

const images = new Map<string, Promise<HTMLImageElement>>();

/** Load an image once; every material variant then builds its own texture from it after it arrives. */
function loadImage(url: string) {
  let p = images.get(url);
  if (!p) {
    p = new Promise((res, rej) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = url;
    });
    images.set(url, p);
  }
  return p;
}

function textureFrom(img: HTMLImageElement, srgb: boolean) {
  const t = new THREE.Texture(img);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
  t.anisotropy = maxAniso;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  texCache.set(`${img.src}|${Math.random()}`, t);
  return t;
}

let brushed: THREE.DataTexture | null = null;
/** Procedural brushed-metal normal map: long horizontal streaks of fine noise. */
function brushedNormal() {
  if (brushed) return brushed;
  const w = 512, h = 512;
  const data = new Uint8Array(w * h * 4);
  const rows = new Float32Array(h);
  for (let y = 0; y < h; y++) rows[y] = Math.random();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = (rows[y] - 0.5) * 0.6 + (Math.random() - 0.5) * 0.08;
      const i = (y * w + x) * 4;
      data[i] = 128;
      data[i + 1] = Math.max(0, Math.min(255, 128 + n * 127));
      data[i + 2] = 255;
      data[i + 3] = 255;
    }
  }
  brushed = new THREE.DataTexture(data, w, h);
  brushed.wrapS = brushed.wrapT = THREE.RepeatWrapping;
  brushed.needsUpdate = true;
  return brushed;
}

function applyTransform(t: THREE.Texture, f: Finish, grain: "v" | "h") {
  t.repeat.set(1 / f.texMM[0], 1 / f.texMM[1]);
  t.rotation = grain === "h" ? Math.PI / 2 : 0;
  t.center.set(0, 0);
}

export function getFinishMaterial(id: string, grain: "v" | "h" = "v", quality: Quality = "high"): THREE.MeshPhysicalMaterial {
  const f = finishById(id) ?? finishById("white-matte")!;
  const key = `${f.id}|${grain}|${quality}`;
  const hit = matCache.get(key);
  if (hit) return hit;
  const p = f.pbr;
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(f.hex),
    roughness: p.roughness,
    metalness: p.metalness,
    clearcoat: p.clearcoat,
    clearcoatRoughness: p.clearcoatRoughness,
    sheen: p.sheen,
    sheenRoughness: 0.8,
    sheenColor: new THREE.Color(f.hex).lerp(new THREE.Color("#ffffff"), 0.4),
    envMapIntensity: p.envMapIntensity,
    ior: p.ior,
    specularIntensity: p.specularIntensity,
  });
  m.name = f.id;

  if (!f.flat && loader) {
    const url = quality === "high" ? f.textures.tex : f.textures.texSm;
    // Start as the measured face colour, swap in the real texture when it has loaded.
    loadImage(url)
      .then((img) => {
        const map = textureFrom(img, true);
        applyTransform(map, f, grain);
        for (const t of [m, ...((m.userData.clones as THREE.MeshPhysicalMaterial[]) ?? [])]) {
          t.map = map;
          t.color.set("#ffffff");
          t.needsUpdate = true;
        }
        onLoad?.();
      })
      .catch(() => {});
    if (f.textures.normal && p.normalScale > 0) {
      loadImage(f.textures.normal)
        .then((img) => {
          const nm = textureFrom(img, false);
          applyTransform(nm, f, grain);
          for (const t of [m, ...((m.userData.clones as THREE.MeshPhysicalMaterial[]) ?? [])]) {
            t.normalMap = nm;
            t.normalScale.set(p.normalScale, p.normalScale);
            t.needsUpdate = true;
          }
          onLoad?.();
        })
        .catch(() => {});
    }
  }
  if (f.kind === "metal") {
    const nm = brushedNormal().clone();
    nm.needsUpdate = true;
    nm.repeat.set(1 / 600, 1 / 40);
    nm.rotation = grain === "h" ? 0 : Math.PI / 2;
    m.normalMap = nm;
    m.normalScale.set(0.25, 0.25);
    m.anisotropy = p.anisotropy;
    m.anisotropyRotation = grain === "h" ? 0 : Math.PI / 2;
  }
  if (f.kind === "glass") {
    // back-painted glass: colour sits under a deep, very smooth top layer
    m.color.multiplyScalar(0.92);
    m.clearcoat = 1;
    m.reflectivity = 0.6;
  }
  matCache.set(key, m);
  return m;
}

/** A private copy (e.g. with clipping planes) that still receives the textures when they load. */
export function cloneFinishMaterial(id: string, grain: "v" | "h" = "v", quality: Quality = "high") {
  const base = getFinishMaterial(id, grain, quality);
  const c = base.clone();
  c.userData = {};
  (base.userData.clones ??= []).push(c);
  return c;
}

const stagingCache = new Map<string, THREE.MeshPhysicalMaterial>();
export function getStagingMaterial(kind: string, color: string, extra: Partial<THREE.MeshPhysicalMaterialParameters> = {}) {
  const key = `${kind}|${color}|${JSON.stringify(extra)}`;
  const hit = stagingCache.get(key);
  if (hit) return hit;
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.6, ...extra });
  m.name = kind;
  stagingCache.set(key, m);
  return m;
}

/** Release GPU memory (called when the Studio unmounts). */
export function disposeMaterials() {
  matCache.forEach((m) => {
    m.map?.dispose();
    m.normalMap?.dispose();
    m.dispose();
  });
  stagingCache.forEach((m) => m.dispose());
  texCache.forEach((t) => t.dispose());
  matCache.clear();
  stagingCache.clear();
  texCache.clear();
}

/**
 * Plastered walls and ceilings: a seamless, world-space noise (two scales: trowel marks
 * and fine grit) gently varies the colour and roughness so painted surfaces stop reading
 * as flat CG. Applied once per material; costs a few shader instructions.
 */
export function plaster<T extends THREE.MeshStandardMaterial>(m: T): T {
  if (m.userData.plaster) return m;
  m.userData.plaster = true;
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vPlaster;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvPlaster = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vPlaster;
float plHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float plNoise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(plHash(i), plHash(i + vec3(1,0,0)), f.x), mix(plHash(i + vec3(0,1,0)), plHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(plHash(i + vec3(0,0,1)), plHash(i + vec3(1,0,1)), f.x), mix(plHash(i + vec3(0,1,1)), plHash(i + vec3(1,1,1)), f.x), f.y), f.z); }`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
float plA = plNoise(vPlaster * 1.7) * 0.6 + plNoise(vPlaster * 5.3) * 0.4;
float plB = plNoise(vPlaster * 61.0);
diffuseColor.rgb *= 0.965 + plA * 0.05 + (plB - 0.5) * 0.02;`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor - 0.08 + plNoise(vPlaster * 9.0) * 0.12, 0.0, 1.0);`,
      );
  };
  m.customProgramCacheKey = () => "plaster";
  m.needsUpdate = true;
  return m;
}
