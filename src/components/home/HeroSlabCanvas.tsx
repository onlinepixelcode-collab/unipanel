"use client";
import * as THREE from "three";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, ContactShadows } from "@react-three/drei";
import { cloneFinishMaterial, configureMaterials } from "@/components/three/materials";
import { panelGeometry } from "@/components/three/RoomMeshes";
import type { Panel } from "@/lib/studio/layout";

import { HERO_SEQUENCE } from "./heroSequence";
export { HERO_SEQUENCE };

const W = 600, H = 1100, D = 18; // a real door, in mm
const S = 0.001;

function Softbox() {
  // a softbox that drifts across the gallery ceiling, so reflections move over gloss and metal
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.x = Math.sin(clock.elapsedTime * 0.25) * 3;
  });
  return (
    <group ref={ref}>
      <Lightformer form="rect" intensity={3.2} color="#fffaf2" position={[0, 2.2, 2.4]} rotation={[-Math.PI / 3.2, 0, 0]} scale={[1.6, 3, 1]} />
    </group>
  );
}

function Slab({ progress }: { progress: RefObject<number> }) {
  const { gl, invalidate, size } = useThree();
  const offsetX = size.width / size.height > 1.15 ? 0.42 : 0;
  const group = useRef<THREE.Group>(null);
  const laser = useRef<THREE.Mesh>(null);
  const panel: Panel = useMemo(() => ({ key: "hero", zone: "baseDoors", size: [W, H, D], pos: [0, H / 2, 0], rotY: 0, uvX: 0, mirror: false, order: 0 }), []);
  const geom = useMemo(() => panelGeometry(panel), [panel]);
  const planeA = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), []);
  const planeB = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const mats = useMemo(() => {
    configureMaterials({ maxAnisotropy: Math.min(8, gl.capabilities.getMaxAnisotropy()), invalidate });
    return HERO_SEQUENCE.map((id) => {
      const a = cloneFinishMaterial(id);
      a.clippingPlanes = [planeA];
      const b = cloneFinishMaterial(id);
      b.clippingPlanes = [planeB];
      return { a, b };
    });
  }, [gl, invalidate, planeA, planeB]);
  const meshA = useRef<THREE.Mesh>(null);
  const meshB = useRef<THREE.Mesh>(null);

  useEffect(() => {
    gl.localClippingEnabled = true;
    return () => {
      geom.dispose();
      mats.forEach((m) => (m.a.dispose(), m.b.dispose()));
    };
  }, [gl, geom, mats]);

  useFrame(({ clock }) => {
    const p = progress.current ?? 0;
    const seg = Math.min(HERO_SEQUENCE.length - 1 - 1e-4, p * (HERO_SEQUENCE.length - 1));
    const i = Math.floor(seg);
    const local = seg - i;
    // hold each finish, then wipe in the last 45% of the segment
    const f = THREE.MathUtils.smoothstep(local, 0.55, 1);
    // world-space wipe line: slab spans y -0.55 → +0.55
    const half = (H * S) / 2;
    const h = half + 0.02 - f * (H * S + 0.04);
    planeA.constant = h; // current finish keeps y <= h
    planeB.constant = -h; // next finish takes y >= h, descending from the top
    if (meshA.current) meshA.current.material = mats[i].a;
    if (meshB.current) meshB.current.material = mats[Math.min(i + 1, mats.length - 1)].b;

    if (laser.current) {
      laser.current.position.y = h + 0.55;
      (laser.current.material as THREE.MeshBasicMaterial).opacity = f > 0.001 && f < 0.999 ? 1 : 0;
    }
    if (group.current) {
      const t = clock.elapsedTime;
      group.current.rotation.y = -0.55 + p * Math.PI * 1.1 + Math.sin(t * 0.4) * 0.04;
      group.current.rotation.x = Math.sin(t * 0.3) * 0.02;
      group.current.position.y = Math.sin(t * 0.6) * 0.015;
      group.current.position.x = offsetX;
    }
  });

  return (
    <group ref={group}>
      <group position={[0, -0.55, 0]}>
        <mesh ref={meshA} geometry={geom} position={[0, H * S * 0.5, 0]} castShadow material={mats[0].a} />
        <mesh ref={meshB} geometry={geom} position={[0, H * S * 0.5, 0]} castShadow material={mats[1].b} />
        <mesh ref={laser} position={[0, 0, 0]}>
          <boxGeometry args={[W * S + 0.03, 0.0025, D * S + 0.012]} />
          <meshBasicMaterial color="#ffe2b0" transparent toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/** Pull the camera back on portrait screens so the slab sits behind the headline, not over it. */
function FitCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const a = size.width / size.height;
    camera.position.z = a < 1 ? Math.min(6, 3.1 / a * 0.62) : 3.1;
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

export default function HeroSlabCanvas({ progress, high, active = true }: { progress: RefObject<number>; high: boolean; active?: boolean }) {
  return (
    <Canvas frameloop={active ? "always" : "never"} dpr={[1, high ? 2 : 1.5]} camera={{ fov: 30, position: [0, 0.05, 3.1] }} gl={{ alpha: false, antialias: true, toneMapping: THREE.NeutralToneMapping }} shadows>
      <color attach="background" args={["#0d0d0c"]} />
      <Environment resolution={128} frames={high ? Infinity : 1}>
        <Lightformer form="rect" intensity={1.2} color="#f4efe7" position={[-3, 1, 1]} rotation={[0, Math.PI / 2, 0]} scale={[4, 2, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#f4efe7" position={[3, 0.5, 1]} rotation={[0, -Math.PI / 2, 0]} scale={[4, 2, 1]} />
        <Lightformer form="rect" intensity={5} color="#ffffff" position={[0, 0.2, 4]} scale={[3, 0.08, 1]} />
        <Softbox />
      </Environment>
      <spotLight position={[1.5, 3, 2.5]} angle={0.5} penumbra={1} intensity={30} castShadow color="#fff6ea" />
      <FitCamera />
      <Slab progress={progress} />
      <ContactShadows position={[0, -0.58, 0]} scale={3} blur={2.6} opacity={0.55} far={1.2} frames={1} />
    </Canvas>
  );
}
