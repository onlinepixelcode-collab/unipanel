/**
 * Parametric room geometry in real millimetres.
 * Standards: 18mm door boards, 150mm plinth, 720mm base carcass, 900mm worktop height,
 * 2mm reveal around every front, wall units 1450–2170mm, tall units to 2170mm.
 *
 * Coordinates: x right, y up, z out of the back wall (back wall at z = 0).
 * Every panel carries `uvX` (its left edge along its run) so textures flow
 * continuously across neighbouring doors (matched grain / vein continuity), and
 * `mirror` for bookmatched pairs.
 */
import type { Scheme, Zone } from "./scheme";

export type StagingKind = "bulkhead" | "led" | "carcass" | "worktop" | "floor" | "wall" | "handle" | "hob" | "sink" | "tap" | "rail" | "tv" | "mirror" | "basin" | "interior-light";

export interface Panel {
  key: string;
  zone: Zone | null;
  staging?: StagingKind;
  size: [number, number, number];
  pos: [number, number, number];
  rotY: number;
  uvX: number;
  mirror: boolean;
  door?: boolean;
  order: number;
  /** Fronts that open: a drawer slides out, a door swings on its hinge side; a tap turns on. */
  motion?: { id: string; kind: "drawer" | "hinge-l" | "hinge-r" | "tap"; travel?: number };
  /** Handles ride along with the front they are fixed to. */
  moveWith?: string;
  /** Carcass drawn as an open box (18mm boards) with this many shelves, so open doors show a real interior. */
  hollow?: number;
}

export type PropKind =
  | "jars" | "plant" | "kettle" | "pot" | "boards" | "bowl" | "vase" | "books" | "plates" | "glasses" | "stool" | "folded" | "garments" | "soap" | "bottles" | "towel" | "speaker"
  | "sofa" | "armchair" | "rug" | "coffeeTable" | "floorLamp" | "bed" | "lamp" | "bench" | "console" | "art" | "runner" | "diningTable"
  | "pendant" | "globeCluster";

/** Styling items (visual staging only): kitchenware, books, plants. Position is the item's base centre, in mm. */
export interface Prop {
  kind: PropKind;
  pos: [number, number, number];
  rotY: number;
  /** span available along the run, mm (books, folded stacks, garments) */
  span?: number;
}

export interface RoomInfo {
  id: string;
  name: string;
  x0: number;
  x1: number;
  /** depth extent of the room in the house plan (mm) */
  z0: number;
  z1: number;
  /** where to stand to take the room in, and which way to face (yaw radians, 0 = towards -z) */
  view?: { x: number; z: number; yaw: number };
  /** eye-level viewpoint for walking: where you stand and what you look at (mm) */
  eye: [number, number, number];
  look: [number, number, number];
}

/** An opening in a wall line: a doorway (optionally with a door leaf), an open archway or a window (mm). */
export interface WallOpening {
  c: number;
  w: number;
  kind: "door" | "open" | "window";
  /** door leaf swings this way (+1/-1 about its hinge) */
  swing?: number;
  sill?: number;
  top?: number;
}
/** A straight wall: runs along `axis` from a to b; its thickness starts at `at` (mm). */
export interface WallLine {
  axis: "x" | "z";
  at: number;
  a: number;
  b: number;
  outer?: boolean;
  openings: WallOpening[];
}
/** The whole-home plan: walls with their openings, circulation areas, and where a visitor starts (mm). */
export interface HomeSpec {
  walls: WallLine[];
  /** hall and other circulation areas that are not rooms */
  halls: { x0: number; x1: number; z0: number; z1: number }[];
  spawn: { x: number; z: number; yaw: number };
}

export interface RoomSpec {
  /** Whole-home tour: the rooms laid out side by side, joined by doorways. */
  rooms?: RoomInfo[];
  home?: HomeSpec;
  panels: Panel[];
  props: Prop[];
  bounds: { width: number; depth: number; height: number };
  focus: [number, number, number];
  islandFocus?: [number, number, number];
  detailFocus: [number, number, number];
  walls: { left: boolean; right: boolean };
}

const PLINTH = 150;
const CARCASS = 720;
const WORKTOP_T = 30;
const BASE_DEPTH = 560;
const DOOR = 18;
const GAP = 2;
const WALL_BOTTOM = 1450;
const WALL_H = 950; // wall units run up to 2400mm
const WALL_DEPTH = 330;
const TALL_TOP = 2400; // tall units to 2400mm, bulkhead above to the ceiling
const CEILING = 3000; // generous 3m ceilings

type Fixture = "sink" | "hob";
interface UnitSpec {
  type: "tall" | "base" | "wardrobe" | "wardrobe-open-hang" | "wardrobe-open-shelf";
  w: number;
  front?: "door" | "pair" | "drawers";
  upper?: "wall" | "shelf" | "none";
  fixture?: Fixture;
}

class Builder {
  panels: Panel[] = [];
  props: Prop[] = [];
  private n = 0;
  private m = 0;
  constructor(private s: Scheme) {}
  push(p: Omit<Panel, "key" | "order"> & { order?: number }) {
    this.panels.push({ ...p, key: `p${this.n++}`, order: p.order ?? 0.5 });
  }
  motionId() {
    return `m${this.m++}`;
  }
  get scheme() {
    return this.s;
  }
}

