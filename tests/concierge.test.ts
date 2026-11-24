import { describe, it, expect } from "vitest";
import { answerLocally, findFinishes } from "@/lib/concierge/brain";

describe("concierge brain", () => {
  it("finds finishes by name and code", () => {
    expect(findFinishes("calacatta please")[0]?.id).toBe("calacatta-bianco");
    expect(findFinishes("do you have 8102")[0]?.id).toBe("black-8102");
    expect(findFinishes("nogal rosales 02 and black matte").map((f) => f.id)).toEqual(expect.arrayContaining(["nogal-rosales-02", "black-matte"]));
  });
  it("turns a sentence into Studio actions", () => {
    const r = answerLocally("Show me a dark island with a Calacatta splashback");
    const acts = (r.actions ?? []).filter((a) => a.name === "apply_finish").map((a) => `${a.input.zone}:${a.input.finishId}`);
    expect(acts).toEqual(expect.arrayContaining(["islandFronts:black-matte", "islandEnds:black-matte", "splashback:calacatta-bianco"]));
  });
  it("never invents prices", () => {
    const r = answerLocally("how much is calacatta per board?");
    expect(r.text).toMatch(/confirmed by our showroom/);
    expect(r.text).not.toMatch(/R\s?\d/);
  });
  it("answers specs from the brochure and handles follow-ups", () => {
    expect(answerLocally("board size of nogal rosales 02").text).toMatch(/2750 × 1240 × 18mm/);
    const r = answerLocally("add these to my sample box", ["verde-salvia", "kashmir"]);
    expect(r.actions?.[0]).toEqual({ name: "add_to_sample_box", input: { ids: ["verde-salvia", "kashmir"] } });
  });
  it("knows the showrooms", () => {
    expect(answerLocally("is durban open now?").cards).toEqual([{ type: "showroom", id: "dbn" }]);
  });
});
