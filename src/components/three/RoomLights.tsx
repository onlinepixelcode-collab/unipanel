"use client";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import type { RoomSpec } from "@/lib/studio/layout";
import { downlightPoints } from "./RoomMeshes";
import type { Tier } from "./quality";

const MM = 0.001;
let rectInit = false;

/**
 * The room's own lights, driven by the light switch: recessed downlights become warm
 * 3000K spotlights (the nearest few cast real shadows), the LED strips under the wall
 * units become area lights washing the splashback, and the island pendants glow.
 * Everything fades in and out rather than snapping.
 */
export function RoomLights({ room, on, tier, homeRoom = 0 }: { room: RoomSpec; on: boolean; tier: Tier; homeRoom?: number }) {
  const { invalidate } = useThree();
  if (!rectInit) {
    RectAreaLightUniformsLib.init();
    rectInit = true;
  }
  const H = room.bounds.height * MM;

  const spots = useMemo(() => {
    let pts = downlightPoints(room);
    if (room.rooms) {
      // whole home: two per room, but the full set in the room being viewed
      const r = room.rooms[Math.min(homeRoom, room.rooms.length - 1)];
      const inRoom = pts.filter(([x]) => x > r.x0 * MM && x < r.x1 * MM);
      const others = room.rooms.filter((q) => q !== r).flatMap((q) => [[((q.x0 + q.x1) / 2) * MM, 1.6] as [number, number]]);
      pts = [...inRoom.slice(0, tier === 2 ? 6 : 4), ...others];
    } else {
      const budget = tier === 2 ? 8 : tier === 1 ? 5 : 3;
      if (pts.length > budget) {
        const step = pts.length / budget;
        pts = Array.from({ length: budget }, (_, i) => pts[Math.floor(i * step)]);
      }
    }
    // the two spots nearest the focus cast shadows (tier 2: two, tier 1: one)
    const f = room.islandFocus ?? room.focus;
    const fx = f[0] * MM;
    const fz = (room.islandFocus ? f[2] : 1100) * MM;
    const order = pts.map((p, i) => ({ i, d: Math.hypot(p[0] - fx, p[1] - fz) })).sort((a, b) => a.d - b.d);
    const shadowCount = room.rooms ? (tier === 2 ? 1 : 0) : tier === 2 ? 2 : tier === 1 ? 1 : 0;
    const shadowed = new Set(order.slice(0, shadowCount).map((o) => o.i));
    return pts.map((p, i) => ({ p, shadow: shadowed.has(i) }));
  }, [room, tier, homeRoom]);

  const leds = useMemo(() => room.panels.filter((p) => p.staging === "led"), [room]);
  const pendants = useMemo(() => (!room.rooms && room.islandFocus ? [-0.7, 0, 0.7].map((dx) => [room.islandFocus![0] * MM + dx, room.islandFocus![2] * MM] as [number, number]) : []), [room]);

  const level = useRef(on ? 1 : 0);
  const group = useRef<THREE.Group>(null);
  useEffect(() => invalidate(), [on, invalidate]);
  useFrame((_, dt) => {
    const target = on ? 1 : 0;
    level.current += (target - level.current) * (1 - Math.exp(-dt * 6));
    if (Math.abs(target - level.current) < 0.002) level.current = target;
    else invalidate();
    const g = group.current;
    if (!g) return;
    // lights stay in the scene at zero intensity: changing the light count would recompile every material
    g.traverse((o) => {
      const l = o as THREE.Light & { userData: { base?: number } };
      if (l.isLight && l.userData.base !== undefined) l.intensity = l.userData.base * level.current;
    });
  });

  return (
    <group ref={group}>
      {spots.map(({ p: [x, z], shadow }, i) => (
        <Spot key={`${x.toFixed(2)}${z}${i}`} x={x} z={z} y={H - 0.03} shadow={shadow} size={tier === 2 ? 1024 : 512} />
      ))}
      {leds.map((p) => (
        <group key={p.key} position={[p.pos[0] * MM, p.pos[1] * MM - 0.004, p.pos[2] * MM]} rotation={[0, p.rotY, 0]}>
          <rectAreaLight args={["#ffd9a8", 0, Math.max(0.1, p.size[0] * MM), 0.03]} rotation={[-Math.PI / 2, 0, 0]} userData={{ base: 9 }} />
        </group>
      ))}
      {pendants.map(([x, z], i) => (
        <pointLight key={i} position={[x, 1.56, z]} color="#ffc98f" distance={4} decay={2} userData={{ base: 2.2 }} intensity={0} />
      ))}
      {/* warm light bouncing off walls and ceiling */}
      <hemisphereLight args={["#ffdcb0", "#5a4a3a", 0]} userData={{ base: 0.32 }} />
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