/** A straight run of units against a wall, placed by origin + rotation. */
class Run {
  private cos: number;
  private sin: number;
  private doorIndex = 0;
  private fronts = new Map<string, string>();
  private prev: { x: number; y: number; w: number; h: number; kind: string } | null = null;
  constructor(
    private b: Builder,
    private origin: [number, number],
    private angle: number,
  ) {
    this.cos = Math.cos(angle);
    this.sin = Math.sin(angle);
  }
  /** Add a box by its local min corner (x along run, y up, z out from wall). */
  add(x: number, y: number, z: number, w: number, h: number, d: number, props: Partial<Panel> & { zone: Zone | null }) {
    const cx = x + w / 2;
    const cz = z + d / 2;
    const wx = this.origin[0] + cx * this.cos + cz * this.sin;
    const wz = this.origin[1] - cx * this.sin + cz * this.cos;
    this.b.push({
      size: [w, h, d],
      pos: [wx, y + h / 2, wz],
      rotY: this.angle,
      uvX: x,
      mirror: false,
      ...props,
    });
  }
  /** A styling item at a local position on this run. */
  prop(kind: PropKind, x: number, y: number, z: number, rot = 0, span?: number) {
    const wx = this.origin[0] + x * this.cos + z * this.sin;
    const wz = this.origin[1] - x * this.sin + z * this.cos;
    this.b.props.push({ kind, pos: [wx, y, wz], rotY: this.angle + rot, span });
  }
  /**
   * A door/front with bookmatch bookkeeping. Low fronts are drawers; doors hinge on the left,
   * and a door right beside another of the same size hinges on the right (a pair).
   */
  front(x: number, y: number, z: number, w: number, h: number, zone: Zone, order = 0.8, opts: { hinge?: "hinge-l" | "hinge-r"; travel?: number } = {}) {
    const i = this.doorIndex++;
    const id = this.b.motionId();
    let kind: "drawer" | "hinge-l" | "hinge-r" = h < 300 ? "drawer" : "hinge-l";
    const pv = this.prev;
    if (kind !== "drawer" && pv && pv.kind === "hinge-l" && Math.abs(pv.y - y) < 1 && Math.abs(pv.h - h) < 1 && Math.abs(pv.x + pv.w - x) <= 6) kind = "hinge-r";
    if (opts.hinge) kind = opts.hinge;
    this.prev = { x, y, w, h, kind };
    this.fronts.set(`${x}|${y}`, id);
    this.add(x, y, z, w, h, DOOR, { zone, door: true, mirror: this.b.scheme.bookmatch && i % 2 === 1, order, motion: { id, kind, travel: opts.travel ?? 420 } });
  }
  resetPairs() {
    this.doorIndex = 0;
  }
  handle(x: number, y: number, z: number, w: number, h: number, orientation: "top" | "bottom" | "side-r" | "side-l") {
    const style = this.b.scheme.handle;
    if (style === "push") return;
    const moveWith = this.fronts.get(`${x}|${y}`);
    // a tall door with its handle on the left edge hinges on the right
    if (orientation === "side-l" && moveWith) {
      const p = this.b.panels.find((q) => q.motion?.id === moveWith);
      if (p?.motion) p.motion.kind = "hinge-r";
    }
    if (style === "jprofile") {
      if (orientation === "top") this.add(x + GAP, y + h - 22, z + DOOR, w - GAP * 2, 22, 3, { zone: null, staging: "handle", order: 0.95, moveWith });
      else if (orientation === "bottom") this.add(x + GAP, y, z + DOOR, w - GAP * 2, 22, 3, { zone: null, staging: "handle", order: 0.95, moveWith });
      else this.add(orientation === "side-r" ? x + w - 22 : x, y + GAP, z + DOOR, 22, h - GAP * 2, 3, { zone: null, staging: "handle", order: 0.95, moveWith });
      return;
    }
    // slim bar on standoffs
    const t = 12;
    if (orientation === "top" || orientation === "bottom") {
      const len = Math.min(w - 140, 320);
      const by = orientation === "top" ? y + h - 70 : y + 58;
      this.add(x + (w - len) / 2, by, z + DOOR + 22, len, t, t, { zone: null, staging: "handle", order: 0.95, moveWith });
    } else {
      const len = Math.min(h - 200, 640);
      const bx = orientation === "side-r" ? x + w - 60 : x + 48;
      this.add(bx, y + (h - len) / 2, z + DOOR + 22, t, len, t, { zone: null, staging: "handle", order: 0.95, moveWith });
    }
  }
}

// ---------------------------------------------------------------- kitchen

function buildKitchenRun(b: Builder, run: Run, units: UnitSpec[], opts: { gableStart: boolean; gableEnd: boolean; base: number }) {
  const s = b.scheme;
  let x = 0;
  const total = units.reduce((a, u) => a + u.w, 0);
  // plinth / kickplate, recessed 50mm
  run.add(0, 0, BASE_DEPTH - 50, total, PLINTH, DOOR, { zone: "kickplate", order: 0.15 });

  let worktopStart: number | null = null;
  let shelfIndex = 0;
  const TOP = PLINTH + CARCASS + WORKTOP_T;
  const closeWorktop = (end: number) => {
    if (worktopStart === null) return;
    run.add(worktopStart, PLINTH + CARCASS, 0, end - worktopStart, WORKTOP_T, 620, { zone: null, staging: "worktop", order: 0.6 });
    worktopStart = null;
  };

  for (const u of units) {
    if (u.type === "tall") {
      closeWorktop(x);
      run.add(x, PLINTH, 0, u.w, TALL_TOP - PLINTH, BASE_DEPTH, { zone: null, staging: "carcass", order: 0.25, hollow: 4 });
      run.front(x + GAP, PLINTH + GAP, BASE_DEPTH, u.w - GAP * 2, TALL_TOP - PLINTH - GAP * 2, "tallUnits");
      run.handle(x + GAP, PLINTH + GAP, BASE_DEPTH, u.w - GAP * 2, TALL_TOP - PLINTH - GAP * 2, "side-r");
      run.add(x, TALL_TOP, 0, u.w, CEILING - TALL_TOP, BASE_DEPTH + DOOR, { zone: null, staging: "bulkhead", order: 0.98 });
    } else {
      if (u.fixture === "sink") {
        // worktop with a real cut-out around the undermount sink
        closeWorktop(x);
        const c0 = x + (u.w - 560) / 2;
        const c1 = c0 + 560;
        const wt = { zone: null, staging: "worktop" as const, order: 0.6 };
        run.add(x, PLINTH + CARCASS, 0, c0 - x, WORKTOP_T, 620, wt);
        run.add(c1, PLINTH + CARCASS, 0, x + u.w - c1, WORKTOP_T, 620, wt);
        run.add(c0, PLINTH + CARCASS, 0, 560, WORKTOP_T, 90, wt);
        run.add(c0, PLINTH + CARCASS, 490, 560, WORKTOP_T, 130, wt);
      } else if (worktopStart === null) worktopStart = x;
      run.add(x, PLINTH, 0, u.w, CARCASS, BASE_DEPTH, { zone: null, staging: "carcass", order: 0.25, hollow: u.front === "drawers" ? 0 : 1 });
      const fy = PLINTH + GAP;
      const fh = CARCASS - GAP * 2;
      if (u.front === "drawers") {
        const hs = [176, 268, 268];
        let y = PLINTH + CARCASS;
        run.resetPairs();
        for (const h of hs) {
          y -= h;
          run.front(x + GAP, y + GAP / 2, BASE_DEPTH, u.w - GAP * 2, h - GAP, "baseDoors");
          run.handle(x + GAP, y + GAP / 2, BASE_DEPTH, u.w - GAP * 2, h - GAP, "top");
        }
      } else if (u.front === "pair") {
        const hw = u.w / 2;
        run.front(x + GAP, fy, BASE_DEPTH, hw - GAP * 1.5, fh, "baseDoors");
        run.front(x + hw + GAP / 2, fy, BASE_DEPTH, hw - GAP * 1.5, fh, "baseDoors");
        run.handle(x + GAP, fy, BASE_DEPTH, hw - GAP * 1.5, fh, "top");
        run.handle(x + hw + GAP / 2, fy, BASE_DEPTH, hw - GAP * 1.5, fh, "top");
      } else {
        run.front(x + GAP, fy, BASE_DEPTH, u.w - GAP * 2, fh, "baseDoors");
        run.handle(x + GAP, fy, BASE_DEPTH, u.w - GAP * 2, fh, "top");
      }

      if (u.fixture === "sink") {
        run.add(x + (u.w - 560) / 2, PLINTH + CARCASS + WORKTOP_T - 2, 90, 560, 4, 400, { zone: null, staging: "sink", order: 0.9 });
        run.add(x + u.w / 2 - 15, PLINTH + CARCASS + WORKTOP_T, 40, 30, 300, 30, { zone: null, staging: "tap", order: 0.92, motion: { id: b.motionId(), kind: "tap" } });
        run.prop("soap", x + u.w / 2 + 130, TOP, 70);
      }
      if (u.fixture === "hob") {
        run.add(x + (u.w - 580) / 2, PLINTH + CARCASS + WORKTOP_T, 60, 580, 5, 500, { zone: null, staging: "hob", order: 0.9 });
        run.prop("pot", x + u.w / 2 - 120, TOP + 5, 200);
      }
      // styling on the worktop
      if (!u.fixture && u.upper === "wall") {
        if (u.front === "drawers") run.prop("jars", x + u.w / 2, TOP, 110);
        else {
          run.prop("kettle", x + 170, TOP, 150, -0.4);
          run.prop("plant", x + u.w - 130, TOP, 130);
        }
      }
      if (u.upper === "shelf") {
        shelfIndex++;
        if (shelfIndex === 1) run.prop("boards", x + u.w / 2, TOP, 40);
        else run.prop("bowl", x + u.w / 2, TOP, 260);
      }

      if (u.upper === "wall") {
        run.add(x, WALL_BOTTOM, 0, u.w, WALL_H, WALL_DEPTH, { zone: null, staging: "carcass", order: 0.4, hollow: 1 });
        // inside the wall unit: plates below the shelf, glasses on it
        run.prop("plates", x + u.w / 2 - 110, WALL_BOTTOM + DOOR, 165);
        run.prop("glasses", x + u.w / 2 + 90, WALL_BOTTOM + WALL_H / 2 + DOOR / 2, 165);
        run.front(x + GAP, WALL_BOTTOM + GAP, WALL_DEPTH, u.w - GAP * 2, WALL_H - GAP * 2, "wallDoors");
        run.handle(x + GAP, WALL_BOTTOM + GAP, WALL_DEPTH, u.w - GAP * 2, WALL_H - GAP * 2, "bottom");
        run.add(x, PLINTH + CARCASS + WORKTOP_T, 0, u.w, WALL_BOTTOM - (PLINTH + CARCASS + WORKTOP_T), 12, { zone: "splashback", order: 0.55 });
        run.add(x, WALL_BOTTOM + WALL_H, 0, u.w, CEILING - WALL_BOTTOM - WALL_H, WALL_DEPTH + DOOR, { zone: null, staging: "bulkhead", order: 0.98 });
        // under-cabinet LED strip (visual staging)
        run.add(x + 25, WALL_BOTTOM - 5, WALL_DEPTH - 70, u.w - 50, 5, 14, { zone: null, staging: "led", order: 0.96 });
      } else if (u.upper === "shelf") {
        run.add(x, PLINTH + CARCASS + WORKTOP_T, 0, u.w, 2400 - (PLINTH + CARCASS + WORKTOP_T), DOOR, { zone: "cladding", order: 0.5 });
        for (const [k, sy] of [1340, 1800].entries()) {
          run.add(x + 30, sy, DOOR, u.w - 60, s.buildup, 290, { zone: "shelving", order: 0.85 });
          const top = sy + s.buildup;
          const pick = (k + shelfIndex) % 3;
          if (pick === 0) run.prop("books", x + u.w / 2, top, 160, 0, u.w - 160);
          else if (pick === 1) run.prop("vase", x + u.w / 2 + 60, top, 150);
          else run.prop("plates", x + u.w / 2, top, 150);
        }
      }
    }
    x += u.w;
  }
  closeWorktop(x);

  const tallStart = units[0]?.type === "tall";
  const tallEnd = units[units.length - 1]?.type === "tall";
  if (opts.gableStart) run.add(-DOOR, 0, 0, DOOR, tallStart ? CEILING : PLINTH + CARCASS + WORKTOP_T, BASE_DEPTH + DOOR + 2, { zone: "gables", order: 0.3 });
  if (opts.gableEnd) run.add(total, 0, 0, DOOR, tallEnd ? CEILING : PLINTH + CARCASS + WORKTOP_T, BASE_DEPTH + DOOR + 2, { zone: "gables", order: 0.3 });
  return total;
}

