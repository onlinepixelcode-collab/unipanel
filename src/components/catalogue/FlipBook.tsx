"use client";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { asset } from "@/lib/asset";
import { CATALOGUE_PAGES } from "@/data/catalogue-book";
import { configureMaterials, getFinishMaterial } from "@/components/three/materials";
import { panelGeometry } from "@/components/three/RoomMeshes";
import type { Panel } from "@/lib/studio/layout";

/** Page size in metres (A4 landscape scaled up so it reads on screen). */
const PW = 0.42;
const PH = 0.297;
const SHEETS = Math.ceil(CATALOGUE_PAGES / 2);
const pageUrl = (n: number) => asset(`/catalogue/pages/p-${String(n).padStart(2, "0")}.jpg`);

const loader = typeof window !== "undefined" ? new THREE.TextureLoader() : null;
const texCache = new Map<number, THREE.Texture>();
function pageTex(n: number, invalidate: () => void, mirror = false) {
  const key = mirror ? -n : n;
  const hit = texCache.get(key);
  if (hit) return hit;
  const t = loader!.load(pageUrl(n), () => invalidate());
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16; // clamped to the GPU maximum; keeps small type sharp at an angle
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  if (mirror) {
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.x = -1;
    t.offset.x = 1;
  }
  texCache.set(key, t);
  return t;
}

const flatMats = new Map<number, THREE.MeshStandardMaterial>(); // stored as Basic (unlit) materials
function flatMat(n: number, invalidate: () => void) {
  let m = flatMats.get(n);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ map: pageTex(n, invalidate), toneMapped: false }) as unknown as THREE.MeshStandardMaterial;
    flatMats.set(n, m);
  }
  return m;
}

/** A sheet that turns around the spine with a soft paper curl. */
function TurningSheet({ front, back, progress, rigid = false }: { front: number; back: number; progress: React.RefObject<number>; rigid?: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(PW, PH, 32, 1);
    g.rotateX(-Math.PI / 2);
    g.translate(PW / 2, 0, 0); // spine at x = 0
    return g;
  }, []);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array as Float32Array), [geo]);
  const frontMat = useMemo(() => new THREE.MeshLambertMaterial({ map: front ? pageTex(front, invalidate) : null, side: THREE.FrontSide, emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0.25, emissiveMap: front ? pageTex(front, invalidate) : null }), [front, invalidate]);
  const backMat = useMemo(() => new THREE.MeshLambertMaterial({ map: back ? pageTex(back, invalidate, true) : null, side: THREE.BackSide, emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0.25, emissiveMap: back ? pageTex(back, invalidate, true) : null }), [back, invalidate]);
  useEffect(() => () => (geo.dispose(), frontMat.dispose(), backMat.dispose()), [geo, frontMat, backMat]);

  useFrame(() => {
    const p = progress.current ?? 0;
    const angle = p * Math.PI; // 0 = lying right, π = lying left
    const curl = rigid ? 0 : Math.sin(p * Math.PI) * 0.35; // hard covers swing flat, paper curls
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const z = base[i * 3 + 2];
      const u = x / PW; // 0 at spine → 1 at the edge
      // bend: the free edge lags behind the spine, like real paper
      const a = angle - curl * u * u * (p < 0.5 ? 1 : -1) * 0.6;
      pos.setXYZ(i, Math.cos(a) * x, Math.sin(a) * x * 0.98 + 0.002, z);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  });

  return (
    <group>
      <mesh geometry={geo} material={frontMat} castShadow />
      <mesh geometry={geo} material={backMat} castShadow />
    </group>
  );
}

