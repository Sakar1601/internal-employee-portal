import { describe, expect, it } from "vitest";
import { employeesToCsv } from "./csv";
import { sortEmployees } from "./sort";

const people = [
  { id: 1, name: "Bea", department: "Finance", start_date: "2020-01-01" },
  { id: 2, name: "Al", department: "Engineering", start_date: "2024-06-01" },
  { id: 3, name: "Cy", department: "Engineering", start_date: "2018-03-01" },
];

describe("sortEmployees", () => {
  it("sorts by name both ways", () => {
    expect(sortEmployees(people, "name", "asc").map((p) => p.name)).toEqual(["Al", "Bea", "Cy"]);
    expect(sortEmployees(people, "name", "desc").map((p) => p.name)).toEqual(["Cy", "Bea", "Al"]);
  });
  it("sorts by department then name", () => {
    expect(sortEmployees(people, "department", "asc").map((p) => p.name)).toEqual(["Al", "Cy", "Bea"]);
  });
  it("treats tenure ascending as most recent hire first", () => {
    expect(sortEmployees(people, "tenure", "asc").map((p) => p.name)).toEqual(["Al", "Bea", "Cy"]);
    expect(sortEmployees(people, "start_date", "asc").map((p) => p.name)).toEqual(["Cy", "Bea", "Al"]);
  });
  it("does not mutate its input", () => {
    const copy = [...people];
    sortEmployees(people, "name", "desc");
    expect(people).toEqual(copy);
  });
});

describe("employeesToCsv", () => {
  it("writes a header and CRLF rows", () => {
    expect(employeesToCsv(people.slice(0, 1))).toBe("id,name,department,start_date\r\n1,Bea,Finance,2020-01-01\r\n");
  });
  it("quotes commas and quotes", () => {
    expect(employeesToCsv([{ id: 1, name: 'Ann "AJ", Jr', department: "X", start_date: "2020-01-01" }])).toContain('"Ann ""AJ"", Jr"');
  });
  it("neutralises spreadsheet formulas", () => {
    expect(employeesToCsv([{ id: 1, name: "=HYPERLINK(1)", department: "X", start_date: "2020-01-01" }])).toContain("'=HYPERLINK(1)");
  });
});