function buildIsland(b: Builder, centerZ: number, cx = 0) {
  const len = 2400;
  const depth = 1000;
  const zFront = centerZ - depth / 2; // cook side
  // run facing the back wall (rotated 180°)
  const run = new Run(b, [cx + len / 2, zFront + 600], Math.PI);
  run.add(0, 0, BASE_DEPTH - 50, len, PLINTH, DOOR, { zone: "kickplate", order: 0.15 });
  const widths = [600, 600, 600, 600];
  let x = 0;
  widths.forEach((w, i) => {
    run.add(x, PLINTH, 0, w, CARCASS, BASE_DEPTH, { zone: null, staging: "carcass", order: 0.25, hollow: i % 2 === 0 ? 0 : 1 });
    if (i % 2 === 0) {
      const hs = [176, 268, 268];
      let y = PLINTH + CARCASS;
      for (const h of hs) {
        y -= h;
        run.front(x + GAP, y + GAP / 2, BASE_DEPTH, w - GAP * 2, h - GAP, "islandFronts");
        run.handle(x + GAP, y + GAP / 2, BASE_DEPTH, w - GAP * 2, h - GAP, "top");
      }
    } else {
      run.front(x + GAP, PLINTH + GAP, BASE_DEPTH, w - GAP * 2, CARCASS - GAP * 2, "islandFronts");
      run.handle(x + GAP, PLINTH + GAP, BASE_DEPTH, w - GAP * 2, CARCASS - GAP * 2, "top");
    }
    x += w;
  });
  // hob on the island
  run.add(900, PLINTH + CARCASS + WORKTOP_T, 80, 580, 5, 480, { zone: null, staging: "hob", order: 0.9 });
  // seating-side back panel (part of the island fronts)
  const back = new Run(b, [cx - len / 2, zFront + 600], 0);
  back.add(0, 0, 0, len, PLINTH + CARCASS, DOOR, { zone: "islandFronts", order: 0.35, uvX: 0 });
  // waterfall end panels
  for (const side of [-1, 1]) {
    b.push({
      zone: "islandEnds",
      size: [DOOR, PLINTH + CARCASS + WORKTOP_T, depth],
      pos: [cx + side * (len / 2 + DOOR / 2), (PLINTH + CARCASS + WORKTOP_T) / 2, centerZ],
      rotY: 0,
      uvX: 0,
      mirror: side > 0 && b.scheme.bookmatch,
      order: 0.45,
    });
  }
  // worktop
  b.push({ zone: null, staging: "worktop", size: [len, WORKTOP_T, depth], pos: [cx, PLINTH + CARCASS + WORKTOP_T / 2, centerZ], rotY: 0, uvX: 0, mirror: false, order: 0.65 });
  // styling: fruit bowl and a vase on the worktop, three stools tucked under the overhang
  const top = PLINTH + CARCASS + WORKTOP_T;
  b.props.push({ kind: "bowl", pos: [cx - 620, top, centerZ + 160], rotY: 0.3 }, { kind: "vase", pos: [cx + 760, top, centerZ + 200], rotY: 0 });
  for (const dx of [-750, 0, 750]) b.props.push({ kind: "stool", pos: [cx + dx, 0, zFront + 900], rotY: 0 });
}