function Book({ spread, dir, onDone }: { spread: number; dir: 1 | -1 | 0; onDone: () => void }) {
  const invalidate = useThree((s) => s.invalidate);
  const slide = useRef<THREE.Group>(null);
  // closed (cover only) sits centred; open spreads centre on the spine
  useFrame((_, dt) => {
    if (!slide.current) return;
    const target = spread === 0 && dir === 0 ? -PW / 2 : spread >= SHEETS && dir === 0 ? PW / 2 : 0;
    const x = slide.current.position.x;
    if (Math.abs(target - x) > 0.0005) {
      slide.current.position.x += (target - x) * Math.min(1, dt * 5);
      invalidate();
    }
  });
  const progress = useRef(0);
  const turning = dir !== 0;
  // sheet k: front = page 2k+1, back = page 2k+2
  const leftPage = spread > 0 ? Math.min(2 * spread, CATALOGUE_PAGES) : 0;
  const rightPage = spread < SHEETS ? 2 * spread + 1 : 0;
  const sheet = dir === 1 ? spread : dir === -1 ? spread - 1 : -1;

  const finished = useRef(false);
  useEffect(() => {
    progress.current = dir === 1 ? 0 : 1;
    finished.current = false;
  }, [dir, spread]);

  useFrame((_, dt) => {
    if (!turning || finished.current) return;
    const speed = 1.6;
    progress.current += (dir === 1 ? 1 : -1) * dt * speed;
    if ((dir === 1 && progress.current >= 1) || (dir === -1 && progress.current <= 0)) {
      progress.current = dir === 1 ? 1 : 0;
      finished.current = true; // report once, even if more frames render before React updates
      onDone();
    }
    invalidate();
  });

  // while turning forward, the right side already shows the page under the turning sheet
  const showLeft = dir === 1 ? leftPage : dir === -1 ? (spread - 1 > 0 ? 2 * (spread - 1) : 0) : leftPage;
  const showRight = dir === 1 ? (spread + 1 < SHEETS ? 2 * (spread + 1) + 1 : 0) : rightPage;

  const flat = (n: number, side: "l" | "r") => {
    if (!n) return null;
    const mat = flatMat(n, invalidate);
    return (
      <mesh position={[side === "l" ? -PW / 2 : PW / 2, 0.0015, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat} receiveShadow>
        <planeGeometry args={[PW, PH]} />
      </mesh>
    );
  };
  const leftCount = Math.max(0, dir === -1 ? spread - 1 : spread);
  const rightCount = Math.max(0, SHEETS - spread - (dir === 1 ? 1 : 0));
  const paper = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f3efe8", roughness: 0.9 }), []);
  const coverMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#121211", roughness: 0.6 }), []);

  return (
    <group ref={slide} position={[-PW / 2, 0.011, 0]}>
      {/* page blocks on each side: thickness follows how many sheets lie there */}
      {leftCount > 0 && (
        <mesh position={[-PW / 2, -0.0008 - leftCount * 0.00025, 0]} material={paper} castShadow>
          <boxGeometry args={[PW, leftCount * 0.0005 + 0.0005, PH]} />
        </mesh>
      )}
      {rightCount > 0 && (
        <mesh position={[PW / 2, -0.0008 - rightCount * 0.00025, 0]} material={paper} castShadow>
          <boxGeometry args={[PW, rightCount * 0.0005 + 0.0005, PH]} />
        </mesh>
      )}
      {/* hard cover under the pages */}
      <mesh position={[spread === 0 && !turning ? PW / 2 + 0.003 : 0, -0.0095, 0]} material={coverMat} castShadow receiveShadow>
        <boxGeometry args={[spread === 0 && !turning ? PW + 0.012 : PW * 2 + 0.016, 0.005, PH + 0.014]} />
      </mesh>
      {flat(showLeft, "l")}
      {flat(showRight, "r")}
      {turning && sheet >= 0 && <TurningSheet key={`${sheet}${dir}`} front={2 * sheet + 1} back={2 * sheet + 2 <= CATALOGUE_PAGES ? 2 * sheet + 2 : 0} progress={progress} rigid={sheet === 0 || sheet === SHEETS - 1} />}
    </group>
  );
}

/** A dark Firestone marble counter, top-down, with a few on-brand props. */
function Counter({ onSample }: { onSample?: (id: string) => void }) {
  const { gl, invalidate } = useThree();
  useMemo(() => configureMaterials({ maxAnisotropy: Math.min(8, gl.capabilities.getMaxAnisotropy()), invalidate }), [gl, invalidate]);
  const top: Panel = useMemo(() => ({ key: "top", zone: "splashback", size: [3400, 40, 2200], pos: [0, -20, 0], rotY: 0, uvX: 0, mirror: false, order: 0 }), []);
  const g = useMemo(() => panelGeometry(top), [top]);
  useEffect(() => () => g.dispose(), [g]);
  const SAMPLES = ["calacatta-bianco", "nogal-rosales-02", "champagne-metal", "verde-salvia", "satin-kashmir-glass"];
  const chip: Panel = useMemo(() => ({ key: "chip", zone: "baseDoors", size: [110, 12, 170], pos: [0, 6, 0], rotY: 0, uvX: 0, mirror: false, order: 0 }), []);
  const gc = useMemo(() => panelGeometry(chip), [chip]);
  useEffect(() => () => gc.dispose(), [gc]);
  const [hover, setHover] = useState<string | null>(null);
  useEffect(() => {
    document.body.style.cursor = hover ? "pointer" : "";
    return () => void (document.body.style.cursor = "");
  }, [hover]);
  const ceramic = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#efebe4", roughness: 0.35, clearcoat: 0.6 }), []);
  const coffee = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3b2416", roughness: 0.2 }), []);
  const brass = useMemo(() => new THREE.MeshStandardMaterial({ color: "#e4c020", metalness: 1, roughness: 0.3 }), []);
  return (
    <group>
      <mesh geometry={g} material={getFinishMaterial("firestone", "h")} position={[0, -0.02, 0]} receiveShadow />
      {/* espresso on a saucer */}
      <group position={[0.62, 0, -0.2]}>
        <mesh position={[0, 0.004, 0]} material={ceramic} castShadow receiveShadow>
          <cylinderGeometry args={[0.075, 0.07, 0.008, 48]} />
        </mesh>
        <mesh position={[0, 0.038, 0]} material={ceramic} castShadow>
          <cylinderGeometry args={[0.04, 0.032, 0.06, 48, 1, true]} />
        </mesh>
        <mesh position={[0, 0.062, 0]} rotation={[-Math.PI / 2, 0, 0]} material={coffee}>
          <circleGeometry args={[0.038, 32]} />
        </mesh>
        <mesh position={[0.05, 0.04, 0]} rotation={[0, 0, Math.PI / 2]} material={ceramic} castShadow>
          <torusGeometry args={[0.014, 0.004, 12, 24]} />
        </mesh>
      </group>
      {/* brass pen */}
      <mesh position={[-0.6, 0.006, 0.16]} rotation={[0, 0.5, Math.PI / 2]} material={brass} castShadow>
        <cylinderGeometry args={[0.005, 0.005, 0.15, 16]} />
      </mesh>
      {/* ceramic vase */}
      <mesh position={[-0.62, 0.07, -0.22]} material={ceramic} castShadow>
        <cylinderGeometry args={[0.04, 0.055, 0.14, 40]} />
      </mesh>
      {/* a fan of real board samples, each opens its finish page */}
      <group position={[0.56, 0, 0.2]}>
        {SAMPLES.map((id, i) => (
          <mesh
            key={id}
            geometry={gc}
            material={getFinishMaterial(id)}
            position={[i * 0.012, 0.004 + i * 0.013 + (hover === id ? 0.01 : 0), i * 0.006]}
            rotation={[0, -0.5 + i * 0.22, 0]}
            castShadow
            receiveShadow
            onPointerOver={(e) => (e.stopPropagation(), setHover(id))}
            onPointerOut={() => setHover(null)}
            onClick={(e) => (e.stopPropagation(), onSample?.(id))}
          />
        ))}
      </group>
    </group>
  );
}

/** One soft overhead spotlight makes a pool of light on the counter, the rest falls into shadow. */
function Lights() {
  const spot = useRef<THREE.SpotLight>(null);
  const { scene } = useThree();
  useEffect(() => {
    if (spot.current) {
      spot.current.target.position.set(0, 0, 0);
      scene.add(spot.current.target);
    }
  }, [scene]);
  return (
    <>
      <Environment resolution={64} frames={1} environmentIntensity={0.35}>
        <Lightformer form="rect" intensity={1.2} color="#fff6ea" position={[0, 3, 1]} rotation={[Math.PI / 2, 0, 0]} scale={[3, 2, 1]} />
        <Lightformer form="rect" intensity={2.5} color="#ffffff" position={[0, 1.5, 3]} scale={[3, 0.1, 1]} />
      </Environment>
      <ambientLight intensity={0.06} />
      <spotLight ref={spot} position={[0.15, 2.4, 0.35]} angle={0.42} penumbra={0.85} intensity={22} decay={1.4} distance={6} color="#fffaf4" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0002} />
    </>
  );
}

