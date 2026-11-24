"use client";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Edges, Html, MeshReflectorMaterial } from "@react-three/drei";
import { asset } from "@/lib/asset";
import { startWater, stopWater } from "@/lib/audio/water";
import type { Panel, RoomSpec } from "@/lib/studio/layout";
import type { Scheme, Zone } from "@/lib/studio/scheme";
import { STAGING } from "@/lib/studio/scheme";
import { getFinishMaterial, getStagingMaterial, type Quality } from "./materials";

const MM = 0.001;

/** Box geometry with UVs in real millimetres, continuous along the panel's run. */
export function panelGeometry(p: Panel) {
  const [w, h, d] = p.size;
  const g = new THREE.BoxGeometry(w * MM, h * MM, d * MM);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const nrm = g.attributes.normal as THREE.BufferAttribute;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const baseY = p.pos[1];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / MM;
    const y = pos.getY(i) / MM;
    const z = pos.getZ(i) / MM;
    const nx = Math.abs(nrm.getX(i));
    const ny = Math.abs(nrm.getY(i));
    let u: number, v: number;
    if (ny > 0.5) {
      u = p.uvX + x + w / 2;
      v = z + d / 2;
    } else if (nx > 0.5) {
      u = z + d / 2;
      v = baseY + y;
    } else {
      const along = x + w / 2;
      u = p.mirror ? p.uvX - along : p.uvX + along;
      v = baseY + y;
    }
    uv.setXY(i, u, v);
  }
  uv.needsUpdate = true;
  return g;
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

const HANDLE_COLOURS: Record<string, { color: string; metalness: number; roughness: number }> = {
  jprofile: { color: "#2a2a2a", metalness: 0.8, roughness: 0.4 },
  "bar-black": { color: "#141414", metalness: 0.6, roughness: 0.35 },
  "bar-steel": { color: "#b7b8b8", metalness: 1, roughness: 0.28 },
  "bar-champagne": { color: "#c2a77d", metalness: 1, roughness: 0.3 },
};

function stagingMaterial(p: Panel, s: Scheme) {
  switch (p.staging) {
    case "worktop":
      return getStagingMaterial("worktop", STAGING.worktops[s.worktop].color, { roughness: 0.35, clearcoat: 0.3 });
    case "handle": {
      const h = HANDLE_COLOURS[s.handle] ?? HANDLE_COLOURS.jprofile;
      return getStagingMaterial("handle", h.color, { metalness: h.metalness, roughness: h.roughness });
    }
    case "hob":
      return getStagingMaterial("hob", "#0a0a0a", { roughness: 0.05, clearcoat: 1 });
    case "sink":
    case "tap":
    case "rail":
      return getStagingMaterial("steel", "#9c9fa1", { metalness: 1, roughness: 0.3 });
    case "tv":
      return getStagingMaterial("tv", "#050505", { roughness: 0.15, clearcoat: 1 });
    case "bulkhead":
      return getStagingMaterial("wall", STAGING.walls[s.wall].color, { roughness: 0.92 });
    case "led":
      return getStagingMaterial("led", "#fff4e0", { emissive: new THREE.Color("#fff1d6"), emissiveIntensity: 2.4, roughness: 1 });
    case "basin":
      return getStagingMaterial("basin", "#f2f0ec", { roughness: 0.2, clearcoat: 0.6 });
    default:
      return getStagingMaterial("carcass", "#bcb6ad", { roughness: 0.75 });
  }
}

interface Props {
  room: RoomSpec;
  scheme: Scheme;
  quality: Quality;
  selected?: Zone | null;
  hovered?: Zone | null;
  interactive?: boolean;
  onHover?: (z: Zone | null, e?: ThreeEvent<PointerEvent>) => void;
  onSelect?: (z: Zone) => void;
  /** 0..1 assembly progress (homepage). When omitted, panels sit in place. */
  progress?: RefObject<number>;
  shadows?: boolean;
  /** Studio mode: hollow carcasses, opening fronts and a working tap. */
  studio?: boolean;
  opened?: Record<string, boolean>;
  openMode?: boolean;
  onToggle?: (id: string) => void;
}

export function RoomMeshes(props: Props) {
  if (props.studio && !props.progress) return <StudioMeshes {...props} />;
  return <AssemblyMeshes {...props} />;
}

function AssemblyMeshes({ room, scheme, quality, selected, hovered, interactive, onHover, onSelect, progress, shadows = true }: Props) {
  const geoms = useMemo(() => room.panels.map(panelGeometry), [room]);
  useEffect(() => () => geoms.forEach((g) => g.dispose()), [geoms]);

  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const starts = useMemo(
    () =>
      room.panels.map((p) => {
        const r = hash(p.key + p.zone);
        const r2 = hash(p.key + "y");
        return {
          offset: new THREE.Vector3((r - 0.5) * 6, 1.2 + r2 * 2.6, 2.5 + r * 3),
          rot: new THREE.Euler((r2 - 0.5) * 2.4, (r - 0.5) * 3, (r - 0.5) * 1.6),
        };
      }),
    [room],
  );

  useFrame(() => {
    if (!progress) return;
    const t = progress.current ?? 1;
    room.panels.forEach((p, i) => {
      const m = meshes.current[i];
      if (!m) return;
      const local = THREE.MathUtils.clamp((t - p.order * 0.72) / 0.28, 0, 1);
      const e = 1 - Math.pow(1 - local, 3);
      const s = starts[i];
      m.position.set(p.pos[0] * MM + s.offset.x * (1 - e), p.pos[1] * MM + s.offset.y * (1 - e), p.pos[2] * MM + s.offset.z * (1 - e));
      m.rotation.set(s.rot.x * (1 - e), p.rotY + s.rot.y * (1 - e), s.rot.z * (1 - e));
      m.visible = local > 0.001;
    });
  });

  return (
    <group>
      {room.panels.map((p, i) => {
        const mat = p.zone ? getFinishMaterial(scheme.zones[p.zone], scheme.grain, quality) : stagingMaterial(p, scheme);
        const isSel = !!p.zone && selected === p.zone;
        const isHov = !!p.zone && hovered === p.zone && !isSel;
        return (
          <mesh
            key={p.key}
            ref={(el) => {
              meshes.current[i] = el;
            }}
            geometry={geoms[i]}
            material={mat}
            position={[p.pos[0] * MM, p.pos[1] * MM, p.pos[2] * MM]}
            rotation={[0, p.rotY, 0]}
            castShadow={shadows && p.staging !== "handle" && p.staging !== "led"}
            receiveShadow={shadows}
            userData={{ zone: p.zone }}
            onPointerOver={
              interactive && p.zone
                ? (e) => {
                    e.stopPropagation();
                    onHover?.(p.zone, e);
                  }
                : undefined
            }
            onPointerOut={interactive && p.zone ? () => onHover?.(null) : undefined}
            onClick={
              interactive && p.zone
                ? (e) => {
                    e.stopPropagation();
                    onSelect?.(p.zone!);
                  }
                : undefined
            }
          >
            {(isSel || isHov) && <Edges threshold={20} scale={1.004} color={isSel ? "#f0d24a" : "#ffffff"} transparent opacity={isSel ? 0.95 : 0.55} />}
          </mesh>
        );
      })}
    </group>
  );
}