/** A peninsula running out from the back run: fronts face the kitchen, a seating overhang on the other side, waterfall end. */
function buildPeninsula(b: Builder, ox: number) {
  const len = 2400;
  const z0 = 600;
  // local x runs along +z, fronts face -x
  const run = new Run(b, [ox, z0], -Math.PI / 2);
  run.add(0, 0, BASE_DEPTH - 50, len, PLINTH, DOOR, { zone: "kickplate", order: 0.15 });
  for (let i = 0; i < 4; i++) {
    const x = i * 600;
    run.add(x, PLINTH, 0, 600, CARCASS, BASE_DEPTH, { zone: null, staging: "carcass", order: 0.25, hollow: i % 2 === 0 ? 0 : 1 });
    if (i % 2 === 0) {
      let y = PLINTH + CARCASS;
      for (const h of [176, 268, 268]) {
        y -= h;
        run.front(x + GAP, y + GAP / 2, BASE_DEPTH, 600 - GAP * 2, h - GAP, "islandFronts");
        run.handle(x + GAP, y + GAP / 2, BASE_DEPTH, 600 - GAP * 2, h - GAP, "top");
      }
    } else {
      run.front(x + GAP, PLINTH + GAP, BASE_DEPTH, 600 - GAP * 2, CARCASS - GAP * 2, "islandFronts");
      run.handle(x + GAP, PLINTH + GAP, BASE_DEPTH, 600 - GAP * 2, CARCASS - GAP * 2, "top");
    }
  }
  // seating side back panel and overhang worktop
  run.add(0, 0, -DOOR, len, PLINTH + CARCASS, DOOR, { zone: "islandFronts", order: 0.35 });
  run.add(0, PLINTH + CARCASS, -320, len, WORKTOP_T, 920, { zone: null, staging: "worktop", order: 0.6 });
  run.add(1100, PLINTH + CARCASS + WORKTOP_T, 80, 580, 5, 480, { zone: null, staging: "hob", order: 0.9 });
  // waterfall end
  run.add(len, 0, -320, DOOR, PLINTH + CARCASS + WORKTOP_T, 920, { zone: "islandEnds", order: 0.45 });
  for (const x of [450, 1250, 2050]) run.prop("stool", x, 0, -230);
  run.prop("bowl", 380, PLINTH + CARCASS + WORKTOP_T, 200, 0.4);
}

function kitchen(b: Builder): RoomSpec {
  const layout = b.scheme.layout;
  const back: UnitSpec[] = [
    { type: "tall", w: 600 },
    { type: "tall", w: 600 },
    { type: "base", w: 600, front: "drawers", upper: "wall", fixture: layout === "island" || layout === "l-island" || layout === "peninsula" ? undefined : "hob" },
    { type: "base", w: 900, front: "pair", upper: "wall", fixture: "sink" },
    { type: "base", w: 600, front: "door", upper: "wall" },
    { type: "base", w: 600, front: "drawers", upper: "shelf" },
    { type: "base", w: 600, front: "door", upper: "shelf" },
  ];
  const backLen = back.reduce((a, u) => a + u.w, 0); // 4500
  let width = backLen + 600;
  let depth = 4600;
  const walls = { left: true, right: true };
  let backX = -backLen / 2;

  const isL = layout === "l" || layout === "u" || layout === "l-island";
  if (isL || layout === "peninsula") width = backLen + 1400;
  if (isL) backX = -width / 2 + 600; // leave the corner to the return run
  const backRun = new Run(b, [backX, 0], 0);
  buildKitchenRun(b, backRun, back, { gableStart: !isL, gableEnd: layout !== "u" && layout !== "peninsula", base: 0 });

  if (isL) {
    const ret: UnitSpec[] = [
      { type: "base", w: 600, front: "door", upper: "none" },
      { type: "base", w: 600, front: "drawers", upper: "none" },
      { type: "base", w: 600, front: "door", upper: "none" },
      { type: "base", w: 600, front: "pair", upper: "none" },
    ];
    const len = ret.reduce((a, u) => a + u.w, 0);
    // left wall: run goes front → back so fronts face +x
    const leftRun = new Run(b, [-width / 2, 600 + len], Math.PI / 2);
    buildKitchenRun(b, leftRun, ret, { gableStart: true, gableEnd: false, base: 0 });
    // corner worktop + carcass filler
    b.push({ zone: null, staging: "carcass", size: [600, CARCASS, 600], pos: [-width / 2 + 300, PLINTH + CARCASS / 2, 300], rotY: 0, uvX: 0, mirror: false, order: 0.25 });
    b.push({ zone: null, staging: "worktop", size: [600, WORKTOP_T, 620], pos: [-width / 2 + 300, PLINTH + CARCASS + WORKTOP_T / 2, 310], rotY: 0, uvX: 0, mirror: false, order: 0.6 });
    b.push({ zone: "kickplate", size: [600, PLINTH, DOOR], pos: [-width / 2 + 300, PLINTH / 2, BASE_DEPTH - 41], rotY: 0, uvX: 0, mirror: false, order: 0.15 });
    if (layout === "u") {
      const rightRun = new Run(b, [width / 2, 600], -Math.PI / 2);
      const retR = ret.slice(0, 3);
      buildKitchenRun(b, rightRun, retR, { gableStart: false, gableEnd: true, base: 0 });
      // back-right corner filler (back run ends at backX+backLen)
      const gapStart = backX + backLen;
      const gapW = width / 2 - gapStart;
      if (gapW > 0) {
        b.push({ zone: null, staging: "carcass", size: [gapW, CARCASS, 600], pos: [gapStart + gapW / 2, PLINTH + CARCASS / 2, 300], rotY: 0, uvX: 0, mirror: false, order: 0.25 });
        b.push({ zone: null, staging: "worktop", size: [gapW, WORKTOP_T, 620], pos: [gapStart + gapW / 2, PLINTH + CARCASS + WORKTOP_T / 2, 310], rotY: 0, uvX: 0, mirror: false, order: 0.6 });
        b.push({ zone: "kickplate", size: [gapW, PLINTH, DOOR], pos: [gapStart + gapW / 2, PLINTH / 2, BASE_DEPTH - 41], rotY: 0, uvX: 0, mirror: false, order: 0.15 });
      }
    }
  }

  if (layout === "galley") {
    const opp: UnitSpec[] = [
      { type: "base", w: 600, front: "drawers", upper: "none" },
      { type: "base", w: 600, front: "door", upper: "none", fixture: "hob" },
      { type: "base", w: 900, front: "pair", upper: "none" },
      { type: "base", w: 600, front: "drawers", upper: "none" },
      { type: "base", w: 600, front: "door", upper: "none" },
    ];
    const len = opp.reduce((a, u) => a + u.w, 0);
    const z = 600 + 1300 + 600;
    const oppRun = new Run(b, [len / 2, z], Math.PI);
    buildKitchenRun(b, oppRun, opp, { gableStart: true, gableEnd: true, base: 0 });
    depth = z + 1800;
  }

  let islandFocus: [number, number, number] | undefined;
  if (layout === "island" || layout === "l-island") {
    const cx = layout === "l-island" ? 350 : 0;
    buildIsland(b, 2350, cx);
    islandFocus = [cx, 900, 2350];
  }
  if (layout === "peninsula") {
    const ox = backX + backLen; // runs out from the end of the back run
    buildPeninsula(b, ox);
    islandFocus = [ox - 300, 900, 1800];
  }

  return {
    panels: b.panels,
    props: b.props,
    bounds: { width, depth, height: CEILING },
    focus: [0, 1100, 900],
    islandFocus,
    detailFocus: [backX + 600 * 2 + 300, 700, 600],
    walls,
  };
}

