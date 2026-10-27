import { describe, expect, it } from "vitest";
import { deptHue } from "./departments";

describe("deptHue", () => {
  it("is deterministic", () => {
    expect(deptHue("Engineering")).toBe(deptHue("Engineering"));
  });
  it("gives the seeded departments distinct hues", () => {
    const names = ["Engineering", "Platform & Security", "Finance", "People Ops", "Legal & Compliance", "Facilities"];
    const hues = names.map(deptHue);
    expect(new Set(hues).size).toBe(6);
    for (const a of hues) for (const b of hues) if (a !== b) expect(Math.min(Math.abs(a - b), 360 - Math.abs(a - b))).toBeGreaterThanOrEqual(40);
  });
});
