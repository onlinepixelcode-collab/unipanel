/**
 * Geometry of the walkable home, shared by the 3D shell (walls, doors, windows), the
 * first-person walker (collision and routing) and the minimap. Everything here is in
 * metres, derived from the RoomSpec's rooms and hall (mm).
 */
import type { RoomSpec } from "./layout";

const MM = 0.001;
export const WALL = 0.12;
export const DOOR_H = 2.1;

export interface WallBox {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  y0: number;
  y1: number;
  outer?: boolean;
}
export interface DoorLeaf {
  /** hinge position and the direction the closed leaf runs along */
  hx: number;
  hz: number;
  axis: "x" | "z";
  w: number;
  /** swing direction: +1 or -1 about the hinge */
  swing: number;
}
export interface WindowPane {
  x: number;
  z: number;
  axis: "x" | "z";
  w: number;
  y0: number;
  y1: number;
}
export interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}
export interface Portal {
  a: number; // region index (-1 = hall)
  b: number;
  x: number;
  z: number;
  /** normal of the opening, pointing from a to b */
  nx: number;
  nz: number;
}

export interface HomePlan {
  H: number;
  /** footprint, outer faces of the walls */
  box: Rect;
  rooms: { name: string; x0: number; x1: number; z0: number; z1: number; view: { x: number; z: number; yaw: number } }[];
  halls: Rect[];
  walls: WallBox[];
  leaves: DoorLeaf[];
  windows: WindowPane[];
  portals: Portal[];
  spawn: { x: number; z: number; yaw: number };
}

/** Split a wall run [a, b] by openings into solid pieces, plus lintels above and sills below. */
function run(a: number, b: number, openings: { c: number; w: number; top: number; sill?: number }[], H: number) {
  const pieces: { a: number; b: number; y0: number; y1: number }[] = [];
  const ops = [...openings].sort((p, q) => p.c - q.c);
  let cur = a;
  for (const o of ops) {
    const s = o.c - o.w / 2, e = o.c + o.w / 2;
    if (s > cur) pieces.push({ a: cur, b: s, y0: 0, y1: H });
    if (o.top < H) pieces.push({ a: s, b: e, y0: o.top, y1: H });
    if (o.sill && o.sill > 0) pieces.push({ a: s, b: e, y0: 0, y1: o.sill });
    cur = Math.max(cur, e);
  }
  if (cur < b) pieces.push({ a: cur, b, y0: 0, y1: H });
  return pieces;
}

const inRect = (r: Rect, x: number, z: number, m = 0) => x >= r.x0 - m && x <= r.x1 + m && z >= r.z0 - m && z <= r.z1 + m;

export function homePlan(room: RoomSpec): HomePlan | null {
  const home = room.home;
  if (!room.rooms || !home) return null;
  const H = room.bounds.height * MM;
  const rooms = room.rooms.map((r) => ({
    name: r.name,
    x0: r.x0 * MM,
    x1: r.x1 * MM,
    z0: r.z0 * MM,
    z1: r.z1 * MM,
    view: r.view ? { x: r.view.x * MM, z: r.view.z * MM, yaw: r.view.yaw } : { x: ((r.x0 + r.x1) / 2) * MM, z: ((r.z0 + r.z1) / 2) * MM, yaw: 0 },
  }));
  const halls = home.halls.map((h) => ({ x0: h.x0 * MM, x1: h.x1 * MM, z0: h.z0 * MM, z1: h.z1 * MM }));
  const T = WALL;
  const walls: WallBox[] = [];
  const leaves: DoorLeaf[] = [];
  const windows: WindowPane[] = [];
  const portals: Portal[] = [];
  const box: Rect = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity };

  const regionOf = (x: number, z: number) => {
    const i = rooms.findIndex((r) => inRect(r, x, z, 0.02));
    if (i >= 0) return i;
    return halls.some((h) => inRect(h, x, z, 0.02)) ? -1 : -2;
  };

  for (const wl of home.walls) {
    const at = wl.at * MM, a = wl.a * MM, b = wl.b * MM;
    const ops = wl.openings.map((o) => ({ c: o.c * MM, w: o.w * MM, top: (o.top ?? (o.kind === "door" ? DOOR_H * 1000 : 2400)) * MM, sill: o.sill ? o.sill * MM : 0 }));
    for (const p of run(a, b, ops, H)) {
      const wb: WallBox = wl.axis === "x" ? { x0: p.a, x1: p.b, z0: at, z1: at + T, y0: p.y0, y1: p.y1, outer: wl.outer } : { x0: at, x1: at + T, z0: p.a, z1: p.b, y0: p.y0, y1: p.y1, outer: wl.outer };
      walls.push(wb);
      box.x0 = Math.min(box.x0, wb.x0);
      box.x1 = Math.max(box.x1, wb.x1);
      box.z0 = Math.min(box.z0, wb.z0);
      box.z1 = Math.max(box.z1, wb.z1);
    }
    for (const o of wl.openings) {
      const c = o.c * MM, w = o.w * MM, mid = at + T / 2;
      if (o.kind === "window") {
        windows.push(wl.axis === "x" ? { x: c, z: mid, axis: "x", w, y0: (o.sill ?? 900) * MM, y1: (o.top ?? 2200) * MM } : { x: mid, z: c, axis: "z", w, y0: (o.sill ?? 900) * MM, y1: (o.top ?? 2200) * MM });
        continue;
      }
      if (o.kind === "door") leaves.push(wl.axis === "x" ? { hx: c - w / 2, hz: mid, axis: "x", w, swing: o.swing ?? 1 } : { hx: mid, hz: c - w / 2, axis: "z", w, swing: o.swing ?? 1 });
      // which regions does this opening join?
      const [px, pz] = wl.axis === "x" ? [c, mid] : [mid, c];
      const [nx, nz] = wl.axis === "x" ? [0, 1] : [1, 0];
      const ra = regionOf(px - nx * 0.4, pz - nz * 0.4);
      const rb = regionOf(px + nx * 0.4, pz + nz * 0.4);
      if (ra > -2 && rb > -2 && ra !== rb) portals.push({ a: ra, b: rb, x: px, z: pz, nx, nz });
    }
  }
  const sp = home.spawn;
  return { H, box, rooms, halls, walls, leaves, windows, portals, spawn: { x: sp.x * MM, z: sp.z * MM, yaw: sp.yaw } };
}

