"use client";
import * as THREE from "three";
import { Suspense, useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from "react";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { asset } from "@/lib/asset";
import { CameraControls, ContactShadows, PerformanceMonitor, SoftShadows } from "@react-three/drei";
import { EffectComposer, N8AO, Bloom, ToneMapping, SMAA, Vignette, Noise } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import { buildRoom, type RoomSpec } from "@/lib/studio/layout";
import type { CameraPreset, Mood, Scheme, Zone } from "@/lib/studio/scheme";
import { RoomMeshes, RoomShell } from "./RoomMeshes";
import { RoomProps } from "./RoomProps";
import { RoomLights, WindowLights } from "./RoomLights";
import { HomeWalker } from "./HomeWalker";
import { PhotoRender } from "./PhotoRender";
import { Lighting, MOODS } from "./Lighting";
import { configureMaterials, disposeMaterials } from "./materials";
import type { Tier } from "./quality";

export interface StudioHandle {
  capture: (scale?: number) => Promise<string>;
  /** the canvas exactly as it is now (used to save a finished photo) */
  snapshot: () => string;
  exportGroup: () => THREE.Object3D | null;
}

interface Props {
  scheme: Scheme;
  mood: Mood;
  camera: CameraPreset;
  cameraNonce: number;
  tier: Tier;
  selected?: Zone | null;
  hovered?: Zone | null;
  interactive?: boolean;
  lockControls?: boolean;
  onHover?: (z: Zone | null, pt?: { x: number; y: number }) => void;
  onSelect?: (z: Zone) => void;
  handle?: Ref<StudioHandle>;
  compact?: boolean;
  autoRotate?: boolean;
  homeRoom?: number;
  onRoom?: (i: number) => void;
  /** Room interaction: light switch, opening fronts, the tap. */
  lightsOn?: boolean;
  onLights?: () => void;
  opened?: Record<string, boolean>;
  openMode?: boolean;
  onToggle?: (id: string) => void;
  /** Walking the home: the room the visitor is in (-1 = hallway). */
  onRoomChange?: (i: number) => void;
  /** Photo mode: path-traced stills; progress 0..1 is reported back. */
  photo?: boolean;
  onPhotoProgress?: (p: number, label: string) => void;
}

const MM = 0.001;

function cameraPose(room: RoomSpec, preset: CameraPreset, compact: boolean, aspect = 1.4, homeRoom = 0): { pos: THREE.Vector3; look: THREE.Vector3 } {
  const f = new THREE.Vector3(...room.focus).multiplyScalar(MM);
  const w = room.bounds.width * MM;
  // portrait screens need more distance to keep the room's width in frame
  const far = (compact ? 1.12 : 1) * (aspect < 1.1 ? Math.min(2.1, 1.25 / Math.max(aspect, 0.4)) : 1);
  if (room.rooms) {
    const D = room.bounds.depth * MM;
    const r = room.rooms[Math.min(homeRoom, room.rooms.length - 1)];
    if (preset === "walk") {
      const eye = new THREE.Vector3(...r.eye).multiplyScalar(MM);
      const look = new THREE.Vector3(...r.look).multiplyScalar(MM);
      // first person: the orbit target sits just in front of the eye, so dragging looks around
      return { pos: eye, look: eye.clone().add(look.sub(eye).normalize().multiplyScalar(0.05)) };
    }
    if (preset === "overview" && aspect < 0.85) {
      // portrait: look down the length of the house from one end so it fits a tall screen
      const x0 = room.rooms[0].x0 * MM;
      const span = room.bounds.width * MM;
      return { pos: new THREE.Vector3(x0 - 4, 15, D + 11), look: new THREE.Vector3(x0 + span * 0.36, 0, D * 0.45) };
    }
    const cx = preset === "overview" ? 0 : ((r.x0 + r.x1) / 2) * MM;
    const span = preset === "overview" ? room.bounds.width * MM : (r.x1 - r.x0) * MM;
    // dollhouse: high, from the open front, ceiling invisible from above
    const far = preset === "overview" ? 0.8 * Math.min(1.9, Math.max(1, 1.5 / aspect)) : 0.95;
    return { pos: new THREE.Vector3(cx + span * 0.04, Math.max(7, span * far * 1.22), D + Math.max(4, span * far * 0.62)), look: new THREE.Vector3(cx, 0, D * 0.42) };
  }
  switch (preset) {
    case "eye":
      return { pos: new THREE.Vector3(f.x + 0.4, 1.62, f.z + 3.4 * far), look: new THREE.Vector3(f.x, 1.25, 0.2) };
    case "island": {
      const i = room.islandFocus ? new THREE.Vector3(...room.islandFocus).multiplyScalar(MM) : f;
      return { pos: new THREE.Vector3(i.x + 2.4, 1.75, i.z + 2.6), look: i.clone().setY(0.75) };
    }
    case "detail": {
      const d = new THREE.Vector3(...room.detailFocus).multiplyScalar(MM);
      return { pos: new THREE.Vector3(d.x + 0.42, d.y + 0.16, d.z + 0.5), look: d };
    }
    default:
      return {
        pos: new THREE.Vector3(f.x + w * 0.2, 1.8, f.z + Math.max(5.2, w * 1.15) * far),
        look: new THREE.Vector3(f.x - 0.1, 1.05, f.z + 0.5),
      };
  }
}

function Rig({ room, preset, nonce, compact, lock, autoRotate, homeRoom = 0 }: { room: RoomSpec; preset: CameraPreset; nonce: number; compact: boolean; lock?: boolean; autoRotate?: boolean; homeRoom?: number }) {
  const ref = useRef<CameraControls>(null);
  const first = useRef(true);
  const invalidate = useThree((s) => s.invalidate);
  const size = useThree((s) => s.size);
  const aspect = size.width / Math.max(1, size.height);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const { pos, look } = cameraPose(room, preset, compact, aspect, homeRoom);
    const walk = !!room.rooms && preset === "walk";
    // a wider lens when walking reads more like standing in the room
    const cam = c.camera as THREE.PerspectiveCamera;
    cam.fov = walk ? (aspect < 1 ? 64 : 52) : 38;
    cam.updateProjectionMatrix();
    // keep a walker inside the house; leave the orbit free otherwise
    if (walk && room.rooms) {
      const r0 = room.rooms[0], r1 = room.rooms[room.rooms.length - 1];
      c.setBoundary(new THREE.Box3(new THREE.Vector3(r0.x0 * MM + 0.3, 1.0, 0.7), new THREE.Vector3(r1.x1 * MM - 0.3, 2.2, room.bounds.depth * MM - 0.2)));
      c.boundaryEnclosesCamera = true;
      c.mouseButtons.wheel = 0; // wheel walks instead of zooming (handled by Walker)
    } else {
      c.setBoundary(undefined);
      c.boundaryEnclosesCamera = false;
      c.mouseButtons.wheel = 8; // ACTION.DOLLY
    }
    c.setLookAt(pos.x, pos.y, pos.z, look.x, look.y, look.z, !first.current);
    first.current = false;
    invalidate();
  }, [room, preset, nonce, compact, invalidate, aspect > 1.1, homeRoom]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!autoRotate) return;
    let raf = 0;
    const tick = () => {
      ref.current?.rotate(0.0006, 0, false);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoRotate]);

  return (
    <CameraControls
      ref={ref}
      makeDefault
      enabled={!lock}
      smoothTime={0.55}
      minDistance={room.rooms && preset === "walk" ? 0.01 : 0.25}
      maxDistance={room.rooms ? 90 : compact ? 8 : 14}
      minPolarAngle={room.rooms && preset === "walk" ? 0.35 : 0.2}
      maxPolarAngle={room.rooms && preset === "walk" ? Math.PI - 0.35 : Math.PI / 2 - 0.04}
      minAzimuthAngle={room.rooms ? -Infinity : -1.25}
      maxAzimuthAngle={room.rooms ? Infinity : 1.25}
      dollySpeed={0.6}
      truckSpeed={compact ? 0 : 1}
    />
  );
}

