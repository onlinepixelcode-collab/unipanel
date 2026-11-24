"use client";
import * as THREE from "three";
import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import type { Mood } from "@/lib/studio/scheme";
import { bumpShadows } from "./shadowState";

/**
 * Image-based lighting built from softboxes rendered into a cube map on the GPU
 * (no external HDRI download). Each mood changes the softbox colour temperature,
 * the key light angle and the overall exposure; transitions are smoothed per frame.
 */
export const MOODS: Record<Mood, { label: string; key: string; fill: string; keyIntensity: number; env: number; hemi: number; amb: number; sun: [number, number, number]; bg: string; exposure: number; night?: boolean }> = {
  gallery: { label: "Gallery", key: "#ffffff", fill: "#f6f6f4", keyIntensity: 2.6, env: 1.05, hemi: 0.18, amb: 1.85, sun: [2.2, 4.6, 4.2], bg: "#0e0e0d", exposure: 1.05 },
  // daylight: a stronger, lower sun with less fill so cast shadows read clearly
  // white light and a neutral exposure, so finishes read at their true colour
  morning: { label: "Daylight", key: "#fffaf3", fill: "#f7f8fa", keyIntensity: 2.6, env: 1.0, hemi: 0.3, amb: 1.85, sun: [6.2, 3.6, 1.1], bg: "#121417", exposure: 1 },
  golden: { label: "Golden hour", key: "#ffc180", fill: "#ffe4c6", keyIntensity: 3.0, env: 0.8, hemi: 0.24, amb: 1.2, sun: [6.4, 2.1, 0.9], bg: "#15100b", exposure: 1 },
  evening: { label: "Evening 2700K", key: "#ffbd7a", fill: "#ffdab0", keyIntensity: 1.2, env: 0.4, hemi: 0.12, amb: 0.3, sun: [0.5, 2.6, 2.5], bg: "#0b0907", exposure: 1 },
  // night: faint blue moonlight through the window; the room's own lights do the work
  night: { label: "Night", key: "#8ea6d0", fill: "#5d6b85", keyIntensity: 0.28, env: 0.07, hemi: 0.04, amb: 0.02, sun: [5, 3.2, 1.6], bg: "#05070a", exposure: 1.05, night: true },
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
  // in the whole home the sun comes from the kitchen and bedroom side, so those rooms get the
  // sun patches and the entrance and lounge are lit softly instead of being glared out
  const sunPos: [number, number, number] = [m.sun[0] * reach * (wide ? -1 : 1), m.sun[1] * reach, m.sun[2] * reach];
  const half = wide ? span / 2 + 1.5 : 5;
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const amb = useRef<THREE.AmbientLight>(null);
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
      sun.current.intensity += (m.keyIntensity * (wide ? 0.95 : 1) - sun.current.intensity) * k;
    }
    const s = scene as THREE.Scene & { environmentIntensity?: number };
    if (s.environmentIntensity !== undefined) {
      // inside a whole house, light should come through windows, not from an all-round studio
      const env = m.env * (wide ? 0.38 : 1);
      if (Math.abs(s.environmentIntensity - env) > 0.005) moving = true;
      s.environmentIntensity += (env - s.environmentIntensity) * k;
    }
    if (hemi.current) {
      const hTarget = wide ? m.hemi * 1.7 : m.hemi;
      if (Math.abs(hemi.current.intensity - hTarget) > 0.002) moving = true;
      hemi.current.intensity += (hTarget - hemi.current.intensity) * k;
    }
    if (amb.current) {
      if (Math.abs(amb.current.intensity - m.amb) > 0.002) moving = true;
      amb.current.intensity += (m.amb - amb.current.intensity) * k;
      color.current.set(m.fill);
      amb.current.color.lerp(color.current, k);
    }
    gl.toneMappingExposure += (m.exposure - gl.toneMappingExposure) * k;
    if (moving) {
      bumpShadows(2);
      invalidate();
    }
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
      {/* sky from above, warm light bouncing off the floor from below */}
      <hemisphereLight ref={hemi} args={[m.fill, "#8d8780", wide ? m.hemi * 1.7 : m.hemi]} />
      {/* light bounced around the rooms: without it, fronts facing away from a window go far too dark */}
      {wide && <ambientLight ref={amb} intensity={m.amb} color={m.fill} />}
      <directionalLight
        ref={sun}
        position={sunPos}
        intensity={m.keyIntensity}
        color={m.key}
        castShadow={shadows}
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
        shadow-bias={wide ? -0.0015 : -0.0004}
        shadow-normalBias={wide ? 0.06 : 0.02}
        shadow-camera-left={-half}
        shadow-camera-right={half}
        shadow-camera-top={wide ? 9 : 5}
        shadow-camera-bottom={wide ? -9 : -5}
        shadow-camera-near={0.5}
        shadow-camera-far={wide ? 40 : 20}
      />
    </>
  );
}
