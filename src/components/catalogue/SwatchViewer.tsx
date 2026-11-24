"use client";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls, ContactShadows } from "@react-three/drei";
import { getFinishMaterial, configureMaterials } from "@/components/three/materials";
import { panelGeometry } from "@/components/three/RoomMeshes";
import type { Panel } from "@/lib/studio/layout";

/** A real-size sample (450 × 700 × 18mm) you can turn; a raking light follows the pointer to show relief. */
function Sample({ id, grain }: { id: string; grain: "v" | "h" }) {
  const { gl, invalidate } = useThree();
  useMemo(() => configureMaterials({ maxAnisotropy: Math.min(8, gl.capabilities.getMaxAnisotropy()), invalidate }), [gl, invalidate]);
  const panel: Panel = useMemo(() => ({ key: "s", zone: "baseDoors", size: [450, 700, 18], pos: [0, 350, 0], rotY: 0, uvX: 0, mirror: false, order: 0 }), []);
  const geom = useMemo(() => panelGeometry(panel), [panel]);
  useEffect(() => () => geom.dispose(), [geom]);
  const mat = getFinishMaterial(id, grain, "high");
  return <mesh geometry={geom} material={mat} position={[0, 0.35, 0]} castShadow />;
}

function RakeLight() {
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ pointer }) => {
    if (!light.current) return;
    light.current.position.x += (pointer.x * 0.9 - light.current.position.x) * 0.1;
    light.current.position.y += (pointer.y * 0.6 + 0.1 - light.current.position.y) * 0.1;
  });
  return <pointLight ref={light} position={[0.5, 0.2, 0.35]} intensity={1.6} distance={2.5} color="#fff4e6" />;
}

export default function SwatchViewer({ id, grain = "v" }: { id: string; grain?: "v" | "h" }) {
  return (
    <Canvas dpr={[1, 2]} camera={{ fov: 28, position: [0.35, 0.05, 1.7] }} gl={{ alpha: false, antialias: true, toneMapping: THREE.NeutralToneMapping }} shadows>
      <color attach="background" args={["#0e0e0d"]} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={1.4} color="#f5f0e8" position={[-2, 1, 1.5]} rotation={[0, Math.PI / 3, 0]} scale={[3, 2, 1]} />
        <Lightformer form="rect" intensity={1} color="#f5f0e8" position={[2, 0.5, 1.5]} rotation={[0, -Math.PI / 3, 0]} scale={[3, 2, 1]} />
        <Lightformer form="rect" intensity={4} color="#ffffff" position={[0, 0.6, 3]} scale={[2.5, 0.06, 1]} />
      </Environment>
      <RakeLight />
      <group position={[0, -0.35, 0]}>
        <Sample id={id} grain={grain} />
      </group>
      <ContactShadows position={[0, -0.36, 0]} scale={2} blur={2.5} opacity={0.5} far={0.8} frames={1} />
      <OrbitControls enablePan={false} minDistance={0.45} maxDistance={2.4} minPolarAngle={0.6} maxPolarAngle={Math.PI / 1.8} enableDamping autoRotate autoRotateSpeed={0.4} />
    </Canvas>
  );
}