// ---------------------------------------------------------------- wardrobe

function wardrobeRun(b: Builder, run: Run, units: UnitSpec[]) {
  const H = 2400;
  const K = 100;
  let x = 0;
  const total = units.reduce((a, u) => a + u.w, 0);
  run.add(0, 0, BASE_DEPTH - 50, total, K, DOOR, { zone: "kickplate", order: 0.15 });
  for (const u of units) {
    if (u.type === "wardrobe") {
      run.add(x, K, 0, u.w, H - K, BASE_DEPTH, { zone: null, staging: "carcass", order: 0.25, hollow: 1 });
      // behind the doors: a hanging rail with clothes and folded stacks on the top shelf
      run.add(x + DOOR, 1860, BASE_DEPTH / 2, u.w - DOOR * 2, 16, 16, { zone: null, staging: "rail", order: 0.9 });
      run.prop("garments", x + u.w / 2, 1860, BASE_DEPTH / 2, 0, u.w - 80);
      run.prop("folded", x + u.w / 2, K + (H - K) * 0.82 + DOOR / 2, 280, 0, u.w - 120);
      run.front(x + GAP, K + GAP, BASE_DEPTH, u.w - GAP * 2, H - K - GAP * 2, "wardrobeDoors");
      run.handle(x + GAP, K + GAP, BASE_DEPTH, u.w - GAP * 2, H - K - GAP * 2, "side-r");
    } else {
      // open bay: interior shell in the interior finish
      run.add(x, K, 0, u.w, H - K, DOOR, { zone: "wardrobeInterior", order: 0.3 });
      run.add(x, K, DOOR, DOOR, H - K, BASE_DEPTH - DOOR, { zone: "wardrobeInterior", order: 0.3 });
      run.add(x + u.w - DOOR, K, DOOR, DOOR, H - K, BASE_DEPTH - DOOR, { zone: "wardrobeInterior", order: 0.3 });
      run.add(x + DOOR, K, DOOR, u.w - DOOR * 2, DOOR, BASE_DEPTH - DOOR, { zone: "wardrobeInterior", order: 0.3 });
      run.add(x + DOOR, H - DOOR, DOOR, u.w - DOOR * 2, DOOR, BASE_DEPTH - DOOR, { zone: "wardrobeInterior", order: 0.3 });
      if (u.type === "wardrobe-open-hang") {
        run.add(x + DOOR, 1900, DOOR, u.w - DOOR * 2, b.scheme.buildup, BASE_DEPTH - DOOR, { zone: "shelving", order: 0.8 });
        run.add(x + DOOR, 1820, BASE_DEPTH / 2, u.w - DOOR * 2, 16, 16, { zone: null, staging: "rail", order: 0.9 });
        run.prop("garments", x + u.w / 2, 1820, BASE_DEPTH / 2, 0, u.w - 80);
      } else {
        for (const sy of [520, 920, 1320, 1720, 2060]) run.add(x + DOOR, sy, DOOR, u.w - DOOR * 2, b.scheme.buildup, BASE_DEPTH - DOOR - 20, { zone: "shelving", order: 0.8 });
        run.prop("folded", x + u.w / 2, 920 + b.scheme.buildup, 280, 0, u.w - 120);
        run.prop("folded", x + u.w / 2, 1320 + b.scheme.buildup, 280, 0, u.w - 120);
        run.prop("books", x + u.w / 2, 1720 + b.scheme.buildup, 260, 0, u.w - 160);
      }
    }
    x += u.w;
  }
  run.add(-DOOR, 0, 0, DOOR, H, BASE_DEPTH + DOOR + 2, { zone: "gables", order: 0.3 });
  run.add(total, 0, 0, DOOR, H, BASE_DEPTH + DOOR + 2, { zone: "gables", order: 0.3 });
  return total;
}

function wardrobe(b: Builder): RoomSpec {
  const width = 5200;
  const back: UnitSpec[] = [
    { type: "wardrobe", w: 600 },
    { type: "wardrobe", w: 600 },
    { type: "wardrobe-open-hang", w: 800 },
    { type: "wardrobe-open-shelf", w: 600 },
    { type: "wardrobe", w: 600 },
    { type: "wardrobe", w: 600 },
  ];
  const backLen = back.reduce((a, u) => a + u.w, 0);
  wardrobeRun(b, new Run(b, [-backLen / 2, 0], 0), back);
  // feature cladding on the back wall either side of the run
  const bay = (width - backLen) / 2 - DOOR - 2;
  const wall = new Run(b, [-width / 2, 0], 0);
  wall.add(0, 0, 0, bay, CEILING, DOOR, { zone: "cladding", order: 0.2 });
  wall.add(width - bay, 0, 0, bay, CEILING, DOOR, { zone: "cladding", order: 0.2, uvX: 0 });
  const side: UnitSpec[] = [
    { type: "wardrobe", w: 600 },
    { type: "wardrobe-open-shelf", w: 600 },
    { type: "wardrobe", w: 600 },
  ];
  wardrobeRun(b, new Run(b, [-width / 2, 800 + 1800], Math.PI / 2), side);
  wardrobeRun(b, new Run(b, [width / 2, 800], -Math.PI / 2), [side[0], { type: "wardrobe-open-hang", w: 600 }, side[2]]);

  // dresser island
  const isl = new Run(b, [-600, 2000], 0);
  isl.add(0, 0, 0, 1200, 100, 600, { zone: "kickplate", order: 0.15 });
  isl.add(0, 100, 0, 1200, 780, 582, { zone: null, staging: "carcass", order: 0.25, hollow: 0 });
  for (const [i, h] of [260, 260, 260].entries()) {
    const y = 100 + i * 260;
    isl.front(GAP, y + GAP / 2, 582, 600 - GAP * 1.5, h - GAP, "wardrobeDoors");
    isl.front(600 + GAP / 2, y + GAP / 2, 582, 600 - GAP * 1.5, h - GAP, "wardrobeDoors");
    isl.handle(GAP, y + GAP / 2, 582, 600 - GAP * 1.5, h - GAP, "top");
    isl.handle(600 + GAP / 2, y + GAP / 2, 582, 600 - GAP * 1.5, h - GAP, "top");
  }
  isl.add(-DOOR, 0, 0, DOOR, 900, 600, { zone: "gables", order: 0.3 });
  isl.add(1200, 0, 0, DOOR, 900, 600, { zone: "gables", order: 0.3 });
  isl.add(-DOOR, 880, 0, 1200 + DOOR * 2, b.scheme.buildup, 600, { zone: "shelving", order: 0.7 });
  isl.prop("vase", 250, 880 + b.scheme.buildup, 300);
  isl.prop("books", 820, 880 + b.scheme.buildup, 300, 0.2, 260);

  return {
    panels: b.panels,
    props: b.props,
    bounds: { width, depth: 4800, height: CEILING },
    focus: [0, 1200, 1200],
    detailFocus: [-backLen / 2 + 900, 1300, 600],
    walls: { left: true, right: true },
  };
}

