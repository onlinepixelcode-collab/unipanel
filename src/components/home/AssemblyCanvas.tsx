"use client";
import * as THREE from "three";
import { useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { buildRoom } from "@/lib/studio/layout";
import { DEFAULT_SCHEME, type Scheme } from "@/lib/studio/scheme";
import { RoomMeshes } from "@/components/three/RoomMeshes";
import { Lighting } from "@/components/three/Lighting";
import { configureMaterials, getStagingMaterial } from "@/components/three/materials";

const SCHEME: Scheme = {
  ...DEFAULT_SCHEME,
  layout: "island",
  zones: { ...DEFAULT_SCHEME.zones, baseDoors: "verde-salvia", wallDoors: "kashmir", tallUnits: "kashmir", islandFronts: "woodline-02", islandEnds: "calacatta-bianco", splashback: "calacatta-bianco", cladding: "savoia-perla-real-stone", kickplate: "verde-salvia", shelving: "woodline-02", gables: "kashmir" },
};

function Rig({ progress }: { progress: RefObject<number> }) {
  const { camera } = useThree();
  const look = useMemo(() => new THREE.Vector3(0.6, 1.0, 1.2), []);
  useFrame(() => {
    const p = progress.current ?? 1;
    // slow arc while the kitchen assembles
    const a = -0.55 + p * 0.5;
    const r = 10.5 - p * 1.2;
    camera.position.set(Math.sin(a) * r, 3.4 - p * 0.9, 1.2 + Math.cos(a) * r);
    camera.lookAt(look);
  });
  return null;
}

function Setup() {
  const { gl, invalidate } = useThree();
  useMemo(() => configureMaterials({ maxAnisotropy: Math.min(8, gl.capabilities.getMaxAnisotropy()), invalidate }), [gl, invalidate]);
  return null;
}

/** Signals the parent after the first frames, so the poster can fade out. */
function Ready({ onReady }: { onReady?: () => void }) {
  const n = useRef(0);
  useFrame(() => {
    if (++n.current === 3) onReady?.();
  });
  return null;
}

export default function AssemblyCanvas({ progress, high, onReady, active = true }: { progress: RefObject<number>; high: boolean; onReady?: () => void; active?: boolean }) {
  const room = useMemo(() => {
    const r = buildRoom(SCHEME);
    return { ...r, panels: r.panels.filter((p) => p.staging !== "bulkhead") };
  }, []);
  const floor = getStagingMaterial("floor-assembly", "#1b1a18", { roughness: 0.9 });
  return (
    <Canvas frameloop={active ? "always" : "never"} dpr={[1, high ? 1.5 : 1.15]} camera={{ fov: 32, near: 0.1, far: 40 }} gl={{ alpha: false, antialias: true, toneMapping: THREE.NeutralToneMapping }} shadows={high}>
      <color attach="background" args={["#0f0f0e"]} />
      <fog attach="fog" args={["#0f0f0e", 9, 18]} />
      <Setup />
      <Lighting mood="gallery" shadows={high} shadowMapSize={1024} />
      <RoomMeshes room={room} scheme={SCHEME} quality="low" progress={progress} shadows={high} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 2]} material={floor} receiveShadow>
        <planeGeometry args={[30, 30]} />
      </mesh>
      {!high && <ContactShadows position={[0, 0.002, 1.5]} scale={10} blur={2} opacity={0.6} far={3} />}
      <Rig progress={progress} />
      <Ready onReady={onReady} />
    </Canvas>
  );
}