/** Glides between the counter overview and reading distance. */
function Rig({ open }: { open: boolean }) {
  const { camera, size, invalidate } = useThree();
  const look = useRef(new THREE.Vector3());
  const tgt = useRef(new THREE.Vector3());
  useFrame((_, dt) => {
    const aspect = size.width / size.height;
    const portrait = aspect < 1;
    const cam = camera as THREE.PerspectiveCamera;
    const fov = portrait ? 50 : 32;
    if (cam.fov !== fov) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    // frame a known width of the counter: the open spread, or the closed book with its props
    let pos: THREE.Vector3;
    if (portrait) {
      const halfW = open ? 0.47 : 0.5;
      const d = halfW / (Math.tan(THREE.MathUtils.degToRad(fov / 2)) * aspect);
      const dir = open ? new THREE.Vector3(0, 0.94, 0.34) : new THREE.Vector3(0, 0.97, 0.24);
      pos = tgt.current.copy(dir.normalize().multiplyScalar(d));
    } else {
      // reading: frame the open spread edge to edge
      if (open) {
        const d = 0.45 / (Math.tan(THREE.MathUtils.degToRad(fov / 2)) * Math.min(aspect, 1.9));
        pos = tgt.current.set(0, d * 0.96, d * 0.2);
      } else pos = tgt.current.set(0, 1.45, 0.42);
    }
    const k = 1 - Math.exp(-dt * 2.6);
    if (camera.position.distanceTo(pos) > 0.0008) {
      camera.position.lerp(pos, k);
      invalidate();
    }
    look.current.lerp(new THREE.Vector3(0, 0, open ? 0.02 : 0), k);
    camera.lookAt(look.current);
  });
  return null;
}

export default function FlipBook({ spread, dir, onDone, onOpen, onSample }: { spread: number; dir: 1 | -1 | 0; onDone: () => void; onOpen?: () => void; onSample?: (id: string) => void }) {
  const open = spread > 0 || dir !== 0;
  return (
    <Canvas shadows frameloop="demand" dpr={[1.5, 2]} camera={{ fov: 32, near: 0.01, far: 20, position: [0, 1.45, 0.42] }} gl={{ alpha: false, antialias: true, toneMapping: THREE.NeutralToneMapping }}>
      <color attach="background" args={["#070707"]} />
      <fog attach="fog" args={["#070707", 2.6, 7]} />
      <Lights />
      <Counter onSample={onSample} />
      <group
        position={[0, 0, 0.02]}
        onClick={(e) => {
          if (!open) {
            e.stopPropagation();
            onOpen?.();
          }
        }}
      >
        <Book spread={spread} dir={dir} onDone={onDone} />
      </group>
      <ContactShadows position={[0, 0.001, 0.02]} scale={1.6} blur={2.4} opacity={0.6} far={0.15} frames={1} />
      <Rig open={open} />
    </Canvas>
  );
}
