"use client";
import * as THREE from "three";
import { Suspense, useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
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
import { bumpShadows, takeShadowFrame } from "./shadowState";
import { Lighting, MOODS } from "./Lighting";
import { configureMaterials, disposeMaterials } from "./materials";
import type { Tier } from "./quality";

export interface StudioHandle {
  /** render the current view at `scale` times the screen resolution and return it as an image */
  capture: (scale?: number, type?: "image/png" | "image/jpeg") => Promise<string>;
  /** wait for this many freshly rendered frames (e.g. after switching lighting quality) */
  settle: (frames?: number) => Promise<void>;
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
  /** Photo quality: every window and room light on, finest contact shadows. Used while a photo is taken. */
  photo?: boolean;
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
  const { gl, setDpr, invalidate, viewport, scene, camera, controls, size, raycaster } = useThree();
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") (window as unknown as { __studio?: unknown }).__studio = { scene, gl, invalidate, camera, controls, raycaster };
  useImperativeHandle(handle, () => ({
    capture: async (scale = 2, type = "image/png") => {
      const prev = viewport.dpr;
      // never ask the GPU for more than a 4K-wide frame
      setDpr(Math.max(1, Math.min(3, scale, 4096 / Math.max(size.width, size.height))));
      // a few frames at the new size, so shadows, reflections and effects have all redrawn
      for (let i = 0; i < 5; i++) {
        invalidate();
        await new Promise((r) => requestAnimationFrame(r));
      }
      const url = gl.domElement.toDataURL(type, 0.93);
      setDpr(prev);
      invalidate();
      return url;
    },
    settle: async (frames = 8) => {
      for (let i = 0; i < frames; i++) {
        invalidate();
        await new Promise((r) => requestAnimationFrame(r));
      }
    },
    exportGroup: () => group.current,
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

const EMPTY_SCENE = new THREE.Scene();

/**
 * Live room reflections: a cube camera at the middle of the room renders the actual
 * scene (including a front wall only it can see), and glossy surfaces reflect that
 * instead of a generic studio. To stay smooth it draws one of the six directions per
 * frame into a spare cube map and then swaps it in, so changing a finish or walking
 * into another room never causes a hitch.
 */
function RoomReflections({ room, homeRoom = 0, deps, size }: { room: RoomSpec; homeRoom?: number; deps: unknown[]; size: number }) {
  const { gl, scene, invalidate } = useThree();
  const rts = useMemo(() => [0, 1].map(() => new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType, generateMipmaps: false })), [size]);
  const cams = useMemo(
    () =>
      rts.map((rt) => {
        const c = new THREE.CubeCamera(0.05, 40, rt);
        c.children.forEach((ch) => ch.layers.enable(1));
        return c;
      }),
    [rts],
  );
  useEffect(() => () => rts.forEach((rt) => rt.dispose()), [rts]);
  const st = useRef({ active: -1, face: -1, pending: false, primed: [false, false] });
  useEffect(() => {
    st.current = { active: -1, face: -1, pending: false, primed: [false, false] };
  }, [rts]);
  useEffect(() => {
    const req = () => {
      st.current.pending = true;
      invalidate();
    };
    // once quickly, then again after textures and light fades have settled
    const ts = [250, 1800].map((d) => setTimeout(req, d));
    return () => ts.forEach(clearTimeout);
  }, [room, homeRoom, invalidate, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
  useFrame(() => {
    const s = st.current;
    const target = s.active === 0 ? 1 : 0;
    const cam = cams[target], rt = rts[target];
    if (s.face < 0) {
      if (!s.pending) return;
      s.pending = false;
      s.face = 0;
      const D = room.bounds.depth * MM;
      if (room.rooms) {
        const r = room.rooms[Math.max(0, Math.min(homeRoom, room.rooms.length - 1))];
        cam.position.set(((r.x0 + r.x1) / 2) * MM, 1.35, ((r.z0 + r.z1) / 2) * MM);
      } else cam.position.set(room.focus[0] * MM, 1.35, Math.min(D * 0.55, 2.6));
      if (!s.primed[target]) {
        // let three orient the six cameras for this renderer (an empty scene, so it costs nothing)
        cam.update(gl, EMPTY_SCENE);
        s.primed[target] = true;
      }
      cam.updateMatrixWorld(true);
    }
    const prev = gl.getRenderTarget();
    const xr = gl.xr.enabled;
    gl.xr.enabled = false;
    gl.setRenderTarget(rt, s.face);
    gl.render(scene, cam.children[s.face] as THREE.Camera);
    gl.setRenderTarget(prev);
    gl.xr.enabled = xr;
    s.face++;
    if (s.face === 6) {
      s.face = -1;
      rt.texture.needsPMREMUpdate = true;
      s.active = target;
      // glossy surfaces now reflect the fresh capture (the other cube map is free to be redrawn)
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || m.userData.noRoomEnv) return;
        for (const mm of Array.isArray(m.material) ? m.material : [m.material]) {
          const sm = mm as THREE.MeshStandardMaterial;
          if (!sm?.isMeshStandardMaterial || sm.userData.noRoomEnv || sm.roughness > 0.5 || (sm.emissiveIntensity ?? 0) > 0.8) continue;
          if (sm.envMap !== rt.texture) {
            const first = !sm.envMap;
            sm.envMap = rt.texture;
            sm.envMapIntensity = 1;
            if (first) sm.needsUpdate = true;
          }
        }
      });
    }
    invalidate();
  });
  return null;
}

/** Shadows are redrawn only while something that casts them or lights them is changing. */
function ShadowScheduler({ deps }: { deps: unknown[] }) {
  const { gl, invalidate } = useThree();
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    return () => {
      gl.shadowMap.autoUpdate = true;
    };
  }, [gl]);
  useEffect(() => {
    bumpShadows(150);
    invalidate();
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useFrame(() => {
    if (takeShadowFrame()) gl.shadowMap.needsUpdate = true;
  });
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
  const walking = !!room.rooms && p.camera === "walk";
  // a whole house is a lot of pixels to light: cap the resolution so walking stays smooth
  const maxDpr = Math.min(dprCap, room.rooms ? (p.tier === 2 ? 1.5 : 1.25) : 2);

  useEffect(() => () => disposeMaterials(), []);

  return (
    <Canvas
      shadows={shadows ? (p.tier === 2 ? true : "soft") : false}
      frameloop="demand"
      dpr={[1, maxDpr]}
      gl={{ alpha: false, antialias: p.tier < 2, preserveDrawingBuffer: true, powerPreference: "high-performance", toneMapping: THREE.NeutralToneMapping, outputColorSpace: THREE.SRGBColorSpace }}
      camera={{ fov: 38, near: 0.05, far: 250, position: [3, 2, 6] }}
      onPointerMissed={() => p.onHover?.(null)}
      style={{ touchAction: "none" }}
      aria-label="3D visualiser canvas"
    >
      <color attach="background" args={[MOODS[p.mood].bg]} />
      <fog attach="fog" args={[MOODS[p.mood].bg, room.rooms ? 45 : 9, room.rooms ? 110 : 22]} />
      {/* PCSS: shadows sharp where an object meets a surface, softer as they fall further away */}
      {p.tier === 2 && <SoftShadows size={22} samples={8} focus={0.45} />}
      <ViewLayers />
      <Materials />
      <Kick deps={[room, p.scheme, p.mood, p.tier, lightsOn]} />
      <ShadowScheduler deps={[room, p.mood, p.tier, lightsOn, openKey, !!p.photo]} />
      <RoomLights room={room} on={lightsOn} tier={p.tier} homeRoom={p.homeRoom} walking={walking} all={!!p.photo} />
      <WindowLights room={room} mood={p.mood} tier={p.tier} homeRoom={p.homeRoom} walking={walking} all={!!p.photo} />
      {shadows && <RoomReflections room={room} homeRoom={p.homeRoom} size={p.tier === 2 ? 256 : 128} deps={[p.scheme, p.mood, lightsOn, openKey]} />}
      {!p.photo && <PerformanceMonitor onDecline={() => setDprCap((d) => Math.max(1, d - 0.25))} />}
      <Lighting mood={p.mood} shadows={shadows} shadowMapSize={p.tier === 2 ? (room.rooms ? 4096 : 2048) : room.rooms ? 2048 : 1024} span={room.bounds.width * MM} />
      {/* the garden streams in on its own, without holding up the house */}
      <Suspense fallback={null}>{walking && p.tier >= 1 && <Skydome center={[0, (room.bounds.depth * MM) / 2]} mood={p.mood} />}</Suspense>
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
          <RoomProps props={room.props} real={p.tier >= 1} />
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
      {p.tier === 2 ? (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          {/* contact shadows in corners and under furniture */}
          <N8AO aoRadius={0.5} distanceFalloff={0.8} intensity={2.4} quality={p.photo ? "ultra" : "performance"} halfRes={!p.photo} />
          {/* bright windows and lamps bloom a little, as they do through a lens */}
          <Bloom luminanceThreshold={0.88} luminanceSmoothing={0.15} intensity={0.32} mipmapBlur />
          {/* Khronos PBR Neutral: finishes keep their true colour; only the brightest highlights are compressed */}
          <ToneMapping mode={ToneMappingMode.NEUTRAL} />
          <SMAA />
          {/* a lens's gentle falloff and fine sensor grain */}
          <Vignette offset={0.3} darkness={0.32} />
          <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.1} />
        </EffectComposer>
      ) : null}
    </Canvas>
  );
}
