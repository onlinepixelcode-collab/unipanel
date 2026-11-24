"use client";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { RoomSpec } from "@/lib/studio/layout";
import { collide, homePlan, obstacles, regionAt, route } from "@/lib/studio/homePlan";
import { setGoto, walkState } from "./walkState";

const EYE = 1.6;
const RADIUS = 0.26;
const WALK = 2.7; // m/s: a brisk pace, so crossing the house takes a few seconds
const RUN = 4.6;

/**
 * First-person walking through the home. Drag to look around, click the floor to walk
 * there (routed through doorways), W A S D / arrows to move, scroll to step. Walls and
 * furniture are solid; doors open as you reach them.
 */
export function HomeWalker({ room, onRoomChange }: { room: RoomSpec; onRoomChange?: (i: number) => void }) {
  const { camera, gl, invalidate, scene, size } = useThree();
  const plan = useMemo(() => homePlan(room)!, [room]);
  const rects = useMemo(() => obstacles(plan, room), [plan, room]);
  const s = useRef({ x: plan.spawn.x, z: plan.spawn.z, yaw: plan.spawn.yaw, pitch: -0.06, path: [] as [number, number][], face: null as number | null, keys: new Set<string>(), bob: 0, stuck: 0, lastD: 0, look: 0 });
  const marker = useRef<THREE.Mesh>(null);
  const markerT = useRef(0);

  // enter: start at the front hall the first time, otherwise where the visitor left off
  useEffect(() => {
    const st = s.current;
    const key = `${plan.box.x0.toFixed(2)}:${plan.box.x1.toFixed(2)}:${plan.box.z1.toFixed(2)}`;
    const w = walkState as typeof walkState & { key?: string; pending?: [number, number, number] | null };
    if (w.key === key) {
      st.x = w.x;
      st.z = w.z;
      st.yaw = w.yaw;
    } else {
      st.x = plan.spawn.x;
      st.z = plan.spawn.z;
      st.yaw = plan.spawn.yaw;
      w.key = key;
    }
    walkState.active = true;
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = size.width / size.height < 1 ? 72 : 60;
    cam.near = 0.05;
    cam.updateProjectionMatrix();
    setGoto((x, z, face) => {
      st.path = route(plan, [st.x, st.z], [x, z]);
      st.face = face ?? null;
      invalidate();
    });
    if (w.pending) {
      st.path = route(plan, [st.x, st.z], [w.pending[0], w.pending[1]]);
      st.face = w.pending[2];
      w.pending = null;
    }
    invalidate();
    return () => {
      walkState.active = false;
      setGoto(null);
    };
  }, [plan, camera, invalidate, size.width, size.height]);

  // input
  useEffect(() => {
    const el = gl.domElement;
    const st = s.current;
    let down: { x: number; y: number; moved: boolean; id: number } | null = null;
    const ray = new THREE.Raycaster();
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      down = { x: e.clientX, y: e.clientY, moved: false, id: e.pointerId };
    };
    const onMove = (e: PointerEvent) => {
      if (!down || e.pointerId !== down.id) return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (!down.moved && Math.hypot(dx, dy) < 6) return;
      if (!down.moved) el.style.cursor = "grabbing";
      down.moved = true;
      const k = e.pointerType === "touch" ? 0.006 : 0.0045;
      st.yaw += dx * k;
      st.pitch = Math.max(-1.1, Math.min(0.9, st.pitch + dy * k * 0.8));
      down.x = e.clientX;
      down.y = e.clientY;
      st.look = 1;
      invalidate();
    };
    const onUp = (e: PointerEvent) => {
      if (!down || e.pointerId !== down.id) return;
      const moved = down.moved;
      down = null;
      el.style.cursor = "";
      if (moved) return;
      // a click on the floor walks there
      const r = el.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(scene.children, true).find((h) => (h.object as THREE.Mesh).isMesh && h.object.visible);
      if (!hit || hit.point.y > 0.06) return;
      const p = hit.point;
      st.path = route(plan, [st.x, st.z], [p.x, p.z]);
      st.face = null;
      if (marker.current) {
        marker.current.position.set(p.x, 0.012, p.z);
        markerT.current = 1;
      }
      invalidate();
    };
    const keyMap: Record<string, string> = { arrowup: "w", arrowdown: "s", arrowleft: "a", arrowright: "d" };
    const onKey = (e: KeyboardEvent, isDown: boolean) => {
      const t = (e.target as HTMLElement)?.tagName;
      if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT") return;
      const k = keyMap[e.key.toLowerCase()] ?? e.key.toLowerCase();
      if (!["w", "a", "s", "d", "shift", "q", "e"].includes(k)) return;
      if (isDown) {
        e.preventDefault();
        st.keys.add(k);
        st.path = [];
        st.face = null;
        invalidate();
      } else st.keys.delete(k);
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    const pad = (e: Event) => {
      const { key, down: d } = (e as CustomEvent).detail as { key: string; down: boolean };
      if (d) {
        st.keys.add(key);
        st.path = [];
      } else st.keys.delete(key);
      invalidate();
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const step = Math.max(-1.2, Math.min(1.2, -e.deltaY * 0.004));
      const tx = st.x - Math.sin(st.yaw) * step * 2, tz = st.z - Math.cos(st.yaw) * step * 2;
      st.path = [[tx, tz]];
      invalidate();
    };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("unipanel:walk", pad);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("unipanel:walk", pad);
      el.removeEventListener("wheel", wheel);
    };
  }, [gl, camera, scene, plan, invalidate]);

  useFrame((_, rawDt) => {
    const dt = Math.min(0.12, rawDt);
    const st = s.current;
    let mx = 0, mz = 0, moving = false;
    const speed = st.keys.has("shift") ? RUN : WALK;
    if (st.keys.size) {
      const f = (st.keys.has("w") ? 1 : 0) - (st.keys.has("s") ? 1 : 0);
      const r = (st.keys.has("d") ? 1 : 0) - (st.keys.has("a") ? 1 : 0);
      if (st.keys.has("q")) st.yaw += dt * 2.2;
      if (st.keys.has("e")) st.yaw -= dt * 2.2;
      const fx = -Math.sin(st.yaw), fz = -Math.cos(st.yaw);
      const rx = Math.cos(st.yaw), rz = -Math.sin(st.yaw);
      mx = (fx * f + rx * r) * speed * dt;
      mz = (fz * f + rz * r) * speed * dt;
      moving = f !== 0 || r !== 0 || st.keys.has("q") || st.keys.has("e");
    } else if (st.path.length) {
      const [tx, tz] = st.path[0];
      const dx = tx - st.x, dz = tz - st.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.12) {
        st.path.shift();
        st.stuck = 0;
      } else {
        const v = Math.min(d, speed * dt * Math.min(1, d / 0.4 + 0.35));
        mx = (dx / d) * v;
        mz = (dz / d) * v;
        // turn to face where we're walking, gently
        const want = Math.atan2(-dx, -dz);
        let diff = want - st.yaw;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        st.yaw += diff * Math.min(1, dt * 5);
        st.pitch += (-0.06 - st.pitch) * Math.min(1, dt * 2);
        moving = true;
        // give up on a waypoint we can't reach (furniture in the way)
        if (Math.abs(st.lastD - d) < 0.0005) st.stuck += dt;
        else st.stuck = 0;
        st.lastD = d;
        if (st.stuck > 0.6) {
          st.path.shift();
          st.stuck = 0;
        }
      }
    }
    // after arriving, turn to face the way we were sent (e.g. a room's feature wall)
    if (!st.path.length && st.face !== null && !st.keys.size) {
      let diff = st.face - st.yaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      if (Math.abs(diff) < 0.01) st.face = null;
      else {
        st.yaw += diff * Math.min(1, dt * 3);
        moving = true;
      }
    }
    if (mx || mz) {
      const [nx, nz] = collide(st.x + mx, st.z + mz, RADIUS, rects);
      const moved = Math.hypot(nx - st.x, nz - st.z);
      st.bob += moved * 5.5;
      st.x = nx;
      st.z = nz;
    }
    const y = EYE + (moving ? Math.sin(st.bob) * 0.011 : 0);
    camera.position.set(st.x, y, st.z);
    camera.rotation.set(st.pitch, st.yaw, 0, "YXZ");
    walkState.x = st.x;
    walkState.z = st.z;
    walkState.yaw = st.yaw;
    const reg = regionAt(plan, st.x, st.z);
    if (reg !== walkState.room) {
      walkState.room = reg;
      onRoomChange?.(reg);
    }
    if (marker.current) {
      markerT.current = Math.max(0, markerT.current - dt * 0.9);
      marker.current.visible = markerT.current > 0;
      (marker.current.material as THREE.MeshBasicMaterial).opacity = markerT.current * 0.8;
      marker.current.scale.setScalar(1 + (1 - markerT.current) * 0.6);
    }
    if (moving || st.path.length || markerT.current > 0) invalidate();
    st.look = 0;
  });

  return (
    <mesh ref={marker} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.16, 0.2, 40]} />
      <meshBasicMaterial color="#e4c020" transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