function Bridge({ handle, group }: { handle?: Ref<StudioHandle>; group: React.RefObject<THREE.Group | null> }) {
  const { gl, setDpr, invalidate, viewport, scene, camera, controls } = useThree();
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") (window as unknown as { __studio?: unknown }).__studio = { scene, gl, invalidate, camera, controls };
  useImperativeHandle(handle, () => ({
    capture: async (scale = 2) => {
      const prev = viewport.dpr;
      setDpr(Math.min(3, scale));
      invalidate();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await new Promise((r) => requestAnimationFrame(r));
      const url = gl.domElement.toDataURL("image/png");
      setDpr(prev);
      invalidate();
      return url;
    },
    exportGroup: () => group.current,
    snapshot: () => gl.domElement.toDataURL("image/png"),
  }));
  return null;
}

/** frameloop="demand" renders only on change; keep frames coming while env maps and textures settle. */
function Kick({ deps }: { deps: unknown[] }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let n = 0;
    const t = setInterval(() => {
      invalidate();
      if (++n > 24) clearInterval(t);
    }, 120);
    return () => clearInterval(t);
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/**
 * Live room reflections: a cube camera at the middle of the room renders the actual
 * scene (including a front wall only it can see) whenever the design, light or doors
 * change, and glossy surfaces reflect that instead of a generic studio. Re-rendered
 * on change only, so it costs nothing while orbiting.
 */
function RoomReflections({ room, homeRoom = 0, deps, size }: { room: RoomSpec; homeRoom?: number; deps: unknown[]; size: number }) {
  const { gl, scene, invalidate } = useThree();
  const rt = useMemo(() => new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType, generateMipmaps: false }), [size]);
  const cam = useMemo(() => {
    const c = new THREE.CubeCamera(0.05, 40, rt);
    c.children.forEach((ch) => ch.layers.enable(1));
    return c;
  }, [rt]);
  useEffect(() => () => rt.dispose(), [rt]);
  useEffect(() => {
    const D = room.bounds.depth * MM;
    if (room.rooms) {
      const r = room.rooms[Math.max(0, Math.min(homeRoom, room.rooms.length - 1))];
      cam.position.set(((r.x0 + r.x1) / 2) * MM, 1.35, ((r.z0 + r.z1) / 2) * MM);
    } else cam.position.set(room.focus[0] * MM, 1.35, Math.min(D * 0.55, 2.6));
    const capture = () => {
      // glossy materials that already use the probe must not read it while it is written
      const glossy: THREE.MeshStandardMaterial[] = [];
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || m.userData.noRoomEnv) return;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        for (const mm of mats) {
          const sm = mm as THREE.MeshStandardMaterial;
          if (!sm?.isMeshStandardMaterial || sm.userData.noRoomEnv || sm.roughness > 0.5 || (sm.emissiveIntensity ?? 0) > 0.8) continue;
          if (sm.envMap === rt.texture) sm.envMap = null;
          glossy.push(sm);
        }
      });
      cam.update(gl, scene);
      for (const sm of glossy) {
        if (sm.envMap !== rt.texture) {
          sm.envMap = rt.texture;
          sm.envMapIntensity = 1;
          sm.needsUpdate = true;
        }
      }
      invalidate();
    };
    // capture once quickly, then again as textures and the light fade settle
    const ts = [180, 900, 2200].map((d) => setTimeout(capture, d));
    return () => ts.forEach(clearTimeout);
  }, [room, homeRoom, cam, gl, scene, invalidate, rt, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/**
 * The garden outside: a real South African garden panorama (Poly Haven, CC0) around the
 * house, seen through the windows. Its brightness and tint follow the time of day.
 */
const SKY_TINT: Record<string, [string, number]> = { gallery: ["#ffffff", 0.9], morning: ["#ffffff", 1], golden: ["#ffc68f", 0.75], evening: ["#a07a62", 0.18], night: ["#4a5a7a", 0.035] };
function Skydome({ center, mood }: { center: [number, number]; mood: string }) {
  const tex = useLoader(HDRLoader, asset("/hdri/pretoria_gardens_2k.hdr"));
  const mat = useMemo(() => {
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.LinearSRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false });
  }, [tex]);
  const [c, k] = SKY_TINT[mood] ?? SKY_TINT.morning;
  useEffect(() => {
    mat.color.set(c).multiplyScalar(k);
  }, [mat, c, k]);
  return (
    <mesh position={[center[0], 1.6, center[1]]} material={mat} renderOrder={-1} userData={{ noRoomEnv: true, noPath: true }}>
      <sphereGeometry args={[90, 64, 32]} />
    </mesh>
  );
}

