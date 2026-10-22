import { describe, expect, it } from "vitest";
import { formatDate, formatTenure, pluralize, tenureYears } from "./format";

const NOW = Date.UTC(2026, 5, 15);

describe("format", () => {
  it("formats ISO dates without timezone drift", () => {
    expect(formatDate("2017-03-06")).toBe("6 Mar 2017");
    expect(formatDate("2026-01-01")).toBe("1 Jan 2026");
  });
  it("describes tenure in years and months", () => {
    expect(formatTenure("2020-06-15", NOW)).toBe("6 yr");
    expect(formatTenure("2020-03-15", NOW)).toBe("6 yr 3 mo");
    expect(formatTenure("2026-03-15", NOW)).toBe("3 mo");
  });
  it("never reports negative tenure for future start dates", () => {
    expect(tenureYears("2030-01-01", NOW)).toBe(0);
  });
  it("pluralizes", () => {
    expect(pluralize(1, "person", "people")).toBe("1 person");
    expect(pluralize(2, "department")).toBe("2 departments");
  });
});