// ---------------------------------------------------------------- media wall

function media(b: Builder): RoomSpec {
  const W = 4200;
  const wallRun = new Run(b, [-W / 2, 0], 0);
  wallRun.add(0, 0, 0, W, CEILING, DOOR, { zone: "cladding", order: 0.2 });
  // tall units at each end
  for (const x of [0, W - 600]) {
    wallRun.add(x, 0, DOOR, 600, 2400, 400, { zone: null, staging: "carcass", order: 0.3, hollow: 4 });
    wallRun.front(x + GAP, GAP, DOOR + 400, 600 - GAP * 2, 2400 - GAP * 2, "tallUnits");
    wallRun.handle(x + GAP, GAP, DOOR + 400, 600 - GAP * 2, 2400 - GAP * 2, x === 0 ? "side-r" : "side-l");
    wallRun.add(x === 0 ? 600 : x - DOOR, 0, DOOR, DOOR, 2400, 420, { zone: "gables", order: 0.35 });
  }
  // floating TV unit
  const tvW = 2600;
  const tvX = (W - tvW) / 2;
  wallRun.add(tvX, 260, DOOR, tvW, 420, 420, { zone: null, staging: "carcass", order: 0.4, hollow: 0 });
  for (let i = 0; i < 4; i++) {
    wallRun.front(tvX + i * (tvW / 4) + GAP, 260 + GAP, DOOR + 420, tvW / 4 - GAP * 2, 420 - GAP * 2, "baseDoors");
    wallRun.handle(tvX + i * (tvW / 4) + GAP, 260 + GAP, DOOR + 420, tvW / 4 - GAP * 2, 420 - GAP * 2, "top");
  }
  wallRun.add(tvX, 680, DOOR, tvW, b.scheme.buildup, 440, { zone: "shelving", order: 0.7 });
  // floating build-up shelves either side of the screen
  for (const sx of [tvX + 60, tvX + tvW - 560]) {
    for (const [k, sy] of [1350, 1800].entries()) {
      wallRun.add(sx, sy, DOOR, 500, b.scheme.buildup, 280, { zone: "shelving", order: 0.8 });
      const top = sy + b.scheme.buildup;
      if ((k + (sx > tvX + 100 ? 1 : 0)) % 2 === 0) wallRun.prop("books", sx + 250, top, DOOR + 140, 0, 380);
      else wallRun.prop("vase", sx + 250, top, DOOR + 140);
    }
  }
  wallRun.prop("vase", tvX + 260, 680 + b.scheme.buildup, DOOR + 220);
  wallRun.prop("books", tvX + tvW - 300, 680 + b.scheme.buildup, DOOR + 220, 0, 320);
  wallRun.prop("plant", -250, 0, 500);
  // lounge: sofa facing the screen, rug, coffee table, armchair and a reading lamp
  wallRun.prop("rug", W / 2, 0, 2700, 0, 3000);
  wallRun.prop("sofa", W / 2, 0, 3650, Math.PI, 2600);
  wallRun.prop("coffeeTable", W / 2, 0, 2600);
  wallRun.prop("armchair", W - 350, 0, 2500, Math.PI + 0.7);
  wallRun.prop("floorLamp", W / 2 + 1550, 0, 3900);
  wallRun.add((W - 1450) / 2, 1080, DOOR, 1450, 820, 40, { zone: null, staging: "tv", order: 0.95 });
  return {
    panels: b.panels,
    bounds: { width: W + 800, depth: 4600, height: CEILING },
    focus: [0, 1200, 400],
    detailFocus: [0, 700, 450],
    props: b.props,
    walls: { left: true, right: true },
  };
}

// ---------------------------------------------------------------- vanity

function vanity(b: Builder): RoomSpec {
  const W = 3000;
  const run = new Run(b, [-W / 2, 0], 0);
  run.add(0, 0, 0, W, CEILING, DOOR, { zone: "cladding", order: 0.2 });
  const vx = 600;
  const vw = 1400;
  run.add(vx, 420, DOOR, vw, 450, 470, { zone: null, staging: "carcass", order: 0.3, hollow: 0 });
  run.front(vx + GAP, 420 + GAP, DOOR + 470, vw / 2 - GAP * 1.5, 450 - GAP * 2, "baseDoors");
  run.front(vx + vw / 2 + GAP / 2, 420 + GAP, DOOR + 470, vw / 2 - GAP * 1.5, 450 - GAP * 2, "baseDoors");
  run.handle(vx + GAP, 420 + GAP, DOOR + 470, vw / 2 - GAP * 1.5, 450 - GAP * 2, "top");
  run.handle(vx + vw / 2 + GAP / 2, 420 + GAP, DOOR + 470, vw / 2 - GAP * 1.5, 450 - GAP * 2, "top");
  run.add(vx - DOOR, 420, DOOR, DOOR, 480, 490, { zone: "gables", order: 0.35 });
  run.add(vx + vw, 420, DOOR, DOOR, 480, 490, { zone: "gables", order: 0.35 });
  run.add(vx, 870, DOOR, vw, 30, 490, { zone: null, staging: "worktop", order: 0.6 });
  run.add(vx + vw / 2 - 260, 900, DOOR + 70, 520, 120, 380, { zone: null, staging: "basin", order: 0.9 });
  run.add(vx + vw / 2 - 15, 900, DOOR + 20, 30, 260, 30, { zone: null, staging: "tap", order: 0.92, motion: { id: b.motionId(), kind: "tap" } });
  run.prop("soap", vx + vw / 2 + 360, 900, DOOR + 120);
  run.add(vx, 900, DOOR, vw, 600, 12, { zone: "splashback", order: 0.5 });
  // mirror cabinet
  run.add(vx + 150, 1560, DOOR, vw - 300, 700, 150, { zone: null, staging: "carcass", order: 0.6, hollow: 1 });
  run.prop("bottles", vx + 150 + (vw - 300) / 2, 1560 + DOOR, DOOR + 70);
  run.front(vx + 150 + GAP, 1560 + GAP, DOOR + 150, (vw - 300) / 2 - GAP * 1.5, 700 - GAP * 2, "wallDoors");
  run.front(vx + 150 + (vw - 300) / 2 + GAP / 2, 1560 + GAP, DOOR + 150, (vw - 300) / 2 - GAP * 1.5, 700 - GAP * 2, "wallDoors");
  // open build-up shelving beside the vanity
  for (const sy of [1100, 1450, 1800]) run.add(vx + vw + 200, sy, DOOR, 520, b.scheme.buildup, 240, { zone: "shelving", order: 0.8 });
  run.prop("towel", vx + vw + 460, 1100 + b.scheme.buildup, DOOR + 120);
  run.prop("plant", vx + vw + 460, 1450 + b.scheme.buildup, DOOR + 120);
  run.prop("bottles", vx + vw + 460, 1800 + b.scheme.buildup, DOOR + 120);
  return {
    panels: b.panels,
    bounds: { width: W + 600, depth: 3600, height: CEILING },
    focus: [-W / 2 + vx + vw / 2, 1100, 400],
    props: b.props,
    detailFocus: [-W / 2 + vx + vw / 2, 640, 500],
    walls: { left: true, right: true },
  };
}