/** The view camera also sees layer 2 (the reflective floor), which the reflection probe skips. */
function ViewLayers() {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    camera.layers.enable(2);
  }, [camera]);
  return null;
}

function Materials() {
  const { gl, invalidate } = useThree();
  useMemo(() => configureMaterials({ maxAnisotropy: Math.min(8, gl.capabilities.getMaxAnisotropy()), invalidate }), [gl, invalidate]);
  return null;
}

export default function StudioCanvas(p: Props) {
  const room = useMemo(() => buildRoom(p.scheme), [p.scheme.scene, p.scheme.layout, p.scheme.bookmatch, p.scheme.buildup, p.scheme.handle]); // eslint-disable-line react-hooks/exhaustive-deps
  const group = useRef<THREE.Group>(null);
  const [dprCap, setDprCap] = useState(p.tier === 2 ? 2 : p.tier === 1 ? 1.5 : 1);
  const quality = p.tier === 0 ? "low" : "high";
  const shadows = p.tier >= 1;
  const night = !!MOODS[p.mood].night;
  const lightsOn = !!p.lightsOn;
  const openKey = useMemo(() => JSON.stringify(p.opened ?? {}), [p.opened]);

  useEffect(() => () => disposeMaterials(), []);

  return (
    <Canvas
      shadows={shadows ? (p.tier === 2 ? true : "soft") : false}
      frameloop="demand"
      dpr={[1, dprCap]}
      gl={{ alpha: false, antialias: p.tier < 2, preserveDrawingBuffer: true, powerPreference: "high-performance", toneMapping: THREE.AgXToneMapping, outputColorSpace: THREE.SRGBColorSpace }}
      camera={{ fov: 38, near: 0.05, far: 250, position: [3, 2, 6] }}
      onPointerMissed={() => p.onHover?.(null)}
      style={{ touchAction: "none" }}
      aria-label="3D visualiser canvas"
    >
      <color attach="background" args={[MOODS[p.mood].bg]} />
      <fog attach="fog" args={[MOODS[p.mood].bg, room.rooms ? 45 : 9, room.rooms ? 110 : 22]} />
      {/* PCSS: shadows sharp where an object meets a surface, softer as they fall further away */}
      {p.tier === 2 && <SoftShadows size={22} samples={12} focus={0.45} />}
      <ViewLayers />
      <Materials />
      <Kick deps={[room, p.scheme, p.mood, p.tier, lightsOn]} />
      <RoomLights room={room} on={lightsOn} tier={p.tier} homeRoom={p.homeRoom} />
      {!p.photo && <WindowLights room={room} mood={p.mood} />}
      {shadows && <RoomReflections room={room} homeRoom={p.homeRoom} size={p.tier === 2 ? 512 : 192} deps={[p.scheme, p.mood, lightsOn, openKey]} />}
      <PerformanceMonitor onDecline={() => setDprCap((d) => Math.max(1, d - 0.25))} />
      <Lighting mood={p.mood} shadows={shadows} shadowMapSize={p.tier === 2 ? (room.rooms ? 4096 : 2048) : room.rooms ? 2048 : 1024} span={room.bounds.width * MM} />
      {/* the garden streams in on its own, without holding up the house */}
      <Suspense fallback={null}>{room.rooms && p.camera === "walk" && <Skydome center={[0, (room.bounds.depth * MM) / 2]} mood={p.mood} />}</Suspense>
      <Suspense fallback={null}>
        <group ref={group}>
          <RoomShell
            room={room}
            scheme={p.scheme}
            shadows={shadows}
            labels={!!room.rooms && p.camera !== "walk" && !p.compact}
            onRoom={p.onRoom}
            lightsOn={lightsOn}
            night={night}
            onLights={p.onLights}
            reflect={p.tier === 2}
            cutaway={!!room.rooms && p.camera !== "walk"}
          />
          <RoomProps props={room.props} />
          <RoomMeshes
            room={room}
            scheme={p.scheme}
            quality={quality}
            selected={p.selected}
            hovered={p.hovered}
            interactive={p.interactive}
            shadows={shadows}
            onHover={(z, e) => p.onHover?.(z, e ? { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY } : undefined)}
            onSelect={p.onSelect}
            studio
            opened={p.opened}
            openMode={p.openMode}
            onToggle={p.onToggle}
          />
        </group>
        {!shadows && <ContactShadows position={[0, 0.001, (room.bounds.depth * MM) / 2]} scale={12} blur={2.4} opacity={0.5} far={2.5} frames={1} />}
      </Suspense>
      {room.rooms && p.camera === "walk" ? (
        <HomeWalker room={room} onRoomChange={p.onRoomChange} />
      ) : (
        <Rig room={room} preset={p.camera} nonce={p.cameraNonce} compact={!!p.compact} lock={p.lockControls} autoRotate={p.autoRotate} homeRoom={p.homeRoom} />
      )}
      <Bridge handle={p.handle} group={group} />
      {p.photo && (
        <Suspense fallback={null}>
          <PhotoRender envScale={({ gallery: 0.9, morning: 1, golden: 0.7, evening: 0.15, night: 0.03 } as Record<string, number>)[p.mood] ?? 1} onProgress={p.onPhotoProgress} />
        </Suspense>
      )}
      {p.tier === 2 && !p.photo ? (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          {/* contact shadows in corners and under furniture */}
          <N8AO aoRadius={0.5} distanceFalloff={0.8} intensity={2.6} quality="medium" halfRes />
          {/* bright windows and lamps bloom a little, as they do through a lens */}
          <Bloom luminanceThreshold={0.88} luminanceSmoothing={0.15} intensity={0.32} mipmapBlur />
          {/* filmic AgX curve: sunlit walls roll off softly instead of clipping to white */}
          <ToneMapping mode={ToneMappingMode.AGX} />
          <SMAA />
          {/* a lens's gentle falloff and fine sensor grain */}
          <Vignette offset={0.28} darkness={0.42} />
          <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.16} />
        </EffectComposer>
      ) : null}
    </Canvas>
  );
}
