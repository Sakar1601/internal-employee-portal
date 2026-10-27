import { describe, expect, it } from "vitest";
import { filterCommands } from "./commands";

const cmds = [
  { id: "a", label: "Add employee", group: "Actions" },
  { id: "b", label: "Go to Activity", group: "Actions", keywords: "log api" },
  { id: "p1", label: "Amara Okafor", hint: "Engineering", group: "People" },
];

describe("filterCommands", () => {
  it("shows only actions for an empty query", () => {
    expect(filterCommands(cmds, "").map((c) => c.id)).toEqual(["a", "b"]);
  });
  it("matches every word against label, hint and keywords", () => {
    expect(filterCommands(cmds, "okafor eng").map((c) => c.id)).toEqual(["p1"]);
    expect(filterCommands(cmds, "api").map((c) => c.id)).toEqual(["b"]);
  });
  it("returns nothing when no word matches", () => {
    expect(filterCommands(cmds, "zzz")).toEqual([]);
  });
});
