"use client";
import * as THREE from "three";
import { useEffect, useRef } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { WebGLPathTracer } from "three-gpu-pathtracer";
import { asset } from "@/lib/asset";

let tracer: WebGLPathTracer | null = null;

/**
 * Photo mode: hands the current view to a GPU path tracer, which traces real light
 * (sun and garden through the glass, light bouncing between walls and floor, soft
 * contact shadows, true reflections) and refines the image sample by sample. Moving the
 * camera restarts it from the new view. Mounted only while active: its render loop
 * takes over from the normal renderer.
 */
export function PhotoRender({ target = 250, envScale = 1, exposure = 2.1, onProgress }: { target?: number; envScale?: number; exposure?: number; onProgress?: (p: number, label: string) => void }) {
  const { gl, scene, camera, invalidate } = useThree();
  const hdr = useLoader(HDRLoader, asset("/hdri/pretoria_gardens_2k.hdr"));
  const ready = useRef(false);
  const last = useRef(new THREE.Matrix4());

  useEffect(() => {
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    const s = scene as THREE.Scene & { environmentIntensity: number; backgroundIntensity: number };
    const prev = { env: s.environment, bg: s.background, fog: s.fog, ei: s.environmentIntensity, bi: s.backgroundIntensity, exp: gl.toneMappingExposure };
    s.environment = hdr;
    s.background = hdr;
    s.environmentIntensity = envScale;
    s.backgroundIntensity = envScale;
    s.fog = null;
    // hide what only exists to fake light in real time: the reflective floor copy, window glow lights, the sky sphere
    const hidden: THREE.Object3D[] = [];
    s.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && o.layers.mask === 4 && o.visible) hidden.push(o);
      if (o.userData.noPath && o.visible) hidden.push(o);
    });
    hidden.forEach((o) => (o.visible = false));
    // the plain floor kept for the reflection probe (layer 1) is the floor the path tracer should see
    const relayered: THREE.Object3D[] = [];
    s.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && o.layers.mask === 2) {
        o.layers.enable(0);
        relayered.push(o);
      }
    });

    tracer ??= new WebGLPathTracer(gl);
    const p = tracer;
    p.bounces = 4;
    p.transmissiveBounces = 3;
    p.filterGlossyFactor = 0.5;
    p.multipleImportanceSampling = true;
    p.minSamples = 1;
    p.dynamicLowRes = true;
    p.lowResScale = 0.25;
    p.renderScale = Math.min(0.75, 1.1 / Math.max(1, gl.getPixelRatio()));
    p.tiles.set(1, 1);
    ready.current = false;
    onProgress?.(0, "Preparing the scene for photo rendering…");
    let cancelled = false;
    // let the overlay paint before the (blocking) scene build
    const t = setTimeout(() => {
      if (cancelled) return;
      try {
        p.setScene(scene, camera);
      } catch (e) {
        console.error(e);
        onProgress?.(0, "Photo rendering isn't available on this device.");
        return;
      }
      last.current.copy(camera.matrixWorld);
      ready.current = true;
      invalidate();
    }, 60);
    return () => {
      cancelled = true;
      clearTimeout(t);
      ready.current = false;
      s.environment = prev.env;
      s.background = prev.bg;
      s.fog = prev.fog;
      s.environmentIntensity = prev.ei;
      s.backgroundIntensity = prev.bi;
      gl.toneMappingExposure = prev.exp;
      hidden.forEach((o) => (o.visible = true));
      relayered.forEach((o) => o.layers.disable(0));
      invalidate();
    };
  }, [gl, scene, camera, hdr, envScale, invalidate]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(() => {
    const p = tracer;
    if (!p || !ready.current) return;
    // photographic exposure for an interior lit by daylight through the windows (the live view's own exposure is restored after)
    gl.toneMappingExposure = exposure;
    if (!camera.matrixWorld.equals(last.current)) {
      last.current.copy(camera.matrixWorld);
      p.updateCamera();
    }
    p.renderSample();
    const k = Math.min(1, p.samples / target);
    onProgress?.(k, k < 1 ? "Rendering photo" : "Photo ready");
    if (k < 1) invalidate();
  }, 1);

  return null;
}
