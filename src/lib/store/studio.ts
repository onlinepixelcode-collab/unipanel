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
  /** Walking the home: the room the visitor is standing in (-1 = hallway). */
  currentRoom: number;
  setCurrentRoom: (i: number) => void;
  slot: "A" | "B";
  other: Scheme;
  comparing: boolean;
  /** Room interaction: the light switch, opened fronts (by motion id), the tap, and "open doors" mode. */
  lightsOn: boolean;
  opened: Record<string, boolean>;
  tapOn: boolean;
  openMode: boolean;
  setLights: (on: boolean) => void;
  toggleOpen: (id: string) => void;
  closeAll: () => void;
  setTap: (on: boolean) => void;
  setOpenMode: (on: boolean) => void;

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

/** The Studio opens on the whole home, standing at the front door. */
const START: Scheme = { ...DEFAULT_SCHEME, scene: "home" };

export const useStudio = create<StudioState>()((set, get) => ({
  scheme: START,
  past: [],
  future: [],
  selected: null,
  hovered: null,
  mood: "morning",
  camera: "walk",
  cameraNonce: 0,
  favourites: [],
  recent: [],
  announce: "",
  homeRoom: 0,
  setHomeRoom: (i) => set({ homeRoom: i, camera: "walk", cameraNonce: get().cameraNonce + 1 }),
  currentRoom: -1,
  setCurrentRoom: (i) => set((st) => ({ currentRoom: i, homeRoom: i >= 0 ? i : st.homeRoom })),
  slot: "A",
  other: START,
  comparing: false,
  lightsOn: false,
  opened: {},
  tapOn: false,
  openMode: false,
  setLights: (lightsOn) => set({ lightsOn, announce: lightsOn ? "Lights on" : "Lights off" }),
  toggleOpen: (id) => set((st) => ({ opened: { ...st.opened, [id]: !st.opened[id] } })),
  closeAll: () => set({ opened: {}, tapOn: false }),
  setTap: (tapOn) => set({ tapOn }),
  setOpenMode: (openMode) => set({ openMode, announce: openMode ? "Tap a door or drawer to open it" : "Finish mode" }),

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
    set({ opened: {}, tapOn: false, selected: null, camera: scene === "home" ? "walk" : "overview", cameraNonce: get().cameraNonce + 1 });
  },
  setLayout: (layout) => {
    const s = get().scheme;
    get().commit({ ...s, scene: "kitchen", layout }, `Layout changed`);
    set({ opened: {}, tapOn: false, camera: "overview", cameraNonce: get().cameraNonce + 1 });
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
  reset: () => get().commit({ ...DEFAULT_SCHEME, scene: get().scheme.scene }, "Scheme reset"),
  select: (z) => set({ selected: z }),
  hover: (z) => set({ hovered: z }),
  setMood: (mood) => set({ mood, lightsOn: mood === "night" || mood === "evening" }),
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

if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") (window as unknown as { __studioStore?: typeof useStudio }).__studioStore = useStudio;
