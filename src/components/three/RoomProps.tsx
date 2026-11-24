"use client";
import * as THREE from "three";
import { memo, Suspense, useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { asset } from "@/lib/asset";
import { bumpShadows } from "./shadowState";
import type { Prop } from "@/lib/studio/layout";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { getStagingMaterial } from "./materials";

/**
 * Styling items (visual staging only, not products): built from simple lathe and box
 * shapes so they stay light, cast real shadows and pick up the room's reflections.
 */
const MM = 0.001;

const M = {
  ceramic: () => getStagingMaterial("p-ceramic", "#f1efea", { roughness: 0.22, clearcoat: 0.6, clearcoatRoughness: 0.15 }),
  stone: () => getStagingMaterial("p-stone", "#d9d3c8", { roughness: 0.7 }),
  dark: () => getStagingMaterial("p-dark", "#1d1c1b", { roughness: 0.45, clearcoat: 0.3 }),
  steel: () => getStagingMaterial("p-steel", "#c9cbcc", { metalness: 1, roughness: 0.18 }),
  black: () => getStagingMaterial("p-black", "#121212", { metalness: 0.6, roughness: 0.35 }),
  glass: () => getStagingMaterial("p-glass", "#e9f1f2", { roughness: 0.03, transparent: true, opacity: 0.28, clearcoat: 1, depthWrite: false }),
  oak: () => getStagingMaterial("p-oak", "#a7774b", { roughness: 0.55 }),
  walnut: () => getStagingMaterial("p-walnut", "#5d3e28", { roughness: 0.5 }),
  leaf: () => getStagingMaterial("p-leaf", "#4d6a3a", { roughness: 0.65, side: THREE.DoubleSide }),
  olive: () => getStagingMaterial("p-olive", "#7f8f6a", { roughness: 0.7, side: THREE.DoubleSide }),
  stem: () => getStagingMaterial("p-stem", "#6b5a3e", { roughness: 0.8 }),
  leather: () => getStagingMaterial("p-leather", "#3b2a20", { roughness: 0.55, clearcoat: 0.2 }),
  linen: (c: string) => getStagingMaterial("p-linen", c, { roughness: 0.95 }),
  fruit: (c: string) => getStagingMaterial("p-fruit", c, { roughness: 0.38, clearcoat: 0.3 }),
  paper: (c: string) => getStagingMaterial("p-book", c, { roughness: 0.85 }),
  pasta: () => getStagingMaterial("p-pasta", "#e2c27e", { roughness: 0.9 }),
  beans: () => getStagingMaterial("p-beans", "#4a2f1d", { roughness: 0.8 }),
  rice: () => getStagingMaterial("p-rice", "#f4f0e6", { roughness: 0.95 }),
  fabric: (c: string) => getStagingMaterial("p-fabric", c, { roughness: 0.96, sheen: 0.6, sheenRoughness: 0.8, sheenColor: new THREE.Color("#ffffff") }),
  travertine: () => getStagingMaterial("p-travertine", "#d8cbb5", { roughness: 0.55, clearcoat: 0.25 }),
  tile: () => getStagingMaterial("p-tile", "#dedbd4", { roughness: 0.3, clearcoat: 0.35, clearcoatRoughness: 0.2 }),
  tray: () => getStagingMaterial("p-tray", "#57554f", { roughness: 0.55 }),
  showerGlass: () => getStagingMaterial("p-shower-glass", "#dfe9e6", { roughness: 0.03, transparent: true, opacity: 0.16, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide }),
  globe: () => getStagingMaterial("p-globe", "#f4f1ea", { roughness: 0.05, transparent: true, opacity: 0.32, clearcoat: 1, depthWrite: false, emissive: new THREE.Color("#ffe2b8"), emissiveIntensity: 0.25 }),
  bulb: () => getStagingMaterial("p-bulb", "#fff3dc", { emissive: new THREE.Color("#ffd8a0"), emissiveIntensity: 6, roughness: 1 }),
  shade: () => getStagingMaterial("p-shade", "#f3ece0", { roughness: 0.9, side: THREE.DoubleSide, emissive: new THREE.Color("#ffd9a8"), emissiveIntensity: 0.35 }),
};

/**
 * Real scanned fabric (Poly Haven, CC0), mapped by world position (triplanar) so it keeps
 * its true weave scale on any piece without stretching; tinted to the piece's colour.
 */
const fabricTex = new Map<string, { map: THREE.Texture; rough: THREE.Texture }>();
function fabricTextures(name: string) {
  let t = fabricTex.get(name);
  if (!t) {
    const load = (suffix: string, srgb: boolean) => {
      const tx = new THREE.TextureLoader().load(asset(`/textures/fabric/${name}_${suffix}.jpg`));
      tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
      tx.anisotropy = 8;
      if (srgb) tx.colorSpace = THREE.SRGBColorSpace;
      return tx;
    };
    t = { map: load("diff", true), rough: load("rough", false) };
    fabricTex.set(name, t);
  }
  return t;
}
/** average brightness of each scan, so every fabric keeps the tint's true colour */
const FAB_MEAN: Record<string, number> = { curly_teddy_natural: 0.86, rough_linen: 0.58, velour_velvet: 0.33, poly_wool_herringbone: 0.45, hessian_380: 0.55 };
const scanned = new Map<string, THREE.MeshPhysicalMaterial>();
function scannedFabric(name: string, tint: string, scale = 2.2) {
  const key = `${name}|${tint}`;
  let m = scanned.get(key);
  if (m) return m;
  const { map, rough } = fabricTextures(name);
  m = new THREE.MeshPhysicalMaterial({ color: tint, roughness: 1, sheen: 0.7, sheenRoughness: 0.75, sheenColor: new THREE.Color("#ffffff") });
  m.userData.noRoomEnv = true;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.fabMap = { value: map };
    sh.uniforms.fabRough = { value: rough };
    sh.uniforms.fabScale = { value: scale };
    sh.uniforms.fabMean = { value: FAB_MEAN[name] ?? 0.6 };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vFabP; varying vec3 vFabN;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvFabP = (modelMatrix * vec4(transformed, 1.0)).xyz; vFabN = normalize(mat3(modelMatrix) * objectNormal);");
    sh.fragmentShader = sh.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform sampler2D fabMap; uniform sampler2D fabRough; uniform float fabScale; uniform float fabMean;
varying vec3 vFabP; varying vec3 vFabN;
vec4 fabTri(sampler2D t){ vec3 w = pow(abs(vFabN), vec3(4.0)); w /= (w.x + w.y + w.z);
  return texture2D(t, vFabP.zy * fabScale) * w.x + texture2D(t, vFabP.xz * fabScale) * w.y + texture2D(t, vFabP.xy * fabScale) * w.z; }`,
      )
      // use only the weave's light and shade (not the scan's own colour), normalised, so the tint sets the colour
      .replace("#include <color_fragment>", "#include <color_fragment>\nfloat fabL = dot(fabTri(fabMap).rgb, vec3(0.299, 0.587, 0.114)) / fabMean;\ndiffuseColor.rgb *= mix(1.0, fabL, 0.85);")
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = clamp(0.55 + fabTri(fabRough).g * 0.5, 0.0, 1.0);");
  };
  m.customProgramCacheKey = () => `fabric-${name}`;
  scanned.set(key, m);
  return m;
}

/** A real model (Poly Haven glTF), scaled to a target height and stood on the floor. */
function RealModel({ id, height, rotY = 0 }: { id: string; height: number; rotY?: number }) {
  const { scene } = useGLTF(asset(`/models/${id}/${id}_1k.gltf`));
  const obj = useMemo(() => {
    const c = scene.clone(true);
    const box = new THREE.Box3().setFromObject(c);
    const size = box.getSize(new THREE.Vector3());
    const k = height / Math.max(0.001, size.y);
    c.scale.setScalar(k);
    const center = box.getCenter(new THREE.Vector3());
    c.position.set(-center.x * k, -box.min.y * k, -center.z * k);
    c.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return c;
  }, [scene, height]);
  useEffect(() => bumpShadows(20), [obj]);
  return (
    <group rotation={[0, rotY, 0]}>
      <primitive object={obj} />
    </group>
  );
}
/** On phones and low-power devices the coded stand-ins are used instead of downloading the models. */
let useRealModels = true;
function Real({ id, height, rotY, children }: { id: string; height: number; rotY?: number; children: React.ReactNode }) {
  if (!useRealModels) return <>{children}</>;
  return (
    <Suspense fallback={children}>
      <RealModel id={id} height={height} rotY={rotY} />
    </Suspense>
  );
}

/** Abstract paintings for the hall: soft colour fields, drawn once. */
const artCache = new Map<number, THREE.CanvasTexture>();
function artTexture(seed: number) {
  const hit = artCache.get(seed % 3);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 360;
  c.height = 440;
  const g = c.getContext("2d")!;
  const r = rng(seed + 11);
  const palettes = [
    ["#e9e2d4", "#c8a27a", "#7b5a42", "#2f2a26"],
    ["#ece8e1", "#9aa7a0", "#5e6d68", "#d9c09a"],
    ["#efe9dd", "#d3b48c", "#b46c4a", "#3b3530"],
  ];
  const pal = palettes[seed % 3];
  g.fillStyle = pal[0];
  g.fillRect(0, 0, 360, 440);
  for (let i = 0; i < 5; i++) {
    g.fillStyle = pal[1 + (i % 3)];
    g.globalAlpha = 0.55 + r() * 0.35;
    g.beginPath();
    const x = 60 + r() * 240, y = 60 + r() * 320, rad = 50 + r() * 110;
    if (i % 2) g.ellipse(x, y, rad, rad * (0.5 + r() * 0.6), r() * 3, 0, Math.PI * 2);
    else g.rect(x - rad / 2, y - rad, rad * 0.9, rad * 1.6);
    g.fill();
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  artCache.set(seed % 3, t);
  return t;
}

const lathe = (pts: [number, number][], seg = 40) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

// shared geometries
const G = {
  bowl: lathe([[0.001, 0], [0.06, 0.004], [0.13, 0.04], [0.16, 0.085], [0.155, 0.088], [0.124, 0.046], [0.058, 0.012], [0.001, 0.01]]),
  vase: lathe([[0.001, 0], [0.06, 0], [0.085, 0.08], [0.08, 0.2], [0.045, 0.29], [0.04, 0.33], [0.046, 0.34], [0.036, 0.34], [0.03, 0.3], [0.001, 0.3]]),
  pot: lathe([[0.001, 0], [0.07, 0], [0.085, 0.02], [0.09, 0.15], [0.096, 0.155], [0.086, 0.16], [0.08, 0.04], [0.001, 0.03]]),
  bigPot: lathe([[0.001, 0], [0.13, 0], [0.17, 0.05], [0.18, 0.42], [0.19, 0.43], [0.17, 0.44], [0.16, 0.06], [0.001, 0.05]]),
  kettle: lathe([[0.001, 0], [0.085, 0], [0.095, 0.03], [0.09, 0.15], [0.07, 0.2], [0.03, 0.22], [0.001, 0.225]]),
  jar: new THREE.CylinderGeometry(0.055, 0.055, 1, 32, 1, true),
  disc: new THREE.CylinderGeometry(1, 1, 1, 36),
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(1, 24, 16),
  leaf: new THREE.SphereGeometry(1, 10, 6),
  stem: new THREE.CylinderGeometry(0.002, 0.003, 1, 5),
  glass: lathe([[0.001, 0], [0.032, 0], [0.034, 0.1], [0.031, 0.1], [0.029, 0.006], [0.001, 0.006]], 28),
  torus: new THREE.TorusGeometry(0.17, 0.008, 8, 40),
  // freestanding bathtub shell (unit radius; scaled to an oval): outer wall, rolled rim, inner bowl
  tub: lathe([[0.001, 0], [0.8, 0], [0.9, 0.05], [0.99, 0.5], [1.0, 0.56], [0.97, 0.575], [0.93, 0.55], [0.85, 0.14], [0.7, 0.09], [0.001, 0.09]], 56),
  board: (() => {
    // a paddle-shaped chopping board, 18mm thick, with rounded corners and a handle
    const sh = new THREE.Shape();
    const w = 0.15, h = 0.36, r = 0.04;
    sh.moveTo(-w + r, 0);
    sh.lineTo(w - r, 0);
    sh.quadraticCurveTo(w, 0, w, r);
    sh.lineTo(w, h - r);
    sh.quadraticCurveTo(w, h, w - r, h);
    sh.lineTo(0.035, h);
    sh.lineTo(0.03, h + 0.12);
    sh.quadraticCurveTo(0, h + 0.17, -0.03, h + 0.12);
    sh.lineTo(-0.035, h);
    sh.lineTo(-w + r, h);
    sh.quadraticCurveTo(-w, h, -w, h - r);
    sh.lineTo(-w, r);
    sh.quadraticCurveTo(-w, 0, -w + r, 0);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.018, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2, curveSegments: 8 });
    g.translate(0, 0, -0.009);
    return g;
  })(),
};

function Box({ s, p, r = [0, 0, 0], m }: { s: [number, number, number]; p: [number, number, number]; r?: [number, number, number]; m: THREE.Material }) {
  return <mesh geometry={G.box} material={m} scale={s} position={p} rotation={r} castShadow receiveShadow />;
}

/** Upholstery: a rounded box at its real size (rounding in metres), so cushions and frames read soft, not boxy. */
const softCache = new Map<string, THREE.BufferGeometry>();
function softGeo(w: number, h: number, d: number, r: number) {
  const k = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${r.toFixed(3)}`;
  let g = softCache.get(k);
  if (!g) {
    g = new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
    softCache.set(k, g);
  }
  return g;
}
function Soft({ s, p, r = [0, 0, 0], m, round = 0.04 }: { s: [number, number, number]; p: [number, number, number]; r?: [number, number, number]; m: THREE.Material; round?: number }) {
  return <mesh geometry={softGeo(s[0], s[1], s[2], round)} material={m} position={p} rotation={r} castShadow receiveShadow />;
}
function Cyl({ r, h, p, m, rot }: { r: number; h: number; p: [number, number, number]; m: THREE.Material; rot?: [number, number, number] }) {
  return <mesh geometry={G.disc} material={m} scale={[r, h, r]} position={p} rotation={rot} castShadow receiveShadow />;
}

/** Deterministic jitter so repeated items don't look stamped. */
function rng(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

function Foliage({ count, spread, height, seed, olive }: { count: number; spread: number; height: number; seed: number; olive?: boolean }) {
  const items = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: count }, () => {
      const a = r() * Math.PI * 2;
      const d = r() * spread;
      const y = height * (0.35 + r() * 0.65);
      return { p: [Math.cos(a) * d, y, Math.sin(a) * d] as [number, number, number], s: (0.6 + r() * 0.6) * spread * 0.55, ry: r() * Math.PI, rz: (r() - 0.5) * 1.2, h: y };
    });
  }, [count, spread, height, seed]);
  return (
    <>
      {items.map((it, i) => (
        <group key={i}>
          <mesh geometry={G.stem} material={M.stem()} scale={[1, it.h, 1]} position={[it.p[0] / 2, it.h / 2, it.p[2] / 2]} rotation={[it.p[2] * 2, 0, -it.p[0] * 2]} />
          <mesh geometry={G.leaf} material={olive ? M.olive() : M.leaf()} position={it.p} scale={[it.s, it.s * 0.18, it.s * 0.5]} rotation={[0, it.ry, it.rz]} castShadow />
        </group>
      ))}
    </>
  );
}

