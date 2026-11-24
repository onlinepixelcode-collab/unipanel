"use client";
import { create } from "zustand";
import { DEFAULT_SCHEME, DOOR_ZONES, type DesignPreset, type Scheme, type Zone, type Mood, type CameraPreset, type SceneId, type KitchenLayout } from "@/lib/studio/scheme";

const HISTORY = 60;

interface StudioState {
  scheme: Scheme;
  past: Scheme[];
  future: Scheme[];
  selected: Zone | null;
  hovered: Zone | null;
  mood: Mood;
  camera: CameraPreset;
  cameraNonce: number;
  favourites: string[];
  recent: string[];
  announce: string;
  /** Two designs: the one being edited (`scheme`) and the parked one (`other`). */
  homeRoom: number;
  setHomeRoom: (i: number) => void;
  slot: "A" | "B";
  other: Scheme;
  comparing: boolean;

  commit: (next: Scheme, msg?: string) => void;
  setFinish: (zone: Zone, id: string, label?: string) => void;
  applyToDoors: (id: string, label?: string) => void;
  twoTone: (upper: string, lower: string) => void;
  applyDesign: (d: DesignPreset) => void;
  islandContrast: (id: string) => void;
  setScene: (scene: SceneId) => void;
  setLayout: (layout: KitchenLayout) => void;
  setOption: <K extends keyof Scheme>(key: K, value: Scheme[K]) => void;
  load: (s: Scheme) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  select: (z: Zone | null) => void;
  hover: (z: Zone | null) => void;
  setMood: (m: Mood) => void;
  setCamera: (c: CameraPreset) => void;
  toggleFavourite: (id: string) => void;
  switchSlot: (to?: "A" | "B") => void;
  copyToOther: () => void;
  setComparing: (on: boolean) => void;
}

const pushRecent = (list: string[], id: string) => [id, ...list.filter((x) => x !== id)].slice(0, 12);

export const useStudio = create<StudioState>()((set, get) => ({
  scheme: DEFAULT_SCHEME,
  past: [],
  future: [],
  selected: null,
  hovered: null,
  mood: "gallery",
  camera: "overview",
  cameraNonce: 0,
  favourites: [],
  recent: [],
  announce: "",
  homeRoom: 0,
  setHomeRoom: (i) => set({ homeRoom: i, camera: "walk", cameraNonce: get().cameraNonce + 1 }),
  slot: "A",
  other: DEFAULT_SCHEME,
  comparing: false,

  commit: (next, msg) =>
    set((st) => ({ scheme: next, past: [...st.past, st.scheme].slice(-HISTORY), future: [], announce: msg ?? st.announce })),
  setFinish: (zone, id, label) => {
    const s = get().scheme;
    if (s.zones[zone] === id) return;
    get().commit({ ...s, zones: { ...s.zones, [zone]: id } }, label ? `${label} applied` : undefined);
    set((st) => ({ recent: pushRecent(st.recent, id) }));
  },
  applyToDoors: (id, label) => {
    const s = get().scheme;
    const zones = { ...s.zones };
    for (const z of DOOR_ZONES) zones[z] = id;
    get().commit({ ...s, zones }, label ? `${label} applied to all doors` : undefined);
    set((st) => ({ recent: pushRecent(st.recent, id) }));
  },
  twoTone: (upper, lower) => {
    const s = get().scheme;
    get().commit({ ...s, zones: { ...s.zones, wallDoors: upper, tallUnits: upper, baseDoors: lower, kickplate: lower } }, "Two-tone applied");
  },
  applyDesign: (d) => {
    const s = get().scheme;
    get().commit({ ...s, zones: { ...s.zones, ...d.zones }, handle: d.handle, floor: d.floor, wall: d.wall, worktop: d.worktop }, `${d.name} applied`);
  },
  islandContrast: (id) => {
    const s = get().scheme;
    get().commit({ ...s, layout: s.scene === "kitchen" ? "island" : s.layout, zones: { ...s.zones, islandFronts: id, islandEnds: id } }, "Island contrast applied");
  },
  setScene: (scene) => {
    const s = get().scheme;
    if (s.scene === scene) return;
    get().commit({ ...s, scene }, `Scene changed`);
    set({ selected: null, camera: "overview", cameraNonce: get().cameraNonce + 1 });
  },
  setLayout: (layout) => {
    const s = get().scheme;
    get().commit({ ...s, scene: "kitchen", layout }, `Layout changed`);
    set({ camera: "overview", cameraNonce: get().cameraNonce + 1 });
  },
  setOption: (key, value) => get().commit({ ...get().scheme, [key]: value }),
  load: (s) => set({ scheme: s, past: [], future: [] }),
  undo: () => {
    const { past, scheme, future } = get();
    if (!past.length) return;
    set({ scheme: past[past.length - 1], past: past.slice(0, -1), future: [scheme, ...future], announce: "Undone" });
  },
  redo: () => {
    const { past, scheme, future } = get();
    if (!future.length) return;
    set({ scheme: future[0], future: future.slice(1), past: [...past, scheme], announce: "Redone" });
  },
  reset: () => get().commit(DEFAULT_SCHEME, "Scheme reset"),
  select: (z) => set({ selected: z }),
  hover: (z) => set({ hovered: z }),
  setMood: (mood) => set({ mood }),
  setCamera: (camera) => set({ camera, cameraNonce: get().cameraNonce + 1 }),
  toggleFavourite: (id) => set((st) => ({ favourites: st.favourites.includes(id) ? st.favourites.filter((x) => x !== id) : [...st.favourites, id] })),
  switchSlot: (to) => {
    const st = get();
    const target = to ?? (st.slot === "A" ? "B" : "A");
    if (target === st.slot) return;
    set({ scheme: st.other, other: st.scheme, slot: target, past: [], future: [], announce: `Editing design ${target}` });
  },
  copyToOther: () => set((st) => ({ other: st.scheme, announce: `Design ${st.slot === "A" ? "B" : "A"} now matches design ${st.slot}` })),
  setComparing: (comparing) => set({ comparing }),
}));
