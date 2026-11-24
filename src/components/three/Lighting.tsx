"use client";
import * as THREE from "three";
import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import type { Mood } from "@/lib/studio/scheme";

/**
 * Image-based lighting built from softboxes rendered into a cube map on the GPU
 * (no external HDRI download). Each mood changes the softbox colour temperature,
 * the key light angle and the overall exposure; transitions are smoothed per frame.
 */
export const MOODS: Record<Mood, { label: string; key: string; fill: string; keyIntensity: number; env: number; sun: [number, number, number]; bg: string; exposure: number }> = {
  gallery: { label: "Gallery", key: "#ffffff", fill: "#f6f6f4", keyIntensity: 3, env: 1.05, sun: [2.2, 4.6, 4.2], bg: "#0e0e0d", exposure: 1.18 },
  morning: { label: "Morning daylight", key: "#f2f6ff", fill: "#e8eef7", keyIntensity: 3.6, env: 1.1, sun: [4, 3.6, 3.2], bg: "#121417", exposure: 1.2 },
  golden: { label: "Golden hour", key: "#ffd09a", fill: "#ffe4c6", keyIntensity: 3.6, env: 0.85, sun: [5, 2.2, 3], bg: "#15100b", exposure: 1.1 },
  evening: { label: "Evening 2700K", key: "#ffbd7a", fill: "#ffdab0", keyIntensity: 1.6, env: 0.55, sun: [0.5, 2.6, 2.5], bg: "#0b0907", exposure: 1 },
};

/**
 * `span` is the width of the space in metres. A whole home (~22m) needs the key light
 * pushed further out with a wider shadow camera, plus more ambient fill so rooms away
 * from the key light don't fall into darkness.
 */
export function Lighting({ mood, shadows, shadowMapSize = 2048, span = 6 }: { mood: Mood; shadows: boolean; shadowMapSize?: number; span?: number }) {
  const m = MOODS[mood];
  const wide = span > 10;
  const reach = wide ? 2.4 : 1;
  const sunPos: [number, number, number] = [m.sun[0] * reach, m.sun[1] * reach, m.sun[2] * reach];
  const half = wide ? span / 2 + 1.5 : 5;
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const { scene, gl, invalidate } = useThree();
  const target = useRef(new THREE.Vector3());
  const color = useRef(new THREE.Color());

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 4);
    let moving = false;
    if (sun.current) {
      target.current.set(...sunPos);
      if (sun.current.position.distanceTo(target.current) > 0.01) moving = true;
      sun.current.position.lerp(target.current, k);
      color.current.set(m.key);
      sun.current.color.lerp(color.current, k);
      sun.current.intensity += (m.keyIntensity * (wide ? 1.15 : 1) - sun.current.intensity) * k;
    }
    const s = scene as THREE.Scene & { environmentIntensity?: number };
    if (s.environmentIntensity !== undefined) {
      const env = m.env * (wide ? 1.35 : 1);
      if (Math.abs(s.environmentIntensity - env) > 0.005) moving = true;
      s.environmentIntensity += (env - s.environmentIntensity) * k;
    }
    gl.toneMappingExposure += (m.exposure - gl.toneMappingExposure) * k;
    if (moving) invalidate();
  });

  return (
    <>
      <Environment key={mood} resolution={256} frames={1} background={false}>
        <color attach="background" args={[m.bg]} />
        {/* overhead gallery softbox */}
        <Lightformer form="rect" intensity={2.4} color={m.fill} position={[0, 5, 2]} rotation={[Math.PI / 2, 0, 0]} scale={[8, 3, 1]} />
        {/* side softboxes give doors their long reflections */}
        <Lightformer form="rect" intensity={1.6} color={m.key} position={[-6, 2, 3]} rotation={[0, Math.PI / 2, 0]} scale={[6, 2.2, 1]} />
        <Lightformer form="rect" intensity={1.2} color={m.fill} position={[6, 2, 3]} rotation={[0, -Math.PI / 2, 0]} scale={[6, 2.2, 1]} />
        {/* front fill */}
        <Lightformer form="rect" intensity={0.8} color={m.fill} position={[0, 1.6, 9]} scale={[10, 2, 1]} />
        {/* thin strip light for crisp clearcoat highlights */}
        <Lightformer form="rect" intensity={4} color="#ffffff" position={[0, 3.2, 6]} rotation={[-Math.PI / 4, 0, 0]} scale={[6, 0.15, 1]} />
      </Environment>
      <hemisphereLight ref={hemi} args={[m.fill, "#3a3631", wide ? 0.55 : 0.18]} />
      {wide && <ambientLight intensity={0.35} color={m.fill} />}
      <directionalLight
        ref={sun}
        position={sunPos}
        intensity={m.keyIntensity}
        color={m.key}
        castShadow={shadows}
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-half}
        shadow-camera-right={half}
        shadow-camera-top={wide ? 9 : 5}
        shadow-camera-bottom={wide ? -9 : -5}
        shadow-camera-near={0.5}
        shadow-camera-far={wide ? 60 : 20}
      />
    </>
  );
}
