"use client";
import * as THREE from "three";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Edges, Html } from "@react-three/drei";
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
}

export function RoomMeshes({ room, scheme, quality, selected, hovered, interactive, onHover, onSelect, progress, shadows = true }: Props) {
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

/** Floor and walls, neutral staging only. */
/** Procedural floor textures (visual staging): oak planks, poured concrete, slate tiles. Tiles in metres. */
const floorTexCache = new Map<number, THREE.CanvasTexture>();
function floorTexture(kind: number, base: string) {
  const hit = floorTexCache.get(kind);
  if (hit) return hit;
  const size = 1024;
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
  } else {
    const t = size / 3; // 600mm tiles on a 1.8m tile
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) {
        g.fillStyle = shade(0.9 + rnd() * 0.2);
        g.fillRect(i * t + 2, j * t + 2, t - 4, t - 4);
      }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  floorTexCache.set(kind, tex);
  return tex;
}

/** Whole-home shell: one floor and ceiling, outer walls, and partitions with a doorway between rooms. */
function HomeShell({ room, scheme, shadows, onRoom, labels }: { room: RoomSpec; scheme: Scheme; shadows: boolean; onRoom?: (i: number) => void; labels?: boolean }) {
  const rooms = room.rooms!;
  const H = room.bounds.height * MM;
  const D = room.bounds.depth * MM;
  const x0 = rooms[0].x0 * MM;
  const x1 = rooms[rooms.length - 1].x1 * MM;
  const W = x1 - x0;
  const floor = useMemo(() => {
    const tile = scheme.floor === 0 ? 2 : scheme.floor === 1 ? 3 : 1.8;
    const map = floorTexture(scheme.floor, STAGING.floors[scheme.floor].color).clone();
    map.needsUpdate = true;
    map.repeat.set(W / tile, D / tile);
    return new THREE.MeshPhysicalMaterial({ map, roughness: scheme.floor === 2 ? 0.5 : 0.62, clearcoat: scheme.floor === 0 ? 0.15 : 0, clearcoatRoughness: 0.5 });
  }, [scheme.floor, W, D]);
  useEffect(() => () => floor.dispose(), [floor]);
  const wall = getStagingMaterial("wall", STAGING.walls[scheme.wall].color, { roughness: 0.92 });
  const ceiling = getStagingMaterial("ceiling", "#f2f1ee", { roughness: 0.95, emissive: new THREE.Color("#e9e7e2"), emissiveIntensity: 0.42 });
  const downlight = getStagingMaterial("downlight", "#ffffff", { emissive: new THREE.Color("#fff6e6"), emissiveIntensity: 3, roughness: 1 });
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(x0 + x1) / 2, 0, D / 2]} receiveShadow={shadows} material={floor}>
        <planeGeometry args={[W, D]} />
      </mesh>
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
      {rooms.flatMap((r) => {
        const a = r.x0 * MM, b = r.x1 * MM;
        const cols = Math.max(2, Math.round((b - a) / 1.4));
        return Array.from({ length: cols }, (_, i) =>
          [1.2, 3.0].map((z) => (
            <mesh key={`${r.id}${i}${z}`} position={[a + ((b - a) / cols) * (i + 0.5), H - 0.002, z]} rotation={[Math.PI / 2, 0, 0]} material={downlight}>
              <circleGeometry args={[0.045, 20]} />
            </mesh>
          )),
        );
      })}
    </group>
  );
}

export function RoomShell({ room, scheme, shadows = true, onRoom, labels }: { room: RoomSpec; scheme: Scheme; shadows?: boolean; onRoom?: (i: number) => void; labels?: boolean }) {
  if (room.rooms) return <HomeShell room={room} scheme={scheme} shadows={shadows} onRoom={onRoom} labels={labels} />;
  return <SingleRoomShell room={room} scheme={scheme} shadows={shadows} />;
}

function SingleRoomShell({ room, scheme, shadows = true }: { room: RoomSpec; scheme: Scheme; shadows?: boolean }) {
  const { width, depth, height } = room.bounds;
  const W = width * MM + 0.6;
  const FW = W + 8;
  const FD = depth * MM + 8;
  const floor = useMemo(() => {
    const tile = scheme.floor === 0 ? 2 : scheme.floor === 1 ? 3 : 1.8;
    const map = floorTexture(scheme.floor, STAGING.floors[scheme.floor].color).clone();
    map.needsUpdate = true;
    map.repeat.set(FW / tile, FD / tile);
    return new THREE.MeshPhysicalMaterial({ map, roughness: scheme.floor === 2 ? 0.5 : 0.62, clearcoat: scheme.floor === 0 ? 0.15 : 0, clearcoatRoughness: 0.5 });
  }, [scheme.floor, FW, FD]);
  useEffect(() => () => floor.dispose(), [floor]);
  const wall = getStagingMaterial("wall", STAGING.walls[scheme.wall].color, { roughness: 0.92 });
  const ceiling = getStagingMaterial("ceiling", "#f2f1ee", { roughness: 0.95, emissive: new THREE.Color("#e9e7e2"), emissiveIntensity: 0.42 });
  const downlight = getStagingMaterial("downlight", "#ffffff", { emissive: new THREE.Color("#fff6e6"), emissiveIntensity: 3, roughness: 1 });
  const H = height * MM;
  const D = depth * MM;
  const skirting = getStagingMaterial("skirting", STAGING.walls[scheme.wall].color, { roughness: 0.6 });
  const frame = getStagingMaterial("frame", "#2a2a2a", { roughness: 0.4, metalness: 0.6 });
  const sky = getStagingMaterial("sky", "#ffffff", { emissive: new THREE.Color("#eef3f8"), emissiveIntensity: 1.6, roughness: 1 });
  const pendant = getStagingMaterial("pendant", "#1c1c1c", { roughness: 0.35, metalness: 0.7, side: THREE.DoubleSide });
  // recessed downlights in two rows over the working area
  const lights = useMemo(() => {
    const pts: [number, number][] = [];
    const cols = Math.max(3, Math.round(W / 1.2));
    for (let i = 0; i < cols; i++) for (const z of [1.0, 2.6]) pts.push([-W / 2 + (W / cols) * (i + 0.5), z]);
    return pts;
  }, [W]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, D / 2]} receiveShadow={shadows} material={floor}>
        <planeGeometry args={[FW, FD]} />
      </mesh>
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
      <group position={[W / 2 - 0.3 - 0.002, 1.75, Math.min(D * 0.6, 3.1)]} rotation={[0, -Math.PI / 2, 0]}>
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
