import { describe, expect, test } from "vitest";
import { buildRoom } from "@/lib/studio/layout";
import { DEFAULT_SCHEME, type KitchenLayout, type SceneId } from "@/lib/studio/scheme";

const scenes: { scene: SceneId; layout?: KitchenLayout }[] = [
  { scene: "kitchen", layout: "island" },
  { scene: "kitchen", layout: "l" },
  { scene: "kitchen", layout: "peninsula" },
  { scene: "wardrobe" },
  { scene: "media" },
  { scene: "vanity" },
  { scene: "home" },
];

describe("room interaction data", () => {
  for (const s of scenes) {
    test(`${s.scene}${s.layout ? ` (${s.layout})` : ""}: every front opens, handles ride with it, ids are unique`, () => {
      const room = buildRoom({ ...DEFAULT_SCHEME, scene: s.scene, layout: s.layout ?? DEFAULT_SCHEME.layout });
      const fronts = room.panels.filter((p) => p.door);
      expect(fronts.length).toBeGreaterThan(0);
      for (const f of fronts) expect(f.motion?.kind).toMatch(/drawer|hinge-l|hinge-r/);
      const ids = room.panels.filter((p) => p.motion).map((p) => p.motion!.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const h of room.panels.filter((p) => p.staging === "handle")) expect(ids).toContain(h.moveWith);
      expect(room.props.length).toBeGreaterThan(0);
    });
  }

  test("kitchen taps turn on and the worktop is cut around the sink", () => {
    const room = buildRoom({ ...DEFAULT_SCHEME, scene: "kitchen", layout: "island" });
    expect(room.panels.some((p) => p.staging === "tap" && p.motion?.kind === "tap")).toBe(true);
    const sink = room.panels.find((p) => p.staging === "sink")!;
    const over = room.panels.filter(
      (p) => p.staging === "worktop" && Math.abs(p.pos[0] - sink.pos[0]) < (p.size[0] - 40) / 2 && Math.abs(p.pos[2] - sink.pos[2]) < (p.size[2] - 40) / 2,
    );
    expect(over).toHaveLength(0);
  });
});