// ---------------------------------------------------------------- bedroom

/** A bedroom with a full-height cladded headboard wall, floating bedside drawers and a ledge. */
function bedroom(b: Builder): RoomSpec {
  const W = 4200;
  const run = new Run(b, [-W / 2, 0], 0);
  // headboard wall: full-height cladding behind the bed
  run.add(0, 0, 0, W, CEILING, DOOR, { zone: "cladding", order: 0.2 });
  // picture ledge across the headboard wall
  run.add(W / 2 - 1000, 1250, DOOR, 2000, b.scheme.buildup, 140, { zone: "shelving", order: 0.8 });
  run.prop("vase", W / 2 - 700, 1250 + b.scheme.buildup, DOOR + 70);
  run.prop("books", W / 2 + 600, 1250 + b.scheme.buildup, DOOR + 70, 0, 360);
  // floating bedside units with two drawers each
  for (const x of [W / 2 - 1450, W / 2 + 950]) {
    run.add(x, 360, DOOR, 500, 400, 420, { zone: null, staging: "carcass", order: 0.4, hollow: 0 });
    for (const [k, y] of [560, 360].entries()) {
      run.front(x + GAP, y + GAP / 2, DOOR + 420, 500 - GAP * 2, 198, "baseDoors", 0.8, { travel: 320 });
      run.handle(x + GAP, y + GAP / 2, DOOR + 420, 500 - GAP * 2, 198, "top");
      void k;
    }
    run.add(x - DOOR, 360, DOOR, DOOR, 400, 438, { zone: "gables", order: 0.45 });
    run.add(x + 500, 360, DOOR, DOOR, 400, 438, { zone: "gables", order: 0.45 });
    run.prop("lamp", x + 250, 760, DOOR + 210);
  }
  run.prop("bed", W / 2, 0, DOOR + 1080);
  run.prop("rug", W / 2, 0, DOOR + 1500, 0, 2800);
  run.prop("bench", W / 2, 0, DOOR + 2450);
  run.prop("plant", W - 300, 0, 1700);
  return {
    panels: b.panels,
    props: b.props,
    bounds: { width: W + 600, depth: 4800, height: CEILING },
    focus: [0, 1100, 1200],
    detailFocus: [W / 2 - 1200, 560, 450],
    walls: { left: true, right: true },
  };
}

const HOME_DEPTH = 4800;
const WALL_T = 120;

/** Place a room's own panels and props into the house: turned by `rot` (0 or π) about the room centre. */
function placeRoom(spec: RoomSpec, tag: string, cx: number, back: number, rot: number, panels: Panel[], props: Prop[], n: { v: number }) {
  const flip = rot !== 0;
  const tx = (x: number) => (flip ? cx - x : cx + x);
  const tz = (z: number) => (flip ? back - z : back + z);
  for (const pn of spec.panels)
    panels.push({
      ...pn,
      key: `h${n.v++}`,
      pos: [tx(pn.pos[0]), pn.pos[1], tz(pn.pos[2])],
      rotY: pn.rotY + rot,
      motion: pn.motion ? { ...pn.motion, id: tag + pn.motion.id } : undefined,
      moveWith: pn.moveWith ? tag + pn.moveWith : undefined,
    });
  for (const pr of spec.props) props.push({ ...pr, pos: [tx(pr.pos[0]), pr.pos[1], tz(pr.pos[2])], rotY: pr.rotY + rot });
}

/**
 * The whole home, laid out like a real house (about 15.6 × 11.6 m): a bedroom wing to the
 * north (bedroom, walk-in wardrobe through it, bathroom), a hallway across the middle, and
 * the living wing to the south (open-plan kitchen and lounge, and the entrance foyer with
 * the front door). Rooms face the hall; units and feature walls sit on the outer walls.
 */