// ---------------------------------------------------------------- studio renderer

const T18 = 18;
const interiorMat = () => getStagingMaterial("interior", "#e7e3db", { roughness: 0.62 });
const drawerMat = () => getStagingMaterial("drawer-box", "#d6d3cd", { roughness: 0.5 });
const trayMat = () => getStagingMaterial("tray", "#4a3626", { roughness: 0.55 });

function setCursor(gl: THREE.WebGLRenderer, c: string) {
  gl.domElement.style.cursor = c;
}

/** A carcass as an open box: two sides, top, bottom, back and shelves, all 18mm board. */
function HollowCarcass({ p, shadows }: { p: Panel; shadows: boolean }) {
  const [w, h, d] = p.size;
  const n = p.hollow ?? 0;
  const boards = useMemo(() => {
    const b: { s: [number, number, number]; o: [number, number, number] }[] = [
      { s: [T18, h, d], o: [-w / 2 + T18 / 2, 0, 0] },
      { s: [T18, h, d], o: [w / 2 - T18 / 2, 0, 0] },
      { s: [w - T18 * 2, T18, d], o: [0, -h / 2 + T18 / 2, 0] },
      { s: [w - T18 * 2, T18, d], o: [0, h / 2 - T18 / 2, 0] },
      { s: [w - T18 * 2, h - T18 * 2, T18 / 2], o: [0, 0, -d / 2 + T18 / 4] },
    ];
    for (let i = 0; i < n; i++) {
      const y = n === 1 ? (h > 1500 ? -h / 2 + h * 0.82 : 0) : -h / 2 + (h * (i + 1)) / (n + 1);
      b.push({ s: [w - T18 * 2 - 2, T18, d - T18 - 30], o: [0, y, (T18 / 2 - 30) / 2] });
    }
    return b;
  }, [w, h, d, n]);
  return (
    <group position={[p.pos[0] * MM, p.pos[1] * MM, p.pos[2] * MM]} rotation={[0, p.rotY, 0]}>
      {boards.map((b, i) => (
        <mesh key={i} position={[b.o[0] * MM, b.o[1] * MM, b.o[2] * MM]} scale={[b.s[0] * MM, b.s[1] * MM, b.s[2] * MM]} material={interiorMat()} castShadow={shadows} receiveShadow={shadows}>
          <boxGeometry />
        </mesh>
      ))}
    </group>
  );
}

/** Drawer box behind a drawer front (front-local coordinates, mm): sides, bottom, back; top drawers get a cutlery tray. */
function DrawerBox({ w, h, d, travel }: { w: number; h: number; d: number; travel: number }) {
  const L = travel + 60;
  const iw = w - 70;
  const hb = Math.max(60, h - 80);
  const z0 = -d / 2 - 4;
  const parts: { s: [number, number, number]; o: [number, number, number]; m: THREE.Material }[] = [
    { s: [12, hb, L], o: [-iw / 2, -h / 2 + 30 + hb / 2, z0 - L / 2], m: drawerMat() },
    { s: [12, hb, L], o: [iw / 2, -h / 2 + 30 + hb / 2, z0 - L / 2], m: drawerMat() },
    { s: [iw, 10, L], o: [0, -h / 2 + 30, z0 - L / 2], m: drawerMat() },
    { s: [iw, hb, 12], o: [0, -h / 2 + 30 + hb / 2, z0 - L], m: drawerMat() },
  ];
  if (h < 200) {
    // walnut cutlery insert with dividers
    parts.push({ s: [iw - 14, 8, L - 20], o: [0, -h / 2 + 39, z0 - L / 2], m: trayMat() });
    for (let i = 1; i < 4; i++) parts.push({ s: [6, hb - 30, L - 30], o: [-iw / 2 + (iw / 4) * i, -h / 2 + 40 + (hb - 30) / 2, z0 - L / 2], m: trayMat() });
  }
  return (
    <>
      {parts.map((q, i) => (
        <mesh key={i} position={[q.o[0] * MM, q.o[1] * MM, q.o[2] * MM]} scale={[q.s[0] * MM, q.s[1] * MM, q.s[2] * MM]} material={q.m} castShadow receiveShadow>
          <boxGeometry />
        </mesh>
      ))}
    </>
  );
}

const OPEN_ANGLE = 1.72; // ~100°, a standard hinge

