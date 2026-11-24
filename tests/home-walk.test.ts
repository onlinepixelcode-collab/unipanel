import { describe, expect, test } from "vitest";
import { buildRoom } from "@/lib/studio/layout";
import { DEFAULT_SCHEME } from "@/lib/studio/scheme";
import { collide, homePlan, obstacles, regionAt, route } from "@/lib/studio/homePlan";

const room = buildRoom({ ...DEFAULT_SCHEME, scene: "home" });
const plan = homePlan(room)!;
const rects = obstacles(plan, room);

/** Walk a route in small steps with collision, as the walker does. Returns where it ended. */
function walk(from: [number, number], to: [number, number]) {
  let [x, z] = from;
  for (const wp of route(plan, from, to)) {
    for (let i = 0; i < 3000; i++) {
      const dx = wp[0] - x, dz = wp[1] - z;
      const d = Math.hypot(dx, dz);
      if (d < 0.05) break;
      const s = Math.min(0.03, d);
      [x, z] = collide(x + (dx / d) * s, z + (dz / d) * s, 0.26, rects);
    }
  }
  return [x, z] as [number, number];
}

describe("walkable home", () => {
  test("is a compact house: two wings around a central hall, not a row of rooms", () => {
    expect(plan.rooms.map((r) => r.name)).toEqual(["Bedroom", "Walk-in wardrobe", "Bathroom", "Kitchen", "Lounge", "Entrance"]);
    const w = plan.box.x1 - plan.box.x0, d = plan.box.z1 - plan.box.z0;
    expect(w / d).toBeLessThan(1.5);
    expect(plan.halls).toHaveLength(1);
  });

  test("the visitor starts inside the front door, clear of everything", () => {
    expect(plan.rooms[regionAt(plan, plan.spawn.x, plan.spawn.z)].name).toBe("Entrance");
    const [x, z] = collide(plan.spawn.x, plan.spawn.z, 0.26, rects);
    expect(Math.hypot(x - plan.spawn.x, z - plan.spawn.z)).toBeLessThan(0.001);
  });

  test("every room's viewpoint is clear and can be walked to from the front door", () => {
    plan.rooms.forEach((r, i) => {
      const [cx, cz] = collide(r.view.x, r.view.z, 0.26, rects);
      expect(Math.hypot(cx - r.view.x, cz - r.view.z), `${r.name} viewpoint blocked`).toBeLessThan(0.05);
      const end = walk([plan.spawn.x, plan.spawn.z], [r.view.x, r.view.z]);
      expect(regionAt(plan, end[0], end[1]), r.name).toBe(i);
    });
  });

  test("walls are solid: walking at the wardrobe/bathroom partition does not pass through it", () => {
    const r = plan.rooms[1];
    let [x, z] = [r.x1 - 0.6, r.z1 - 1.0];
    for (let i = 0; i < 200; i++) [x, z] = collide(x + 0.03, z, 0.26, rects);
    expect(regionAt(plan, x, z)).toBe(1);
  });
});
