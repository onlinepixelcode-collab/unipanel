"use client";
import * as THREE from "three";
import { memo, useMemo } from "react";
import type { Prop } from "@/lib/studio/layout";
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
};

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
          <mesh geometry={G.vase} material={M.ceramic()} castShadow receiveShadow />
          <Foliage count={9} spread={0.13} height={0.62} seed={seed} olive />
        </>
      );
    case "plant": {
      const floor = p.pos[1] < 100;
      return floor ? (
        <>
          <mesh geometry={G.bigPot} material={M.stone()} castShadow receiveShadow />
          <group position={[0, 0.4, 0]}>
            <Foliage count={26} spread={0.42} height={1.05} seed={seed} />
          </group>
        </>
      ) : (
        <>
          <mesh geometry={G.pot} material={M.ceramic()} castShadow receiveShadow scale={0.75} />
          <group position={[0, 0.1, 0]}>
            <Foliage count={11} spread={0.12} height={0.2} seed={seed} />
          </group>
        </>
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

export const RoomProps = memo(function RoomProps({ props }: { props: Prop[] }) {
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