/** A sculptural curved armchair in bouclé (2026): a low rounded seat cradled by a continuous curved back and arms. */
function CurvedArmchair() {
  const boucle = scannedFabric("curly_teddy_natural", "#efe8dc", 2.6);
  const back = useMemo(() => new THREE.TorusGeometry(0.33, 0.13, 24, 64, Math.PI * 1.25), []);
  const seat = useMemo(() => new RoundedBoxGeometry(0.62, 0.2, 0.56, 6, 0.09), []);
  const base = useMemo(() => new RoundedBoxGeometry(0.78, 0.26, 0.72, 6, 0.12), []);
  return (
    <>
      <mesh geometry={base} material={boucle} position={[0, 0.13, 0]} castShadow receiveShadow />
      <mesh geometry={seat} material={boucle} position={[0, 0.34, 0.05]} castShadow receiveShadow />
      {/* continuous back and arms, wrapping from one side round the back to the other */}
      <mesh geometry={back} material={boucle} position={[0, 0.46, -0.02]} rotation={[Math.PI / 2, 0, Math.PI * 0.875]} castShadow receiveShadow />
      <Cyl r={0.33} h={0.02} p={[0, 0.01, 0]} m={M.walnut()} />
    </>
  );
}

function Item({ p }: { p: Prop }) {
  const seed = Math.round(Math.abs(p.pos[0] * 7 + p.pos[2] * 13));
  switch (p.kind) {
    case "bowl": {
      const r = rng(seed);
      const fruit = Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2 + r();
        const d = i === 0 ? 0 : 0.07 + r() * 0.02;
        const c = ["#e2892b", "#d8b02f", "#8aa43a", "#e2892b", "#c84a2c"][Math.floor(r() * 5)];
        const s = 0.032 + r() * 0.008;
        return { p: [Math.cos(a) * d, 0.045 + (i === 0 ? 0.035 : 0) + s * 0.6, Math.sin(a) * d] as [number, number, number], c, s };
      });
      return (
        <>
          <mesh geometry={G.bowl} material={M.stone()} castShadow receiveShadow />
          {fruit.map((f, i) => (
            <mesh key={i} geometry={G.sphere} material={M.fruit(f.c)} position={f.p} scale={f.s} castShadow />
          ))}
        </>
      );
    }
    case "vase":
      return (
        <>
          <Real id={seed % 2 ? "ceramic_vase_01" : "ceramic_vase_03"} height={seed % 2 ? 0.34 : 0.4}>
            <mesh geometry={G.vase} material={M.ceramic()} castShadow receiveShadow />
          </Real>
          <group position={[0, 0.12, 0]}>
            <Foliage count={9} spread={0.13} height={0.55} seed={seed} olive />
          </group>
        </>
      );
    case "plant": {
      const floor = p.pos[1] < 100;
      return floor ? (
        <Real id={seed % 2 ? "pachira_aquatica_01" : "potted_plant_02"} height={seed % 2 ? 1.7 : 0.95} rotY={seed}>
          <mesh geometry={G.bigPot} material={M.stone()} castShadow receiveShadow />
          <group position={[0, 0.4, 0]}>
            <Foliage count={26} spread={0.42} height={1.05} seed={seed} />
          </group>
        </Real>
      ) : (
        <Real id="potted_plant_04" height={0.26} rotY={seed}>
          <mesh geometry={G.pot} material={M.ceramic()} castShadow receiveShadow scale={0.75} />
        </Real>
      );
    }
    case "jars":
      return (
        <>
          {[
            [-0.13, 0.24, M.pasta()],
            [0, 0.3, M.rice()],
            [0.13, 0.2, M.beans()],
          ].map(([x, h, fill], i) => (
            <group key={i} position={[x as number, 0, 0]}>
              <mesh geometry={G.jar} material={M.glass()} scale={[1, h as number, 1]} position={[0, (h as number) / 2, 0]} />
              <Cyl r={0.05} h={(h as number) * 0.62} p={[0, ((h as number) * 0.62) / 2 + 0.004, 0]} m={fill as THREE.Material} />
              <Cyl r={0.057} h={0.022} p={[0, (h as number) + 0.011, 0]} m={M.oak()} />
            </group>
          ))}
        </>
      );
    case "kettle":
      return (
        <>
          <Cyl r={0.09} h={0.018} p={[0, 0.009, 0]} m={M.black()} />
          <mesh geometry={G.kettle} material={M.steel()} position={[0, 0.018, 0]} castShadow receiveShadow />
          <mesh geometry={G.torus} material={M.black()} scale={0.42} position={[-0.08, 0.15, 0]} rotation={[0, 0, Math.PI / 2.4]} castShadow />
          <Cyl r={0.012} h={0.09} p={[0.1, 0.13, 0]} rot={[0, 0, -0.9]} m={M.steel()} />
        </>
      );
    case "pot":
      return (
        <>
          <mesh geometry={G.pot} material={M.steel()} castShadow receiveShadow scale={[1.25, 0.8, 1.25]} />
          <Cyl r={0.11} h={0.006} p={[0, 0.13, 0]} m={M.glass()} />
          <Cyl r={0.012} h={0.02} p={[0, 0.142, 0]} m={M.black()} />
          <Box s={[0.11, 0.012, 0.02]} p={[0.17, 0.1, 0]} m={M.black()} />
        </>
      );
    case "boards":
      // two paddle boards leaning on the wall: rounded body, handle with a hanging hole
      return (
        <>
          <group position={[-0.07, 0, 0.055]} rotation={[-0.15, 0.08, 0]}>
            <mesh geometry={G.board} material={M.walnut()} castShadow receiveShadow />
            <mesh geometry={G.disc} material={M.dark()} scale={[0.011, 0.02, 0.011]} position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]} />
          </group>
          <group position={[0.1, 0, 0.085]} rotation={[-0.12, -0.1, 0]} scale={0.78}>
            <mesh geometry={G.board} material={M.oak()} castShadow receiveShadow />
            <mesh geometry={G.disc} material={M.dark()} scale={[0.011, 0.02, 0.011]} position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]} />
          </group>
        </>
      );
    case "books": {
      const span = (p.span ?? 400) * MM;
      const r = rng(seed);
      const cols = ["#d8d1c4", "#2f3a3f", "#9c6b4a", "#e8e3d8", "#55524c", "#b9a68a", "#1f1f1f"];
      const out: { s: [number, number, number]; p: [number, number, number]; c: string; tilt: number }[] = [];
      let x = -span / 2 + 0.02;
      const end = span * 0.15;
      while (x < end) {
        const t = 0.018 + r() * 0.025;
        const h = 0.17 + r() * 0.08;
        out.push({ s: [t, h, 0.15 + r() * 0.04], p: [x + t / 2, h / 2, 0], c: cols[Math.floor(r() * cols.length)], tilt: 0 });
        x += t + 0.002;
      }
      // a short stack lying flat, with a small object on top
      let y = 0;
      for (let i = 0; i < 3; i++) {
        const h = 0.025 + r() * 0.015;
        out.push({ s: [0.2 + r() * 0.03, h, 0.15], p: [span * 0.32, y + h / 2, 0], c: cols[Math.floor(r() * cols.length)], tilt: (r() - 0.5) * 0.2 });
        y += h;
      }
      return (
        <>
          {out.map((b, i) => (
            <Box key={i} s={b.s} p={b.p} r={[0, b.tilt, 0]} m={M.paper(b.c)} />
          ))}
          <mesh geometry={G.sphere} material={M.dark()} position={[span * 0.32, y + 0.035, 0]} scale={0.035} castShadow />
        </>
      );
    }
    case "plates":
      return (
        <>
          {Array.from({ length: 6 }, (_, i) => (
            <Cyl key={i} r={0.12} h={0.012} p={[0, 0.006 + i * 0.014, 0]} m={M.ceramic()} />
          ))}
          {Array.from({ length: 4 }, (_, i) => (
            <Cyl key={`b${i}`} r={0.075} h={0.04} p={[0.2, 0.02 + i * 0.03, 0]} m={M.ceramic()} />
          ))}
        </>
      );
    case "glasses":
      return (
        <>
          {[-0.12, -0.04, 0.04, 0.12].map((x, i) => (
            <mesh key={i} geometry={G.glass} material={M.glass()} position={[x, 0, (i % 2) * 0.07]} />
          ))}
        </>
      );
    case "soap":
      return (
        <>
          <Cyl r={0.032} h={0.15} p={[0, 0.075, 0]} m={M.dark()} />
          <Cyl r={0.008} h={0.03} p={[0, 0.165, 0]} m={M.steel()} />
          <Box s={[0.05, 0.008, 0.012]} p={[0.022, 0.18, 0]} m={M.steel()} />
        </>
      );
    case "bottles":
      return (
        <>
          {[
            [-0.07, 0.2, "#2c3b2a"],
            [0, 0.16, "#e8e3d8"],
            [0.07, 0.12, "#6b4b33"],
          ].map(([x, h, c], i) => (
            <group key={i} position={[x as number, 0, 0]}>
              <Cyl r={0.026} h={h as number} p={[0, (h as number) / 2, 0]} m={M.paper(c as string)} />
              <Cyl r={0.01} h={0.04} p={[0, (h as number) + 0.02, 0]} m={M.black()} />
            </group>
          ))}
        </>
      );
    case "towel":
      return (
        <>
          <Box s={[0.32, 0.06, 0.2]} p={[0, 0.03, 0]} m={M.linen("#e9e4da")} />
          <Box s={[0.3, 0.05, 0.19]} p={[0, 0.085, 0]} m={M.linen("#cfc6b6")} />
        </>
      );
    case "folded": {
      const span = (p.span ?? 400) * MM;
      const stacks = Math.max(1, Math.floor(span / 0.3));
      const cols = ["#e6e1d7", "#9aa1a6", "#2d3133", "#c9b9a2", "#f3f1ec"];
      return (
        <>
          {Array.from({ length: stacks }, (_, s) => (
            <group key={s} position={[-span / 2 + (span / stacks) * (s + 0.5), 0, 0]}>
              {Array.from({ length: 4 }, (_, i) => (
                <Box key={i} s={[0.26, 0.04, 0.3]} p={[(i % 2) * 0.006, 0.02 + i * 0.041, 0]} m={M.linen(cols[(s * 2 + i) % cols.length])} />
              ))}
            </group>
          ))}
        </>
      );
    }
    case "garments": {
      const span = (p.span ?? 500) * MM;
      const n = Math.max(3, Math.floor(span / 0.07));
      const r = rng(seed);
      const cols = ["#e9e5dc", "#2b2f33", "#8b7a63", "#c3c7c9", "#4b4038", "#f4f2ee", "#5b6770"];
      return (
        <>
          {Array.from({ length: n }, (_, i) => {
            const len = 0.75 + r() * 0.35;
            const x = -span / 2 + (span / n) * (i + 0.5);
            return (
              <group key={i} position={[x, -0.012, 0]} rotation={[0, Math.PI / 2 + (r() - 0.5) * 0.25, 0]}>
                <Box s={[0.42, 0.012, 0.006]} p={[0, -0.04, 0]} m={M.oak()} />
                <Box s={[0.44, len, 0.012]} p={[0, -0.05 - len / 2, 0]} m={M.linen(cols[Math.floor(r() * cols.length)])} />
              </group>
            );
          })}
        </>
      );
    }
    case "sofa": {
      const w = (p.span ?? 2400) * MM;
      const fab = scannedFabric("curly_teddy_natural", "#efe9df", 2.4);
      const seat = w - 0.36;
      const n = Math.max(2, Math.round(seat / 0.8));
      return (
        <>
          <Soft s={[w, 0.3, 0.95]} p={[0, 0.2, 0]} m={fab} />
          {Array.from({ length: n }, (_, i) => (
            <Soft key={i} s={[seat / n - 0.015, 0.14, 0.7]} p={[-seat / 2 + (seat / n) * (i + 0.5), 0.42, 0.08]} m={fab} />
          ))}
          <Soft s={[w - 0.04, 0.46, 0.22]} p={[0, 0.58, -0.36]} m={fab} />
          {[-1, 1].map((sd) => (
            <Soft key={sd} s={[0.18, 0.62, 0.95]} p={[sd * (w / 2 - 0.09), 0.36, 0]} m={fab} />
          ))}
          {[-0.45, 0.42].map((x, i) => (
            <Soft key={`c${i}`} s={[0.42, 0.4, 0.13]} p={[x * (w / 2 - 0.4), 0.66, -0.2]} r={[-0.25, i ? -0.2 : 0.25, 0]} m={i ? scannedFabric("velour_velvet", "#a08463", 3) : scannedFabric("curly_teddy_natural", "#f3eee6", 3)} round={0.06} />
          ))}
          {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Cyl key={`${sx}${sz}`} r={0.02} h={0.06} p={[sx * (w / 2 - 0.08), 0.03, sz * 0.4]} m={M.black()} />))}
        </>
      );
    }
    case "armchair":
      return <CurvedArmchair />;
    case "rug":
    case "runner": {
      const w = (p.span ?? 2400) * MM;
      const d = p.kind === "runner" ? 0.9 : w * 0.68;
      return (
        <>
          <mesh geometry={G.box} material={p.kind === "runner" ? scannedFabric("hessian_380", "#d9cdb8", 2) : scannedFabric("poly_wool_herringbone", "#e6ddcd", 1.6)} scale={[w, 0.014, d]} position={[0, 0.007, 0]} receiveShadow />
        </>
      );
    }
    case "coffeeTable":
      return (
        <>
          <mesh geometry={G.disc} material={M.travertine()} scale={[0.6, 0.04, 0.36]} position={[0, 0.38, 0]} castShadow receiveShadow />
          <mesh geometry={G.disc} material={M.travertine()} scale={[0.3, 0.36, 0.16]} position={[0, 0.18, 0]} castShadow />
          <group position={[-0.22, 0.4, 0.02]}>
            <Box s={[0.26, 0.03, 0.2]} p={[0, 0.015, 0]} m={M.paper("#2f3a3f")} />
            <Box s={[0.24, 0.025, 0.18]} p={[0, 0.042, 0]} r={[0, 0.2, 0]} m={M.paper("#e8e3d8")} />
          </group>
          <mesh geometry={G.bowl} material={M.dark()} position={[0.22, 0.4, 0]} scale={0.7} castShadow />
        </>
      );
    case "floorLamp":
      return (
        <>
          <Cyl r={0.14} h={0.02} p={[0, 0.01, 0]} m={M.black()} />
          <Cyl r={0.011} h={1.45} p={[0, 0.73, 0]} m={M.black()} />
          <mesh geometry={G.jar} material={M.shade()} scale={[3.2, 0.3, 3.2]} position={[0, 1.52, 0]} />
        </>
      );
    case "lamp":
      return (
        <>
          <mesh geometry={G.vase} material={M.ceramic()} scale={[0.75, 0.75, 0.75]} castShadow />
          <mesh geometry={G.jar} material={M.shade()} scale={[2.4, 0.2, 2.4]} position={[0, 0.34, 0]} />
        </>
      );
    case "bed": {
      const cover = scannedFabric("rough_linen", "#f3efe8", 2.2);
      return (
        <>
          <Soft s={[1.92, 0.32, 2.16]} p={[0, 0.16, 0]} m={scannedFabric("curly_teddy_natural", "#cfc6b8", 2.4)} />
          <Soft s={[1.82, 0.22, 2.02]} p={[0, 0.43, 0]} m={M.fabric("#f6f4ef")} />
          <Soft s={[1.9, 0.09, 1.5]} p={[0, 0.56, 0.3]} m={cover} />
          <Soft s={[1.94, 0.06, 0.5]} p={[0, 0.62, 0.72]} m={scannedFabric("velour_velvet", "#8a735a", 2.6)} round={0.025} />
          {[-0.45, 0.45].map((x) => (
            <Soft key={x} s={[0.7, 0.16, 0.42]} p={[x, 0.62, -0.72]} r={[-0.35, 0, 0]} m={M.fabric("#f4f2ee")} />
          ))}
          {[-0.3, 0.3].map((x) => (
            <Soft key={`s${x}`} s={[0.5, 0.12, 0.13]} p={[x, 0.64, -0.5]} r={[-0.2, 0, 0]} m={M.fabric("#c9b9a2")} />
          ))}
        </>
      );
    }
    case "bench":
      return (
        <>
          <Soft s={[1.3, 0.1, 0.42]} p={[0, 0.45, 0]} m={scannedFabric("curly_teddy_natural", "#ece5d8", 2.6)} round={0.04} />
          {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Box key={`${sx}${sz}`} s={[0.04, 0.4, 0.04]} p={[sx * 0.6, 0.2, sz * 0.17]} m={M.walnut()} />))}
        </>
      );
    case "console":
      return (
        <>
          <Box s={[1.3, 0.035, 0.38]} p={[0, 0.8, 0]} m={M.walnut()} />
          {[-1, 1].map((sx) => (
            <Box key={sx} s={[0.03, 0.78, 0.32]} p={[sx * 0.6, 0.39, 0]} m={M.black()} />
          ))}
          <group position={[-0.35, 0.818, 0]}>
            <mesh geometry={G.vase} material={M.ceramic()} castShadow />
          </group>
          <group position={[0.35, 0.818, 0]}>
            <Box s={[0.24, 0.03, 0.18]} p={[0, 0.015, 0]} m={M.paper("#9c6b4a")} />
            <Box s={[0.22, 0.03, 0.17]} p={[0, 0.045, 0]} r={[0, 0.25, 0]} m={M.paper("#e8e3d8")} />
          </group>
        </>
      );
    case "art":
      return (
        <>
          <Box s={[0.92, 1.12, 0.035]} p={[0, 0, 0.018]} m={M.black()} />
          <mesh position={[0, 0, 0.037]}>
            <planeGeometry args={[0.82, 1.02]} />
            <meshStandardMaterial map={artTexture(seed)} roughness={0.85} />
          </mesh>
        </>
      );
    case "pendant":
      // hangs from the ceiling: a real globe pendant (Poly Haven), its globe at about 1.75m
      return (
        <group position={[0, -1.2, 0]}>
          <Real id="modern_ceiling_lamp_01" height={0.76}>
            <mesh geometry={G.sphere} material={M.shade()} scale={0.17} position={[0, 0.17, 0]} />
          </Real>
          {/* a longer cord, so a smaller globe still hangs at the right height over the island */}
          <Cyl r={0.004} h={0.45} p={[0, 0.76 + 0.22, 0]} m={M.black()} />
        </group>
      );
    case "globeCluster": {
      const r = rng(seed + 3);
      const globes = Array.from({ length: 9 }, () => {
        const a = r() * Math.PI * 2, d = 0.1 + r() * 0.42;
        return { x: Math.cos(a) * d, z: Math.sin(a) * d, drop: 0.55 + r() * 0.75, rad: 0.1 + r() * 0.06 };
      });
      return (
        <>
          {globes.map((g, i) => (
            <group key={i} position={[g.x, 0, g.z]}>
              <mesh geometry={G.stem} material={M.black()} scale={[0.6, g.drop, 0.6]} position={[0, -g.drop / 2, 0]} />
              <mesh geometry={G.sphere} material={M.globe()} scale={g.rad} position={[0, -g.drop - g.rad, 0]} />
              <mesh geometry={G.sphere} material={M.bulb()} scale={0.025} position={[0, -g.drop - g.rad, 0]} />
            </group>
          ))}
          <Cyl r={0.32} h={0.02} p={[0, -0.01, 0]} m={M.black()} />
        </>
      );
    }
    case "bathtub":
      // a freestanding oval tub (1.7 × 0.8m) with a floor-standing black filler at its head
      return (
        <>
          <mesh geometry={G.tub} material={M.ceramic()} scale={[0.85, 1, 0.4]} castShadow receiveShadow />
          <Cyl r={0.03} h={0.004} p={[0.25, 0.094, 0]} m={M.steel()} />
          <Cyl r={0.045} h={0.012} p={[1.0, 0.006, 0]} m={M.black()} />
          <Cyl r={0.016} h={0.92} p={[1.0, 0.46, 0]} m={M.black()} />
          <Cyl r={0.014} h={0.24} p={[0.89, 0.92, 0]} rot={[0, 0, Math.PI / 2]} m={M.black()} />
          <Cyl r={0.014} h={0.05} p={[0.78, 0.9, 0]} m={M.black()} />
          <Cyl r={0.01} h={0.07} p={[1.0, 0.8, 0.04]} rot={[Math.PI / 2, 0, 0]} m={M.black()} />
        </>
      );
    case "shower": {
      // a walk-in shower in a corner (origin at the corner; extends -x and -z): stone tray, tiled walls,
      // a fixed glass screen, a rain head on a wall arm, mixer and hand shower in black
      const W = 1.1, D = 1.15, Hh = 2.1;
      return (
        <>
          <Box s={[W, 0.016, D]} p={[-W / 2, 0.008, -D / 2]} m={M.tray()} />
          <Box s={[0.012, 2.4, D + 0.3]} p={[-0.006, 1.2, -(D + 0.3) / 2]} m={M.tile()} />
          <Box s={[W + 0.3, 2.4, 0.012]} p={[-(W + 0.3) / 2, 1.2, -0.006]} m={M.tile()} />
          <Box s={[0.7, 0.004, 0.06]} p={[-W / 2, 0.018, -0.12]} m={M.steel()} />
          <mesh position={[-W, Hh / 2 + 0.016, -D / 2]} material={M.showerGlass()} userData={{ noRoomEnv: true, noPath: true }}>
            <boxGeometry args={[0.01, Hh, D]} />
          </mesh>
          <Box s={[0.02, 0.02, D]} p={[-W, 0.026, -D / 2]} m={M.black()} />
          <Box s={[0.02, Hh, 0.02]} p={[-W, Hh / 2 + 0.016, -0.01]} m={M.black()} />
          <Box s={[W, 0.014, 0.014]} p={[-W / 2, Hh + 0.01, -D + 0.02]} m={M.black()} />
          <Cyl r={0.012} h={0.5} p={[-0.25, 2.2, -D / 2]} rot={[0, 0, Math.PI / 2]} m={M.black()} />
          <Cyl r={0.15} h={0.012} p={[-0.5, 2.17, -D / 2]} m={M.black()} />
          <Cyl r={0.012} h={0.04} p={[-0.5, 2.19, -D / 2]} m={M.black()} />
          <Cyl r={0.06} h={0.012} p={[-0.012, 1.15, -D / 2]} rot={[0, 0, Math.PI / 2]} m={M.black()} />
          <Cyl r={0.009} h={0.07} p={[-0.05, 1.15, -D / 2]} rot={[0, 0, Math.PI / 2]} m={M.black()} />
          <Cyl r={0.008} h={0.7} p={[-0.03, 1.4, -D / 2 - 0.3]} m={M.black()} />
          <Cyl r={0.02} h={0.16} p={[-0.06, 1.62, -D / 2 - 0.3]} rot={[0, 0, 0.5]} m={M.black()} />
          <Box s={[0.4, 0.02, 0.12]} p={[-0.55, 1.1, -0.07]} m={M.tray()} />
          {[
            [-0.66, 0.2, "#2c3b2a"],
            [-0.56, 0.15, "#e8e3d8"],
            [-0.47, 0.11, "#6b4b33"],
          ].map(([x, h, c], i) => (
            <Cyl key={i} r={0.026} h={h as number} p={[x as number, 1.11 + (h as number) / 2, -0.07]} m={M.paper(c as string)} />
          ))}
        </>
      );
    }
    case "toilet":
      // wall-hung: boxed-in cistern with a flush plate, floating bowl and soft-close lid
      return (
        <>
          <Box s={[0.5, 1.15, 0.02]} p={[0, 0.575, 0.01]} m={M.tile()} />
          <Box s={[0.24, 0.16, 0.012]} p={[0, 1.0, 0.026]} m={M.steel()} />
          <mesh geometry={softGeo(0.37, 0.3, 0.52, 0.12)} material={M.ceramic()} position={[0, 0.33, 0.28]} castShadow receiveShadow />
          <mesh geometry={softGeo(0.37, 0.035, 0.44, 0.016)} material={M.ceramic()} position={[0, 0.5, 0.31]} castShadow />
        </>
      );
    case "stool":
      return (
        <>
          <Cyl r={0.18} h={0.05} p={[0, 0.655, 0]} m={M.leather()} />
          {[0, 1, 2, 3].map((i) => {
            const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
            return <Cyl key={i} r={0.011} h={0.66} p={[Math.cos(a) * 0.15, 0.32, Math.sin(a) * 0.15]} rot={[Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12]} m={M.black()} />;
          })}
          <mesh geometry={G.torus} material={M.black()} position={[0, 0.26, 0]} rotation={[Math.PI / 2, 0, 0]} scale={0.95} castShadow />
        </>
      );
    default:
      return null;
  }
}

export const RoomProps = memo(function RoomProps({ props, real = true }: { props: Prop[]; real?: boolean }) {
  useRealModels = real;
  return (
    <group>
      {props.map((p, i) => (
        <group key={`${p.kind}${i}`} position={[p.pos[0] * MM, p.pos[1] * MM, p.pos[2] * MM]} rotation={[0, p.rotY, 0]}>
          <Item p={p} />
        </group>
      ))}
    </group>
  );
});