/** A front (and its handle) that slides or swings open, animated toward its target. */
function Openable({
  front,
  riders,
  geoms,
  mats,
  open,
  shadows,
  edges,
  onPick,
  onHoverZone,
  openMode,
}: {
  front: { p: Panel; i: number };
  riders: { p: Panel; i: number }[];
  geoms: THREE.BufferGeometry[];
  mats: THREE.Material[];
  open: boolean;
  shadows: boolean;
  edges: (p: Panel) => React.ReactNode;
  onPick: (p: Panel, e: ThreeEvent<MouseEvent>, dbl: boolean) => void;
  onHoverZone: (p: Panel | null, e?: ThreeEvent<PointerEvent>) => void;
  openMode: boolean;
}) {
  const inner = useRef<THREE.Group>(null);
  const t = useRef(open ? 1 : 0);
  const { invalidate, gl } = useThree();
  const p = front.p;
  const kind = p.motion!.kind;
  const travel = p.motion!.travel ?? 420;
  const [w, h, d] = p.size;
  const cos = Math.cos(p.rotY);
  const sin = Math.sin(p.rotY);
  const ex = kind === "hinge-l" ? -w / 2 : kind === "hinge-r" ? w / 2 : 0;
  const ez = kind === "drawer" ? 0 : d / 2;
  const pivot: [number, number, number] = [p.pos[0] + ex * cos + ez * sin, p.pos[1], p.pos[2] - ex * sin + ez * cos];
  const local = (q: Panel): [number, number, number] => {
    const rx = q.pos[0] - pivot[0];
    const rz = q.pos[2] - pivot[2];
    return [(rx * cos - rz * sin) * MM, (q.pos[1] - pivot[1]) * MM, (rx * sin + rz * cos) * MM];
  };
  useEffect(() => invalidate(), [open, invalidate]);
  useFrame((_, dt) => {
    const target = open ? 1 : 0;
    const k = 1 - Math.exp(-dt * 7);
    t.current += (target - t.current) * k;
    if (Math.abs(target - t.current) < 0.0008) t.current = target;
    else invalidate();
    const g = inner.current;
    if (!g) return;
    // ease-out with a touch of soft-close at the end of travel
    const e = t.current;
    if (kind === "drawer") g.position.z = e * travel * MM;
    else g.rotation.y = (kind === "hinge-l" ? -1 : 1) * e * OPEN_ANGLE;
  });
  const all = [front, ...riders];
  return (
    <group position={[pivot[0] * MM, pivot[1] * MM, pivot[2] * MM]} rotation={[0, p.rotY, 0]}>
      <group ref={inner}>
        {all.map(({ p: q, i }) => (
          <mesh
            key={q.key}
            geometry={geoms[i]}
            material={mats[i]}
            position={local(q)}
            rotation={[0, q.rotY - p.rotY, 0]}
            castShadow={shadows && q.staging !== "handle"}
            receiveShadow={shadows}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHoverZone(p, e);
              if (openMode) setCursor(gl, "pointer");
            }}
            onPointerOut={() => {
              onHoverZone(null);
              setCursor(gl, "");
            }}
            onClick={(e) => {
              e.stopPropagation();
              onPick(p, e, false);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onPick(p, e, true);
            }}
          >
            {q === p ? edges(q) : null}
          </mesh>
        ))}
        {kind === "drawer" && (
          <group position={local(p)}>
            <DrawerBox w={w} h={h} d={d} travel={travel} />
          </group>
        )}
      </group>
    </group>
  );
}

