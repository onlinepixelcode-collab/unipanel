"use client";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import type { RoomSpec } from "@/lib/studio/layout";
import { downlightPoints } from "./RoomMeshes";
import { homePlan } from "@/lib/studio/homePlan";
import { walkState } from "./walkState";
import { bumpShadows } from "./shadowState";
import type { Tier } from "./quality";

const MM = 0.001;
let rectInit = false;
function initRect() {
  if (rectInit) return;
  RectAreaLightUniformsLib.init();
  rectInit = true;
}

/**
 * A fixed, small pool of lights that follows the visitor. Every light in the scene costs
 * time on every pixel, so instead of one real light per fitting in every room, the few
 * nearest fittings are lit and the pool is handed on (faded out, moved, faded in) as you
 * walk. The count never changes, so nothing has to recompile.
 */
interface Slot<L> {
  light: L;
  at: number;
  k: number;
}
function assign<L>(pool: Slot<L>[], want: number[], dt: number, place: (s: Slot<L>, i: number) => void) {
  let moving = false;
  for (const s of pool) {
    if (!(s.at >= 0 && want.includes(s.at)) && s.k < 0.03) {
      const free = want.find((i) => !pool.some((q) => q.at === i));
      if (free !== undefined) {
        s.at = free;
        place(s, free);
      }
    }
    const target = s.at >= 0 && want.includes(s.at) ? 1 : 0;
    const nk = s.k + (target - s.k) * (1 - Math.exp(-dt * 5));
    if (Math.abs(nk - s.k) > 0.0005) moving = true;
    s.k = Math.abs(target - nk) < 0.004 ? target : nk;
  }
  return moving;
}
const nearest = (pts: [number, number][], x: number, z: number, n: number) =>
  pts
    .map((p, i) => ({ i, d: Math.hypot(p[0] - x, p[1] - z) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((o) => o.i);

/** Where the lights should gather: the visitor when walking, otherwise the room in view. */
function focusPoint(room: RoomSpec, walking: boolean, homeRoom: number): [number, number] {
  if (walking && walkState.active) return [walkState.x, walkState.z];
  const r = room.rooms?.[Math.max(0, Math.min(homeRoom, (room.rooms?.length ?? 1) - 1))];
  if (r) return [((r.x0 + r.x1) / 2) * MM, ((r.z0 + r.z1) / 2) * MM];
  return [room.focus[0] * MM, room.focus[2] * MM];
}

/**
 * The room's own lights, driven by the light switch: recessed downlights become warm
 * 3000K spotlights, the LED strips under the wall units become area lights washing the
 * splashback, and the island pendants glow. Everything fades in and out.
 */
export function RoomLights({ room, on, tier, homeRoom = 0, walking = false, all = false }: { room: RoomSpec; on: boolean; tier: Tier; homeRoom?: number; walking?: boolean; all?: boolean }) {
  const { invalidate } = useThree();
  initRect();
  const H = room.bounds.height * MM;
  const home = !!room.rooms;
  const pts = useMemo(() => downlightPoints(room), [room]);

  // single rooms: a fixed set of spots
  const fixed = useMemo(() => {
    if (home) return [];
    let list = pts;
    const budget = tier === 2 ? 6 : tier === 1 ? 4 : 3;
    if (list.length > budget) {
      const step = list.length / budget;
      list = Array.from({ length: budget }, (_, i) => pts[Math.floor(i * step)]);
    }
    const f = room.islandFocus ?? room.focus;
    const fx = f[0] * MM;
    const fz = (room.islandFocus ? f[2] : 1100) * MM;
    const order = list.map((p, i) => ({ i, d: Math.hypot(p[0] - fx, p[1] - fz) })).sort((a, b) => a.d - b.d);
    const shadowed = new Set(order.slice(0, tier === 2 ? 2 : tier === 1 ? 1 : 0).map((o) => o.i));
    return list.map((p, i) => ({ p, shadow: shadowed.has(i) }));
  }, [home, pts, room, tier]);

  // whole home: a pool of spots that follows the visitor; the nearest one casts shadows
  const pool = useMemo(() => {
    // for a photo, twice as many fittings are really lit
    const n = home ? (all ? 10 : tier === 2 ? 5 : tier === 1 ? 3 : 2) : 0;
    return Array.from({ length: n }, (_, i): Slot<THREE.SpotLight> => {
      const l = new THREE.SpotLight("#ffd7a6", 0, 0, 0.78, 0.85, 2);
      l.castShadow = i === 0 && tier === 2;
      l.shadow.mapSize.set(1024, 1024);
      l.shadow.bias = -0.0002;
      l.shadow.normalBias = 0.025;
      l.shadow.camera.near = 0.2;
      l.shadow.camera.far = 6;
      return { light: l, at: -1, k: 0 };
    });
  }, [home, tier, pts, all]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => pool.forEach((s) => s.light.dispose()), [pool]);
  const want = useRef<number[]>([]);
  const lastAt = useRef<[number, number, boolean] | null>(null);
  useEffect(() => {
    lastAt.current = null;
  }, [pool, homeRoom, walking]);

  // LED strips: strips that continue each other along a run become one area light
  const leds = useMemo(() => {
    const strips = room.panels
      .filter((p) => p.staging === "led")
      .map((p) => {
        const c = Math.cos(p.rotY), s = Math.sin(p.rotY);
        const along = p.pos[0] * c - p.pos[2] * s; // position along the run
        const across = p.pos[0] * s + p.pos[2] * c;
        return { rotY: p.rotY, y: p.pos[1], a: along - p.size[0] / 2, b: along + p.size[0] / 2, across };
      })
      .sort((p, q) => p.rotY - q.rotY || p.across - q.across || p.a - q.a);
    const out: typeof strips = [];
    for (const st of strips) {
      const last = out[out.length - 1];
      if (last && Math.abs(last.rotY - st.rotY) < 0.01 && Math.abs(last.across - st.across) < 30 && Math.abs(last.y - st.y) < 30 && st.a - last.b < 90) last.b = st.b;
      else out.push({ ...st });
    }
    return out.map((st) => {
      const c = Math.cos(st.rotY), s = Math.sin(st.rotY);
      const mid = (st.a + st.b) / 2;
      return { x: (mid * c + st.across * s) * MM, y: st.y * MM - 0.004, z: (-mid * s + st.across * c) * MM, rotY: st.rotY, w: Math.max(0.1, (st.b - st.a) * MM) };
    });
  }, [room]);
  const pendants = useMemo(() => (!home && room.islandFocus ? [-0.7, 0, 0.7].map((dx) => [room.islandFocus![0] * MM + dx, room.islandFocus![2] * MM] as [number, number]) : []), [home, room]);
  // whole home: the statement fittings (globe cluster, the row of island pendants) each give a real glow
  const features = useMemo(() => {
    if (!home || tier === 0) return [];
    const out: [number, number, number][] = [];
    const cluster = room.props.find((p) => p.kind === "globeCluster");
    if (cluster) out.push([cluster.pos[0] * MM, cluster.pos[1] * MM - 1.1, cluster.pos[2] * MM]);
    const pend = room.props.filter((p) => p.kind === "pendant");
    if (pend.length) out.push([(pend.reduce((a, p) => a + p.pos[0], 0) / pend.length) * MM, 1.85, (pend.reduce((a, p) => a + p.pos[2], 0) / pend.length) * MM]);
    return out;
  }, [home, room, tier]);

  const level = useRef(on ? 1 : 0);
  const group = useRef<THREE.Group>(null);
  useEffect(() => invalidate(), [on, invalidate]);
  useFrame((_, dt) => {
    const target = on ? 1 : 0;
    level.current += (target - level.current) * (1 - Math.exp(-dt * 6));
    if (Math.abs(target - level.current) < 0.002) level.current = target;
    else invalidate();
    // lights stay in the scene at zero intensity: changing the light count would recompile every material
    group.current?.traverse((o) => {
      const l = o as THREE.Light & { userData: { base?: number } };
      if (l.isLight && l.userData.base !== undefined) l.intensity = l.userData.base * level.current;
    });
    if (pool.length) {
      const [x, z] = focusPoint(room, walking, homeRoom);
      const la = lastAt.current;
      if (!la || la[2] !== walking || Math.hypot(x - la[0], z - la[1]) > 0.35) {
        lastAt.current = [x, z, walking];
        if (walking || !room.rooms) want.current = nearest(pts, x, z, pool.length);
        else {
          // looking at the whole house: one lit fitting per room, nearest rooms first
          const centres = room.rooms.map((r) => [((r.x0 + r.x1) / 2) * MM, ((r.z0 + r.z1) / 2) * MM] as [number, number]);
          want.current = nearest(centres, x, z, pool.length).map((ri) => nearest(pts, centres[ri][0], centres[ri][1], 1)[0]);
        }
      }
      const moving = assign(pool, want.current, all ? 1e3 : dt, (s, i) => {
        s.light.position.set(pts[i][0], H - 0.03, pts[i][1]);
        s.light.target.position.set(pts[i][0], 0, pts[i][1]);
        s.light.target.updateMatrixWorld();
        if (s.light.castShadow) bumpShadows(3);
      });
      for (const s of pool) s.light.intensity = 22 * s.k * level.current;
      if (moving && level.current > 0.01) invalidate();
    }
  });

  return (
    <group ref={group}>
      {fixed.map(({ p: [x, z], shadow }, i) => (
        <Spot key={`${x.toFixed(2)}${z}${i}`} x={x} z={z} y={H - 0.03} shadow={shadow} size={tier === 2 ? 1024 : 512} />
      ))}
      {pool.map((s, i) => (
        <group key={`pool${i}`}>
          <primitive object={s.light} />
          <primitive object={s.light.target} />
        </group>
      ))}
      {leds.map((l, i) => (
        <group key={`led${i}`} position={[l.x, l.y, l.z]} rotation={[0, l.rotY, 0]}>
          <rectAreaLight args={["#ffd9a8", 0, l.w, 0.03]} rotation={[-Math.PI / 2, 0, 0]} userData={{ base: 9 }} />
        </group>
      ))}
      {pendants.map(([x, z], i) => (
        <pointLight key={i} position={[x, 1.56, z]} color="#ffc98f" distance={4} decay={2} userData={{ base: 2.2 }} intensity={0} />
      ))}
      {features.map(([x, y, z], i) => (
        <pointLight key={`f${i}`} position={[x, y, z]} color="#ffcf9a" distance={8} decay={2} userData={{ base: 7 }} intensity={0} />
      ))}
      {/* warm light bouncing off walls and ceiling (what the coves and downlights do to a real room) */}
      <hemisphereLight args={["#ffdcb0", home ? "#b89f82" : "#5a4a3a", 0]} userData={{ base: home ? 1.25 : 0.32 }} />
    </group>
  );
}

function Spot({ x, y, z, shadow, size }: { x: number; y: number; z: number; shadow: boolean; size: number }) {
  const target = useMemo(() => new THREE.Object3D(), []);
  useEffect(() => {
    target.position.set(x, 0, z);
    target.updateMatrixWorld();
  }, [target, x, z]);
  return (
    <>
      <primitive object={target} />
      <spotLight
        position={[x, y, z]}
        target={target}
        color="#ffd7a6"
        angle={0.78}
        penumbra={0.85}
        decay={2}
        distance={0}
        intensity={0}
        userData={{ base: 15 }}
        castShadow={shadow}
        shadow-mapSize={[size, size]}
        shadow-bias={-0.0002}
        shadow-normalBias={0.025}
        shadow-radius={6}
        shadow-camera-near={0.2}
        shadow-camera-far={6}
      />
    </>
  );
}

/**
 * Daylight through the windows: the windows nearest the visitor are soft area lights
 * shining into the room, so rooms are bright by the glass and dimmer deeper in. White
 * in daylight (so finishes keep their true colour), warm at golden hour, blue at night.
 * `all` lights every window (used for photo rendering, where each window is a real light source).
 */
const WINDOW_LIGHT: Record<string, { color: string; base: number }> = {
  gallery: { color: "#ffffff", base: 3.5 },
  morning: { color: "#ffffff", base: 7 },
  golden: { color: "#ffc98e", base: 6 },
  evening: { color: "#c9a07a", base: 0.9 },
  night: { color: "#6f86b0", base: 0.3 },
};
export function WindowLights({ room, mood, tier, homeRoom = 0, walking = false, all = false }: { room: RoomSpec; mood: string; tier: Tier; homeRoom?: number; walking?: boolean; all?: boolean }) {
  initRect();
  const { invalidate } = useThree();
  const panes = useMemo(() => {
    const plan = homePlan(room);
    if (plan) {
      const cx = (plan.box.x0 + plan.box.x1) / 2, cz = (plan.box.z0 + plan.box.z1) / 2;
      return plan.windows.map((w) => {
        // a rect light shines along its -z: turn it to face into the house
        const inward = w.axis === "x" ? (w.z > cz ? 0 : Math.PI) : w.x > cx ? Math.PI / 2 : -Math.PI / 2;
        const off = 0.08;
        const x = w.axis === "z" ? w.x + (w.x > cx ? -off : off) : w.x;
        const z = w.axis === "x" ? w.z + (w.z > cz ? -off : off) : w.z;
        return { x, y: (w.y0 + w.y1) / 2, z, w: w.w, h: w.y1 - w.y0, rot: inward };
      });
    }
    if (room.rooms) return [];
    // single room: the window on the right wall
    const W = room.bounds.width * MM + 0.6, D = room.bounds.depth * MM;
    return room.walls.right ? [{ x: W / 2 - 0.3 - 0.08, y: 1.75, z: Math.min(D * 0.6, 3.1), w: 1.5, h: 1.2, rot: Math.PI / 2 }] : [];
  }, [room]);
  const count = all || !room.rooms ? panes.length : Math.min(panes.length, tier === 2 ? 3 : tier === 1 ? 2 : 0);
  const pool = useMemo(() => Array.from({ length: count }, (): Slot<THREE.RectAreaLight> => ({ light: new THREE.RectAreaLight("#ffffff", 0, 1, 1), at: -1, k: 0 })), [count, panes]); // eslint-disable-line react-hooks/exhaustive-deps
  const centres = useMemo(() => panes.map((p) => [p.x, p.z] as [number, number]), [panes]);
  const cfg = WINDOW_LIGHT[mood] ?? WINDOW_LIGHT.morning;
  const amp = useRef(cfg.base);
  const color = useRef(new THREE.Color(cfg.color));
  const tint = useRef(new THREE.Color(cfg.color));
  const want = useRef<number[]>([]);
  const lastAt = useRef<[number, number] | null>(null);
  useEffect(() => {
    lastAt.current = null;
    invalidate();
  }, [pool, homeRoom, walking, mood, invalidate]);
  useFrame((_, dt) => {
    if (!pool.length) return;
    const [x, z] = focusPoint(room, walking, homeRoom);
    if (!lastAt.current || Math.hypot(x - lastAt.current[0], z - lastAt.current[1]) > 0.35) {
      lastAt.current = [x, z];
      want.current = all || !room.rooms ? panes.map((_, i) => i) : nearest(centres, x, z, pool.length);
    }
    let moving = assign(pool, want.current, all ? 1e3 : dt, (s, i) => {
      const p = panes[i];
      s.light.position.set(p.x, p.y, p.z);
      s.light.rotation.set(0, p.rot, 0);
      s.light.width = p.w;
      s.light.height = p.h;
    });
    const k = 1 - Math.exp(-dt * 4);
    if (Math.abs(amp.current - cfg.base) > 0.01) moving = true;
    amp.current += (cfg.base - amp.current) * k;
    tint.current.set(cfg.color);
    color.current.lerp(tint.current, k);
    for (const s of pool) {
      s.light.intensity = amp.current * s.k;
      s.light.color.copy(color.current);
    }
    if (moving) invalidate();
  });
  return (
    <group>
      {pool.map((s, i) => (
        <primitive key={i} object={s.light} />
      ))}
    </group>
  );
}