function home(s: Scheme): RoomSpec {
  const T = WALL_T;
  const DEPTH = HOME_DEPTH; // each wing is 4.8m deep
  const build = {
    kitchen: kitchen(new Builder({ ...s, scene: "kitchen", layout: s.layout === "straight" || s.layout === "galley" ? s.layout : "island" })),
    lounge: media(new Builder({ ...s, scene: "media" })),
    bedroom: bedroom(new Builder({ ...s, scene: "wardrobe" })),
    wardrobe: wardrobe(new Builder({ ...s, scene: "wardrobe" })),
    bathroom: vanity(new Builder({ ...s, scene: "vanity" })),
  };
  const span = (r: RoomSpec) => r.bounds.width + 600;
  // north wing
  const bedW = span(build.bedroom), warW = span(build.wardrobe), batW = span(build.bathroom);
  const W = bedW + T + warW + T + batW;
  const nz0 = 0, nz1 = DEPTH;
  const hz0 = nz1 + T, hz1 = hz0 + 1800;
  const sz0 = hz1 + T, sz1 = sz0 + DEPTH;
  const kitW = span(build.kitchen), louW = span(build.lounge);
  const foyW = W - kitW - louW - 2 * T;

  const panels: Panel[] = [];
  const props: Prop[] = [];
  const n = { v: 0 };
  const rooms: RoomInfo[] = [];
  const add = (id: string, name: string, spec: RoomSpec | null, x0: number, w: number, north: boolean, view?: { lx: number; lz: number; yaw: number }) => {
    const cx = x0 + w / 2;
    const back = north ? nz0 : sz1;
    const rot = north ? 0 : Math.PI;
    if (spec) placeRoom(spec, id.slice(0, 2), cx, back, rot, panels, props, n);
    const v = view ?? { lx: 300, lz: DEPTH - 1500, yaw: 0 };
    rooms.push({
      id,
      name,
      x0,
      x1: x0 + w,
      z0: north ? nz0 : sz0,
      z1: north ? nz1 : sz1,
      eye: [cx, 1600, north ? DEPTH - 500 : sz0 + 500],
      look: [cx, 1250, north ? 600 : sz1 - 600],
      view: { x: north ? cx + v.lx : cx - v.lx, z: north ? back + v.lz : back - v.lz, yaw: v.yaw + rot },
    });
  };
  add("bedroom", "Bedroom", build.bedroom, 0, bedW, true);
  add("wardrobe", "Walk-in wardrobe", build.wardrobe, bedW + T, warW, true);
  add("bathroom", "Bathroom", build.bathroom, bedW + T + warW + T, batW, true, { lx: 0, lz: DEPTH - 1700, yaw: 0 });
  add("kitchen", "Kitchen", build.kitchen, 0, kitW, false);
  // the lounge's sofa faces the media wall: stand beside it, not behind it
  add("lounge", "Lounge", build.lounge, kitW + T, louW, false, { lx: -1850, lz: DEPTH - 1100, yaw: -0.42 });
  add("foyer", "Entrance", null, kitW + T + louW + T, foyW, false, { lx: 0, lz: DEPTH - 1200, yaw: 0 });

  const [bed, war, bat, kit, lou, foy] = rooms;
  const mid = (r: RoomInfo) => (r.x0 + r.x1) / 2;
  const walls: WallLine[] = [
    // outer walls
    { axis: "x", at: -T, a: -T, b: W + T, outer: true, openings: [] },
    {
      axis: "x",
      at: sz1,
      a: -T,
      b: W + T,
      outer: true,
      openings: [
        { c: mid(foy), w: 1100, kind: "door", swing: 1 },
        { c: mid(foy) + 1350, w: 1300, kind: "window", sill: 0, top: 2900 },
      ],
    },
    {
      axis: "z",
      at: -T,
      a: 0,
      b: sz1,
      outer: true,
      openings: [
        { c: 2400, w: 2200, kind: "window", sill: 0, top: 2900 },
        { c: (hz0 + hz1) / 2, w: 1500, kind: "window", sill: 0, top: 2900 },
        { c: sz1 - 2600, w: 2000, kind: "window", sill: 900, top: 2700 },
      ],
    },
    {
      axis: "z",
      at: W,
      a: 0,
      b: sz1,
      outer: true,
      openings: [
        { c: 2400, w: 1000, kind: "window", sill: 1500, top: 2200 },
        { c: (hz0 + hz1) / 2, w: 1500, kind: "window", sill: 0, top: 2900 },
        { c: sz0 + 2000, w: 1800, kind: "window", sill: 0, top: 2900 },
      ],
    },
    // north wing / hall
    {
      axis: "x",
      at: nz1,
      a: 0,
      b: W,
      openings: [
        { c: bed.x0 + 800, w: 900, kind: "door", swing: 1 },
        { c: bat.x0 + 700, w: 800, kind: "door", swing: 1 },
      ],
    },
    // hall / south wing
    {
      axis: "x",
      at: hz1,
      a: 0,
      b: W,
      openings: [
        { c: mid(kit) - 600, w: 1400, kind: "open", top: 2400 },
        { c: mid(lou), w: 1800, kind: "open", top: 2400 },
        { c: mid(foy), w: 1800, kind: "open", top: 2400 },
      ],
    },
    // partitions
    { axis: "z", at: bed.x1, a: nz0, b: nz1, openings: [{ c: DEPTH - 1450, w: 900, kind: "door", swing: 1 }] }, // bedroom through to the wardrobe
    { axis: "z", at: war.x1, a: nz0, b: nz1, openings: [] },
    { axis: "z", at: kit.x1, a: sz0, b: sz1, openings: [{ c: sz0 + (DEPTH - 1200) / 2, w: DEPTH - 1200, kind: "open", top: 2400 }] }, // open-plan kitchen and lounge
    { axis: "z", at: lou.x1, a: sz0, b: sz1, openings: [{ c: sz0 + 2400, w: 2600, kind: "open", top: 2400 }] }, // foyer opens to the lounge
  ];
  void war;

  // the foyer and hall: console with art, a bench by the door, plants, runners
  props.push(
    { kind: "rug", pos: [mid(foy), 0, sz0 + 2600], rotY: 0, span: 2200 },
    { kind: "console", pos: [foy.x1 - 200, 0, sz0 + 2400], rotY: -Math.PI / 2 },
    { kind: "art", pos: [foy.x1 - 12, 1450, sz0 + 2400], rotY: -Math.PI / 2 },
    { kind: "bench", pos: [mid(foy) - 1100, 0, sz1 - 350], rotY: Math.PI },
    { kind: "plant", pos: [foy.x1 - 380, 0, sz1 - 380], rotY: 0 },
    { kind: "runner", pos: [W / 2 - 1200, 0, (hz0 + hz1) / 2], rotY: 0, span: W - 4400 },
    { kind: "art", pos: [mid(war), 1450, nz1 + T + 12], rotY: 0 },
    { kind: "art", pos: [mid(war) + 1400, 1450, nz1 + T + 12], rotY: 0 },
    { kind: "plant", pos: [380, 0, hz0 + 380], rotY: 0 },
  );

  // centre the house on x = 0
  const shift = -W / 2;
  for (const pn of panels) pn.pos[0] += shift;
  for (const pr of props) pr.pos[0] += shift;
  for (const r of rooms) {
    r.x0 += shift;
    r.x1 += shift;
    r.eye[0] += shift;
    r.look[0] += shift;
    if (r.view) r.view.x += shift;
  }
  for (const w of walls) {
    if (w.axis === "x") {
      w.a += shift;
      w.b += shift;
      for (const o of w.openings) o.c += shift;
    } else w.at += shift;
  }
  const homeSpec: HomeSpec = {
    walls,
    halls: [{ x0: shift, x1: W + shift, z0: hz0, z1: hz1 }],
    // just inside the front door, looking across the foyer into the lounge and kitchen
    spawn: { x: mid(foy) + 300, z: sz1 - 1500, yaw: 1.72 },
  };
  const k = build.kitchen;
  const kcx = mid(kit);
  // statement lighting: globe pendants over the island, a cluster of glass globes over the lounge
  if (k.islandFocus) for (const dx of [-750, 0, 750]) props.push({ kind: "pendant", pos: [kcx - k.islandFocus[0] + dx, CEILING, sz1 - k.islandFocus[2]], rotY: 0 });
  const ct = props.find((pr) => pr.kind === "coffeeTable");
  if (ct) props.push({ kind: "globeCluster", pos: [ct.pos[0], CEILING, ct.pos[2]], rotY: 0 });
  // full-height marble feature wall in the entrance, behind the console (the splashback finish)
  panels.push({ key: `h${n.v++}`, zone: "splashback", size: [2600, CEILING, 18], pos: [foy.x1 - 9, CEILING / 2, sz0 + 2400], rotY: -Math.PI / 2, uvX: 0, mirror: false, order: 0.3 });
  return {
    panels,
    props,
    rooms,
    home: homeSpec,
    bounds: { width: W, depth: sz1, height: CEILING },
    focus: [0, 900, sz1 / 2],
    islandFocus: k.islandFocus ? [kcx - k.islandFocus[0], k.islandFocus[1], sz1 - k.islandFocus[2]] : undefined,
    detailFocus: [kcx - k.detailFocus[0], k.detailFocus[1], sz1 - k.detailFocus[2]],
    walls: { left: true, right: true },
  };
}

export function buildRoom(s: Scheme): RoomSpec {
  if (s.scene === "home") return home(s);
  const b = new Builder(s);
  switch (s.scene) {
    case "wardrobe":
      return wardrobe(b);
    case "media":
      return media(b);
    case "vanity":
      return vanity(b);
    default:
      return kitchen(b);
  }
}