/** Water: a scrolling streak texture on a thin column, with a ripple ring where it lands. */
let waterTex: THREE.CanvasTexture | null = null;
function getWaterTex() {
  if (waterTex) return waterTex;
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#9aa9b0";
  g.fillRect(0, 0, 32, 256);
  for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(255,255,255,${0.15 + Math.random() * 0.5})`;
    g.fillRect(Math.random() * 32, Math.random() * 256, 1 + Math.random() * 3, 10 + Math.random() * 40);
  }
  waterTex = new THREE.CanvasTexture(c);
  waterTex.wrapS = waterTex.wrapT = THREE.RepeatWrapping;
  waterTex.colorSpace = THREE.SRGBColorSpace;
  return waterTex;
}

/** A single-lever mixer tap: body, arched spout and lever. Click to turn it on; water runs into the sink or basin. */
function Tap({ p, on, onToggle }: { p: Panel; on: boolean; onToggle: () => void }) {
  const h = p.size[1] * MM;
  const vessel = p.size[1] < 280; // the vanity tap feeds a vessel basin
  const lever = useRef<THREE.Group>(null);
  const water = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const t = useRef(on ? 1 : 0);
  const { invalidate, gl } = useThree();
  const chrome = getStagingMaterial("chrome", "#eceeef", { metalness: 1, roughness: 0.1 });
  chrome.userData.noRoomEnv = true; // small curved chrome reads best against the studio softboxes
  const waterMat = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: "#d6e7ee", map: getWaterTex().clone(), transparent: true, opacity: 0.62, roughness: 0.05, clearcoat: 1, depthWrite: false, emissive: new THREE.Color("#2a3a44"), emissiveIntensity: 0.4 }),
    [],
  );
  useEffect(() => {
    waterMat.map!.needsUpdate = true;
    return () => waterMat.dispose();
  }, [waterMat]);
  useEffect(() => {
    invalidate();
    if (!on) return;
    startWater();
    return () => stopWater();
  }, [on, invalidate]);
  const top = h / 2 - 0.02;
  const reach = 0.2;
  const arc = 0.1;
  const spoutTipY = top;
  const landY = -h / 2 + (vessel ? 0.105 : -0.2);
  useFrame((_, dt) => {
    const target = on ? 1 : 0;
    t.current += (target - t.current) * (1 - Math.exp(-dt * 9));
    if (Math.abs(target - t.current) < 0.001) t.current = target;
    if (lever.current) lever.current.rotation.x = -t.current * 0.55;
    if (water.current) {
      water.current.visible = t.current > 0.02;
      water.current.scale.set(t.current, 1, t.current);
      waterMat.map!.offset.y -= dt * 3.2;
    }
    if (ring.current) {
      ring.current.visible = t.current > 0.05;
      const k = (performance.now() / 380) % 1;
      ring.current.scale.setScalar(0.6 + k * 1.6);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.45 * (1 - k) * t.current;
    }
    if (on || t.current > 0.001) invalidate();
  });
  const len = spoutTipY - landY;
  return (
    <group
      position={[p.pos[0] * MM, p.pos[1] * MM, p.pos[2] * MM]}
      rotation={[0, p.rotY, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setCursor(gl, "pointer");
      }}
      onPointerOut={() => setCursor(gl, "")}
    >
      {/* base rose and body */}
      <mesh material={chrome} position={[0, -h / 2 + 0.004, 0]} castShadow>
        <cylinderGeometry args={[0.028, 0.03, 0.008, 32]} />
      </mesh>
      <mesh material={chrome} position={[0, (-h / 2 + top) / 2, 0]} castShadow>
        <cylinderGeometry args={[0.017, 0.019, top + h / 2, 32]} />
      </mesh>
      {/* arched spout */}
      <mesh material={chrome} position={[0, top, arc]} rotation={[0, -Math.PI / 2, 0]} castShadow>
        <torusGeometry args={[arc, 0.0105, 16, 48, Math.PI]} />
      </mesh>
      <mesh material={chrome} position={[0, top - 0.008, reach]}>
        <cylinderGeometry args={[0.0125, 0.0115, 0.016, 24]} />
      </mesh>
      {/* lever: pivots up when the tap is on */}
      <group ref={lever} position={[0, -h / 2 + (top + h / 2) * 0.72, -0.02]}>
        <mesh material={chrome} position={[0, 0.006, -0.045]} rotation={[Math.PI / 2 - 0.12, 0, 0]} castShadow>
          <cylinderGeometry args={[0.006, 0.008, 0.09, 16]} />
        </mesh>
      </group>
      {/* invisible, larger hit area so the tap is easy to click */}
      <mesh position={[0, 0, 0.08]} visible={false}>
        <boxGeometry args={[0.12, h, 0.3]} />
      </mesh>
      <mesh ref={water} material={waterMat} position={[0, landY + len / 2, reach]} visible={on}>
        <cylinderGeometry args={[0.0055, 0.0075, len, 14, 1, true]} />
      </mesh>
      <mesh ref={ring} position={[0, landY + 0.002, reach]} rotation={[-Math.PI / 2, 0, 0]} visible={on}>
        <ringGeometry args={[0.012, 0.016, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** An undermount sink bowl below the worktop cut-out: brushed steel walls, floor and a drain. */
function SinkBowl({ p }: { p: Panel }) {
  const steel = getStagingMaterial("sink-steel", "#8f9395", { metalness: 1, roughness: 0.38 });
  const drain = getStagingMaterial("drain", "#5d6062", { metalness: 1, roughness: 0.25 });
  const w = p.size[0] * MM, d = p.size[2] * MM, depth = 0.2, t = 0.003;
  const top = p.pos[1] * MM + 0.002 - 0.03;
  return (
    <group position={[p.pos[0] * MM, top, p.pos[2] * MM]} rotation={[0, p.rotY, 0]}>
      {[
        [[w, t, d], [0, -depth, 0]],
        [[t, depth, d], [-w / 2, -depth / 2, 0]],
        [[t, depth, d], [w / 2, -depth / 2, 0]],
        [[w, depth, t], [0, -depth / 2, -d / 2]],
        [[w, depth, t], [0, -depth / 2, d / 2]],
      ].map(([sz, pos], i) => (
        <mesh key={i} material={steel} position={pos as [number, number, number]} scale={sz as [number, number, number]} receiveShadow castShadow>
          <boxGeometry />
        </mesh>
      ))}
      <mesh material={drain} position={[0, -depth + 0.002, d * 0.15]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.042, 32]} />
      </mesh>
    </group>
  );
}

function StudioMeshes({ room, scheme, quality, selected, hovered, interactive, onHover, onSelect, shadows = true, opened = {}, openMode = false, onToggle }: Props) {
  const geoms = useMemo(() => room.panels.map(panelGeometry), [room]);
  useEffect(() => () => geoms.forEach((g) => g.dispose()), [geoms]);
  const gl = useThree((st) => st.gl);
  const mats = room.panels.map((p) => (p.zone ? getFinishMaterial(scheme.zones[p.zone], scheme.grain, quality) : stagingMaterial(p, scheme)));

  const { fixed, movers } = useMemo(() => {
    const fixed: { p: Panel; i: number }[] = [];
    const movers = new Map<string, { front: { p: Panel; i: number }; riders: { p: Panel; i: number }[] }>();
    room.panels.forEach((p, i) => {
      if (p.motion && p.motion.kind !== "tap") movers.set(p.motion.id, { front: { p, i }, riders: movers.get(p.motion.id)?.riders ?? [] });
    });
    room.panels.forEach((p, i) => {
      if (p.motion && p.motion.kind !== "tap") return;
      if (p.moveWith && movers.has(p.moveWith)) movers.get(p.moveWith)!.riders.push({ p, i });
      else fixed.push({ p, i });
    });
    return { fixed, movers: [...movers.values()] };
  }, [room]);

  const edges = (p: Panel) => {
    const isSel = !!p.zone && selected === p.zone;
    const isHov = !!p.zone && hovered === p.zone && !isSel && !openMode;
    return isSel || isHov ? <Edges threshold={20} scale={1.004} color={isSel ? "#f0d24a" : "#ffffff"} transparent opacity={isSel ? 0.95 : 0.55} /> : null;
  };
  const pick = (p: Panel, _e: ThreeEvent<MouseEvent>, dbl: boolean) => {
    if (!interactive) return;
    if ((openMode || dbl) && p.motion) onToggle?.(p.motion.id);
    else if (p.zone && !dbl) onSelect?.(p.zone);
  };
  const hoverZone = (p: Panel | null, e?: ThreeEvent<PointerEvent>) => {
    if (!interactive) return;
    if (!p) onHover?.(null);
    else if (p.zone && !openMode) onHover?.(p.zone, e);
  };

  return (
    <group>
      {fixed.map(({ p, i }) => {
        if (p.staging === "carcass" && p.hollow !== undefined) return <HollowCarcass key={p.key} p={p} shadows={shadows} />;
        if (p.staging === "sink") return <SinkBowl key={p.key} p={p} />;
        if (p.staging === "tap" && p.motion) return <Tap key={p.key} p={p} on={!!opened[p.motion.id]} onToggle={() => onToggle?.(p.motion!.id)} />;
        return (
          <mesh
            key={p.key}
            geometry={geoms[i]}
            material={mats[i]}
            position={[p.pos[0] * MM, p.pos[1] * MM, p.pos[2] * MM]}
            rotation={[0, p.rotY, 0]}
            castShadow={shadows && p.staging !== "handle" && p.staging !== "led"}
            receiveShadow={shadows}
            onPointerOver={
              interactive && p.zone
                ? (e) => {
                    e.stopPropagation();
                    hoverZone(p, e);
                  }
                : undefined
            }
            onPointerOut={interactive && p.zone ? () => hoverZone(null) : undefined}
            onClick={
              interactive && p.zone
                ? (e) => {
                    e.stopPropagation();
                    if (!openMode) onSelect?.(p.zone!);
                  }
                : undefined
            }
          >
            {edges(p)}
          </mesh>
        );
      })}
      {movers.map((m) => (
        <Openable
          key={m.front.p.key}
          front={m.front}
          riders={m.riders}
          geoms={geoms}
          mats={mats}
          open={!!opened[m.front.p.motion!.id]}
          shadows={shadows}
          edges={edges}
          onPick={pick}
          onHoverZone={hoverZone}
          openMode={openMode}
        />
      ))}
      <CursorReset gl={gl} />
    </group>
  );
}

function CursorReset({ gl }: { gl: THREE.WebGLRenderer }) {
  useEffect(() => () => setCursor(gl, ""), [gl]);
  return null;
}

/**
 * Procedural floor textures (visual staging): oak planks, poured concrete, slate tiles,
 * white porcelain 600mm tiles and polished marble slabs cut from a real marble scan.
 * Each texture covers FLOOR_TILE[kind] metres.
 */
const FLOOR_TILE = [2, 3, 1.8, 1.2, 1.2];
const floorTexCache = new Map<string, THREE.CanvasTexture>();
let marbleImg: HTMLImageElement | null = null;
function loadMarble(): Promise<HTMLImageElement> {
  if (marbleImg?.complete && marbleImg.naturalWidth) return Promise.resolve(marbleImg);
  return new Promise((res) => {
    marbleImg = new Image();
    marbleImg.crossOrigin = "anonymous";
    marbleImg.onload = () => res(marbleImg!);
    marbleImg.onerror = () => res(marbleImg!);
    marbleImg.src = asset("/tex/calacatta-bianco.jpg");
  });
}

function floorTexture(kind: number, base: string) {
  const ready = kind === 4 && !!marbleImg?.complete && !!marbleImg.naturalWidth;
  const ck = `${kind}${ready ? "r" : ""}`;
  const hit = floorTexCache.get(ck);
  if (hit) return hit;
  const size = kind >= 3 ? 2048 : 1024;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const col = new THREE.Color(base);
  const shade = (k: number) => `rgb(${Math.round(Math.min(255, col.r * 255 * k))},${Math.round(Math.min(255, col.g * 255 * k))},${Math.round(Math.min(255, col.b * 255 * k))})`;
  let seed = 7 + kind;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g.fillStyle = shade(1);
  g.fillRect(0, 0, size, size);
  if (kind === 0) {
    // 2m × 2m tile of 180mm oak planks, staggered joints, fine grain
    const plank = size / 11;
    for (let i = 0; i < 11; i++) {
      let y = -rnd() * size;
      while (y < size) {
        const len = size * (0.35 + rnd() * 0.45);
        g.fillStyle = shade(0.86 + rnd() * 0.24);
        g.fillRect(i * plank, y, plank - 2, len - 2);
        for (let k = 0; k < 22; k++) {
          g.strokeStyle = `rgba(60,40,20,${0.04 + rnd() * 0.06})`;
          g.lineWidth = 1;
          const gx = i * plank + rnd() * plank;
          g.beginPath();
          g.moveTo(gx, y);
          g.bezierCurveTo(gx + (rnd() - 0.5) * 8, y + len * 0.3, gx + (rnd() - 0.5) * 8, y + len * 0.7, gx, y + len);
          g.stroke();
        }
        y += len;
      }
    }
  } else if (kind === 1) {
    for (let k = 0; k < 2600; k++) {
      g.fillStyle = `rgba(${rnd() > 0.5 ? "255,255,255" : "0,0,0"},${0.015 + rnd() * 0.03})`;
      const r = 4 + rnd() * 40;
      g.beginPath();
      g.arc(rnd() * size, rnd() * size, r, 0, Math.PI * 2);
      g.fill();
    }
  } else if (kind === 2) {
    const t = size / 3; // 600mm tiles on a 1.8m tile
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) {
        g.fillStyle = shade(0.9 + rnd() * 0.2);
        g.fillRect(i * t + 2, j * t + 2, t - 4, t - 4);
      }
  } else if (kind === 3) {
    // 2 × 2 white porcelain 600mm tiles, 2mm pale grey grout, faint glaze variation
    const t = size / 2;
    g.fillStyle = "#c9c6c0";
    g.fillRect(0, 0, size, size);
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) {
        const x = i * t + 3, y = j * t + 3, w = t - 6;
        const grd = g.createLinearGradient(x, y, x + w, y + w);
        const k = 0.98 + rnd() * 0.03;
        grd.addColorStop(0, shade(k));
        grd.addColorStop(1, shade(k - 0.015));
        g.fillStyle = grd;
        g.fillRect(x, y, w, w);
        for (let n = 0; n < 900; n++) {
          g.fillStyle = `rgba(120,115,105,${rnd() * 0.035})`;
          g.fillRect(x + rnd() * w, y + rnd() * w, 1 + rnd() * 2, 1 + rnd() * 2);
        }
      }
  } else if (kind === 4) {
    // polished marble: two 600 × 1200 slabs per texture, each cut from a different part of the scan
    const tw = size / 2;
    g.fillStyle = "#d8d5cf";
    g.fillRect(0, 0, size, size);
    for (let i = 0; i < 2; i++) {
      const x = i * tw + 2;
      if (ready) {
        const img = marbleImg!;
        const sw = img.naturalWidth * 0.5;
        const sh = Math.min(img.naturalHeight, sw * 2);
        const sx = rnd() * (img.naturalWidth - sw);
        const sy = rnd() * Math.max(0, img.naturalHeight - sh);
        g.save();
        if (i === 1) {
          // bookmatched second slab
          g.translate(x + tw - 4, 0);
          g.scale(-1, 1);
          g.drawImage(img, sx, sy, sw, sh, 0, 2, tw - 4, size - 4);
        } else g.drawImage(img, sx, sy, sw, sh, x, 2, tw - 4, size - 4);
        g.restore();
      } else {
        g.fillStyle = shade(1);
        g.fillRect(x, 2, tw - 4, size - 4);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 16;
  floorTexCache.set(ck, tex);
  return tex;
}

/**
 * The floor. Polished tile and marble get true planar reflections (a mirrored render,
 * blurred by distance) on capable devices; a plain copy sits on layer 1 so the room
 * reflection probe sees a floor without re-entering the reflector.
 */
function Floor({ kind, w, d, cx, cz, shadows, reflect }: { kind: number; w: number; d: number; cx: number; cz: number; shadows: boolean; reflect: boolean }) {
  const [, setReady] = useState(0);
  useEffect(() => {
    if (kind === 4) loadMarble().then(() => setReady((n) => n + 1));
  }, [kind]);
  const invalidate = useThree((st) => st.invalidate);
  const tile = FLOOR_TILE[kind] ?? 2;
  const tex = floorTexture(kind, STAGING.floors[kind]?.color ?? "#b9a389");
  const map = useMemo(() => {
    const m = tex.clone();
    m.needsUpdate = true;
    m.repeat.set(w / tile, d / tile);
    return m;
  }, [tex, w, d, tile]);
  useEffect(() => {
    invalidate();
    return () => map.dispose();
  }, [map, invalidate]);
  const polished = kind === 3 || kind === 4;
  const plain = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        map,
        color: kind >= 3 ? "#dcdad5" : "#ffffff",
        roughness: kind === 4 ? 0.12 : kind === 3 ? 0.22 : kind === 2 ? 0.5 : 0.62,
        clearcoat: kind === 4 ? 0.8 : kind === 3 ? 0.5 : kind === 0 ? 0.15 : 0,
        clearcoatRoughness: kind >= 3 ? 0.06 : 0.5,
      }),
    [map, kind],
  );
  useEffect(() => () => plain.dispose(), [plain]);
  const mirror = useRef<THREE.Mesh>(null);
  useEffect(() => {
    mirror.current?.layers.set(2);
  });
  if (reflect && polished) {
    return (
      <>
        <mesh key={map.uuid} ref={mirror} rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, cz]} receiveShadow={shadows} userData={{ noRoomEnv: true }}>
          <planeGeometry args={[w, d]} />
          <MeshReflectorMaterial
            map={map}
            resolution={1024}
            blur={kind === 4 ? [300, 90] : [420, 160]}
            mixBlur={1}
            mixStrength={kind === 4 ? 0.42 : 0.26}
            mixContrast={1.1}
            mirror={0}
            depthScale={1.4}
            minDepthThreshold={0.25}
            maxDepthThreshold={1.2}
            depthToBlurRatioBias={0.2}
            roughness={kind === 4 ? 0.16 : 0.26}
            metalness={0}
            color="#dcdad5"
          />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, cz]} material={plain} onUpdate={(m) => m.layers.set(1)}>
          <planeGeometry args={[w, d]} />
        </mesh>
      </>
    );
  }
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, cz]} receiveShadow={shadows} material={plain}>
      <planeGeometry args={[w, d]} />
    </mesh>
  );
}

/** Light fittings follow the switch: downlights, LED strips and pendants glow; the ceiling and window follow day or night. */
function useFittings(lightsOn: boolean, night: boolean) {
  const invalidate = useThree((st) => st.invalidate);
  const ceiling = getStagingMaterial("ceiling", "#f2f1ee", { roughness: 0.95, emissive: new THREE.Color("#e9e7e2"), emissiveIntensity: 0.42 });
  const downlight = getStagingMaterial("downlight", "#ffffff", { emissive: new THREE.Color("#fff6e6"), emissiveIntensity: 3, roughness: 1 });
  const sky = getStagingMaterial("sky", "#ffffff", { emissive: new THREE.Color("#eef3f8"), emissiveIntensity: 1.6, roughness: 1 });
  const led = getStagingMaterial("led", "#fff4e0", { emissive: new THREE.Color("#fff1d6"), emissiveIntensity: 2.4, roughness: 1 });
  useEffect(() => {
    ceiling.emissiveIntensity = night ? (lightsOn ? 0.06 : 0.0) : lightsOn ? 0.46 : 0.38;
    downlight.emissiveIntensity = lightsOn ? 5 : night ? 0 : 0.5;
    downlight.color.set(lightsOn ? "#ffffff" : night ? "#3a3a3a" : "#e8e8e8");
    led.emissiveIntensity = lightsOn ? 3 : 0;
    led.color.set(lightsOn ? "#fff4e0" : "#8a8a86");
    sky.emissive.set(night ? "#5b7396" : "#eef3f8");
    sky.color.set(night ? "#0a1320" : "#ffffff");
    sky.emissiveIntensity = night ? 0.22 : 1.6;
    invalidate();
  }, [lightsOn, night, ceiling, downlight, sky, led, invalidate]);
  return { ceiling, downlight, sky };
}

/** A rocker light switch on the wall; click it to switch the room lights. */
function LightSwitch({ position, rotation, on, onToggle }: { position: [number, number, number]; rotation: [number, number, number]; on: boolean; onToggle?: () => void }) {
  const gl = useThree((st) => st.gl);
  const plate = getStagingMaterial("switch-plate", "#f3f2ee", { roughness: 0.35, clearcoat: 0.4 });
  const rocker = getStagingMaterial("switch-rocker", "#ffffff", { roughness: 0.3, clearcoat: 0.5 });
  const dot = getStagingMaterial("switch-dot", "#e4c020", { emissive: new THREE.Color("#e4c020"), emissiveIntensity: on ? 0.2 : 1.6, roughness: 0.5 });
  return (
    <group
      position={position}
      rotation={rotation}
      onClick={(e) => {
        e.stopPropagation();
        onToggle?.();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        gl.domElement.style.cursor = "pointer";
      }}
      onPointerOut={() => (gl.domElement.style.cursor = "")}
    >
      <mesh material={plate} castShadow>
        <boxGeometry args={[0.086, 0.086, 0.008]} />
      </mesh>
      <mesh material={rocker} position={[0, 0, 0.007]} rotation={[on ? -0.14 : 0.14, 0, 0]}>
        <boxGeometry args={[0.034, 0.052, 0.008]} />
      </mesh>
      {/* locator dot glows when the lights are off, so it can be found in the dark */}
      <mesh material={dot} position={[0, -0.034, 0.0045]}>
        <circleGeometry args={[0.0028, 12]} />
      </mesh>
      <mesh visible={false}>
        <boxGeometry args={[0.2, 0.2, 0.06]} />
      </mesh>
    </group>
  );
}

/** Downlight grid shared by the shell (fittings) and RoomLights (light sources), metres. */
export function downlightPoints(room: RoomSpec): [number, number][] {
  if (room.rooms) {
    return room.rooms.flatMap((r) => {
      const a = r.x0 * MM, b = r.x1 * MM;
      const cols = Math.max(2, Math.round((b - a) / 1.4));
      return Array.from({ length: cols }, (_, i) => [1.2, 3.0].map((z) => [a + ((b - a) / cols) * (i + 0.5), z] as [number, number])).flat();
    });
  }
  const W = room.bounds.width * MM + 0.6;
  const cols = Math.max(3, Math.round(W / 1.2));
  const pts: [number, number][] = [];
  for (let i = 0; i < cols; i++) for (const z of [1.0, 2.6]) pts.push([-W / 2 + (W / cols) * (i + 0.5), z]);
  return pts;
}

export interface ShellLights {
  lightsOn?: boolean;
  night?: boolean;
  onLights?: () => void;
  reflect?: boolean;
}

/** Whole-home shell: one floor and ceiling, outer walls, and partitions with a doorway between rooms. */
function HomeShell({ room, scheme, shadows, onRoom, labels, lightsOn = false, night = false, onLights, reflect = false }: { room: RoomSpec; scheme: Scheme; shadows: boolean; onRoom?: (i: number) => void; labels?: boolean } & ShellLights) {
  const rooms = room.rooms!;
  const H = room.bounds.height * MM;
  const D = room.bounds.depth * MM;
  const x0 = rooms[0].x0 * MM;
  const x1 = rooms[rooms.length - 1].x1 * MM;
  const W = x1 - x0;
  const wall = getStagingMaterial("wall", STAGING.walls[scheme.wall].color, { roughness: 0.92 });
  const { ceiling, downlight } = useFittings(lightsOn, night);
  const T = 0.12; // wall thickness
  const cap = getStagingMaterial("wallcap", "#141413", { roughness: 0.8 });
  const DOOR_Z0 = D - 2.0;
  const DOOR_Z1 = D - 1.0;
  const DOOR_H = 2.1;
  const parts: { x: number; z0: number; z1: number; y0: number; y1: number }[] = [];
  rooms.slice(0, -1).forEach((r) => {
    const x = r.x1 * MM + T / 2;
    parts.push({ x, z0: 0, z1: DOOR_Z0, y0: 0, y1: H }, { x, z0: DOOR_Z1, z1: D, y0: 0, y1: H }, { x, z0: DOOR_Z0, z1: DOOR_Z1, y0: DOOR_H, y1: H });
  });
  return (
    <group>
      <Floor kind={scheme.floor} w={W} d={D} cx={(x0 + x1) / 2} cz={D / 2} shadows={shadows} reflect={reflect} />
      {/* front wall: seen only by the reflection probe (layer 1), so glossy fronts reflect a closed room */}
      <mesh position={[(x0 + x1) / 2, H / 2, D]} rotation={[0, Math.PI, 0]} material={wall} onUpdate={(m) => m.layers.set(1)}>
        <planeGeometry args={[W, H]} />
      </mesh>
      {rooms.map((r) => (
        <LightSwitch key={`sw${r.id}`} position={[r.x1 * MM - 0.006, 1.1, DOOR_Z0 - 0.3]} rotation={[0, -Math.PI / 2, 0]} on={lightsOn} onToggle={onLights} />
      ))}
      {/* slab edge under the floor, like an architectural cut-away */}
      <mesh position={[(x0 + x1) / 2, -0.1, D / 2]} material={cap}>
        <boxGeometry args={[W + T * 2, 0.2, D + T]} />
      </mesh>
      {/* back wall with thickness and a dark cap */}
      <mesh position={[(x0 + x1) / 2, H / 2, -T / 2 - 0.001]} receiveShadow={shadows} material={wall}>
        <boxGeometry args={[W + T * 2, H, T]} />
      </mesh>
      <mesh position={[(x0 + x1) / 2, H + 0.01, -T / 2]} material={cap}>
        <boxGeometry args={[W + T * 2, 0.02, T]} />
      </mesh>
      <mesh position={[(x0 + x1) / 2, H, D / 2]} rotation={[Math.PI / 2, 0, 0]} material={ceiling}>
        <planeGeometry args={[W, D]} />
      </mesh>
      {[x0 - T / 2, x1 + T / 2].map((x, i) => (
        <group key={i}>
          <mesh position={[x, H / 2, D / 2]} receiveShadow={shadows} material={wall}>
            <boxGeometry args={[T, H, D]} />
          </mesh>
          <mesh position={[x, H + 0.01, D / 2]} material={cap}>
            <boxGeometry args={[T, 0.02, D]} />
          </mesh>
        </group>
      ))}
      {parts.map((p, i) => (
        <group key={i}>
          <mesh position={[p.x, (p.y0 + p.y1) / 2, (p.z0 + p.z1) / 2]} material={wall} receiveShadow={shadows} castShadow={false}>
            <boxGeometry args={[T, p.y1 - p.y0, p.z1 - p.z0]} />
          </mesh>
          {p.y1 >= H - 0.001 && p.y0 === 0 && (
            <mesh position={[p.x, H + 0.01, (p.z0 + p.z1) / 2]} material={cap}>
              <boxGeometry args={[T, 0.02, p.z1 - p.z0]} />
            </mesh>
          )}
        </group>
      ))}
      {labels &&
        rooms.map((r, i) => (
          <Html key={r.id} position={[((r.x0 + r.x1) / 2) * MM, H + 0.35, D * 0.55]} center zIndexRange={[20, 0]}>
            <button onClick={() => onRoom?.(i)} className="whitespace-nowrap rounded-full bg-black/70 px-3.5 py-1.5 text-[13px] text-porcelain ring-1 ring-white/20 backdrop-blur transition-colors hover:bg-champagne hover:text-ink">
              {r.name} · walk in
            </button>
          </Html>
        ))}
      {downlightPoints(room).map(([x, z], i) => (
        <mesh key={`dl${i}`} position={[x, H - 0.002, z]} rotation={[Math.PI / 2, 0, 0]} material={downlight}>
          <circleGeometry args={[0.045, 20]} />
        </mesh>
      ))}
    </group>
  );
}

export function RoomShell({ room, scheme, shadows = true, onRoom, labels, ...lights }: { room: RoomSpec; scheme: Scheme; shadows?: boolean; onRoom?: (i: number) => void; labels?: boolean } & ShellLights) {
  if (room.rooms) return <HomeShell room={room} scheme={scheme} shadows={shadows} onRoom={onRoom} labels={labels} {...lights} />;
  return <SingleRoomShell room={room} scheme={scheme} shadows={shadows} {...lights} />;
}

function SingleRoomShell({ room, scheme, shadows = true, lightsOn = false, night = false, onLights, reflect = false }: { room: RoomSpec; scheme: Scheme; shadows?: boolean } & ShellLights) {
  const { width, depth, height } = room.bounds;
  const W = width * MM + 0.6;
  const FW = W + 8;
  const FD = depth * MM + 8;
  const wall = getStagingMaterial("wall", STAGING.walls[scheme.wall].color, { roughness: 0.92 });
  const { ceiling, downlight, sky } = useFittings(lightsOn, night);
  const H = height * MM;
  const D = depth * MM;
  const skirting = getStagingMaterial("skirting", STAGING.walls[scheme.wall].color, { roughness: 0.6 });
  const frame = getStagingMaterial("frame", "#2a2a2a", { roughness: 0.4, metalness: 0.6 });
  const pendant = getStagingMaterial("pendant", "#1c1c1c", { roughness: 0.35, metalness: 0.7, side: THREE.DoubleSide });
  // recessed downlights in two rows over the working area
  const lights = useMemo(() => downlightPoints(room), [room]);
  const winZ = Math.min(D * 0.6, 3.1);
  return (
    <group>
      <Floor kind={scheme.floor} w={FW} d={FD} cx={0} cz={D / 2} shadows={shadows} reflect={reflect} />
      {/* front wall with a window, seen only by the reflection probe (layer 1): glossy fronts reflect a closed room */}
      <mesh position={[0, H / 2, D]} rotation={[0, Math.PI, 0]} material={wall} onUpdate={(m) => m.layers.set(1)}>
        <planeGeometry args={[W, H]} />
      </mesh>
      <mesh position={[0.6, 1.5, D - 0.01]} rotation={[0, Math.PI, 0]} material={sky} onUpdate={(m) => m.layers.set(1)}>
        <planeGeometry args={[2.2, 1.6]} />
      </mesh>
      {room.walls.right && <LightSwitch position={[W / 2 - 0.3 - 0.006, 1.1, Math.max(0.9, winZ - 1.15)]} rotation={[0, -Math.PI / 2, 0]} on={lightsOn} onToggle={onLights} />}
      <mesh position={[0, H / 2, -0.001]} receiveShadow={shadows} material={wall}>
        <planeGeometry args={[room.walls.left || room.walls.right ? W : W + 6, H]} />
      </mesh>
      {/* ceiling: faces down, so it is invisible when orbiting above the room */}
      <mesh position={[0, H, D / 2 - 0.5]} rotation={[Math.PI / 2, 0, 0]} material={ceiling}>
        <planeGeometry args={[room.walls.left || room.walls.right ? W : W + 6, D + 1]} />
      </mesh>
      {lights.map(([x, z], i) => (
        <mesh key={i} position={[x, H - 0.002, z]} rotation={[Math.PI / 2, 0, 0]} material={downlight}>
          <circleGeometry args={[0.045, 24]} />
        </mesh>
      ))}
      {/* skirting along the side walls */}
      {[-1, 1].map((sd) => (
        <mesh key={sd} position={[sd * (W / 2 - 0.3 - 0.006), 0.04, D / 2]} material={skirting}>
          <boxGeometry args={[0.012, 0.08, D]} />
        </mesh>
      ))}
      {/* window on the right wall: frame, mullion and a bright daylight pane */}
      <group position={[W / 2 - 0.3 - 0.002, 1.75, winZ]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh material={sky}>
          <planeGeometry args={[1.5, 1.2]} />
        </mesh>
        {[
          [0, 0.62, 1.58, 0.05],
          [0, -0.62, 1.58, 0.05],
          [-0.77, 0, 0.05, 1.29],
          [0.77, 0, 0.05, 1.29],
          [0, 0, 0.03, 1.2],
        ].map(([x, y, w, h], i) => (
          <mesh key={i} position={[x, y, 0.012]} material={frame}>
            <boxGeometry args={[w, h, 0.025]} />
          </mesh>
        ))}
      </group>
      {/* pendants over the island */}
      {room.islandFocus &&
        [-0.7, 0, 0.7].map((dx) => (
          <group key={dx} position={[room.islandFocus![0] * MM + dx, 0, room.islandFocus![2] * MM]}>
            <mesh position={[0, (H + 1.75) / 2, 0]} material={frame}>
              <cylinderGeometry args={[0.003, 0.003, H - 1.75, 6]} />
            </mesh>
            <mesh position={[0, 1.68, 0]} material={pendant} castShadow={false}>
              <cylinderGeometry args={[0.07, 0.11, 0.16, 32, 1, true]} />
            </mesh>
            <mesh position={[0, 1.61, 0]} rotation={[Math.PI / 2, 0, 0]} material={downlight}>
              <circleGeometry args={[0.1, 24]} />
            </mesh>
          </group>
        ))}
      {room.walls.left && (
        <mesh position={[-W / 2 + 0.3, H / 2, D / 2]} rotation={[0, Math.PI / 2, 0]} receiveShadow={shadows} material={wall}>
          <planeGeometry args={[D, H]} />
        </mesh>
      )}
      {room.walls.right && (
        <mesh position={[W / 2 - 0.3, H / 2, D / 2]} rotation={[0, -Math.PI / 2, 0]} receiveShadow={shadows} material={wall}>
          <planeGeometry args={[D, H]} />
        </mesh>
      )}
    </group>
  );
}