/** Which region a point is in: a room index, or -1 for the hall (and anywhere else). */
export function regionAt(plan: HomePlan, x: number, z: number) {
  const i = plan.rooms.findIndex((r) => inRect(r, x, z, 0.07));
  return i;
}

/** Waypoints from one point to another through doorways (breadth-first over regions). */
export function route(plan: HomePlan, from: [number, number], to: [number, number]): [number, number][] {
  const a = regionAt(plan, from[0], from[1]);
  const b = regionAt(plan, to[0], to[1]);
  if (a === b) return [to];
  const prev = new Map<number, { via: Portal; from: number }>();
  const seen = new Set([a]);
  const q = [a];
  while (q.length) {
    const r = q.shift()!;
    if (r === b) break;
    for (const p of plan.portals) {
      const other = p.a === r ? p.b : p.b === r ? p.a : null;
      if (other === null || seen.has(other)) continue;
      seen.add(other);
      prev.set(other, { via: p, from: r });
      q.push(other);
    }
  }
  if (!prev.has(b)) return [to];
  const chain: { p: Portal; dir: number }[] = [];
  let cur = b;
  while (cur !== a) {
    const s = prev.get(cur)!;
    chain.unshift({ p: s.via, dir: s.via.a === s.from ? 1 : -1 });
    cur = s.from;
  }
  const pts: [number, number][] = [];
  for (const { p, dir } of chain) {
    pts.push([p.x - p.nx * 0.55 * dir, p.z - p.nz * 0.55 * dir]);
    pts.push([p.x + p.nx * 0.55 * dir, p.z + p.nz * 0.55 * dir]);
  }
  pts.push(to);
  return pts;
}

/** Solid footprints the walker can't pass through: walls (below head height) and furniture. */
export function obstacles(plan: HomePlan, room: RoomSpec): Rect[] {
  const out: Rect[] = [];
  for (const w of plan.walls) if (w.y0 < 1.2) out.push({ x0: w.x0, x1: w.x1, z0: w.z0, z1: w.z1 });
  for (const p of room.panels) {
    const solid = p.staging === "carcass" || p.staging === "worktop" || p.zone === "islandEnds" || p.zone === "gables" || p.zone === "kickplate" || p.door;
    if (!solid) continue;
    const yb = (p.pos[1] - p.size[1] / 2) * MM;
    if (yb > 1.3) continue; // wall units are above head... of the hips; walk under them
    const [w, , d] = p.size;
    const q = Math.abs(Math.sin(p.rotY)) > 0.5;
    const hw = ((q ? d : w) / 2) * MM, hd = ((q ? w : d) / 2) * MM;
    out.push({ x0: p.pos[0] * MM - hw, x1: p.pos[0] * MM + hw, z0: p.pos[2] * MM - hd, z1: p.pos[2] * MM + hd });
  }
  const FOOT: Partial<Record<string, [number, number]>> = { sofa: [2.5, 0.95], bed: [1.9, 2.2], armchair: [0.8, 0.8], coffeeTable: [1.1, 0.6], bench: [1.3, 0.42], console: [1.3, 0.38], stool: [0.36, 0.36], plant: [0.45, 0.45], floorLamp: [0.35, 0.35] };
  for (const pr of room.props) {
    const f = FOOT[pr.kind];
    if (!f || (pr.kind === "plant" && pr.pos[1] > 100)) continue;
    const span = pr.kind === "sofa" && pr.span ? pr.span * MM : f[0];
    const q = Math.abs(Math.sin(pr.rotY)) > 0.5;
    const hw = (q ? f[1] : span) / 2, hd = (q ? span : f[1]) / 2;
    out.push({ x0: pr.pos[0] * MM - hw, x1: pr.pos[0] * MM + hw, z0: pr.pos[2] * MM - hd, z1: pr.pos[2] * MM + hd });
  }
  return out;
}

/** Push a circle (the visitor) out of every obstacle it overlaps. */
export function collide(x: number, z: number, r: number, rects: Rect[]): [number, number] {
  for (let iter = 0; iter < 3; iter++) {
    let moved = false;
    for (const b of rects) {
      const cx = Math.max(b.x0, Math.min(x, b.x1));
      const cz = Math.max(b.z0, Math.min(z, b.z1));
      const dx = x - cx, dz = z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-9) {
        const d = Math.sqrt(d2);
        x = cx + (dx / d) * r;
        z = cz + (dz / d) * r;
      } else {
        // centre inside the box: leave by the nearest side
        const opts = [
          [b.x0 - r - x, 0],
          [b.x1 + r - x, 0],
          [0, b.z0 - r - z],
          [0, b.z1 + r - z],
        ].sort((p, q) => Math.hypot(p[0], p[1]) - Math.hypot(q[0], q[1]));
        x += opts[0][0];
        z += opts[0][1];
      }
      moved = true;
    }
    if (!moved) break;
  }
  return [x, z];
}
