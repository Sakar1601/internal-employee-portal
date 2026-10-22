import { beforeEach, describe, expect, it } from "vitest";
import { createSimulator, DEMO_CREDENTIALS } from "./simulator";

let sim;
let clock;
const memoryStorage = () => {
  const map = new Map();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) };
};

async function login(creds = DEMO_CREDENTIALS) {
  return sim.request("POST", "/auth/login", { form: creds });
}
async function token() {
  return (await login()).data.access_token;
}

beforeEach(() => {
  clock = Date.now();
  sim = createSimulator({ storage: memoryStorage(), latency: 0, now: () => clock });
});

describe("auth", () => {
  it("accepts the demo credentials and issues a bearer token", async () => {
    const res = await login();
    expect(res.status).toBe(200);
    expect(res.data.token_type).toBe("bearer");
    expect(res.data.access_token.split(".")).toHaveLength(3);
  });

  it("rejects wrong credentials with the backend's message", async () => {
    const res = await login({ username: "admin", password: "nope" });
    expect(res).toEqual({ status: 401, data: { detail: "Incorrect username or password" } });
  });

  it("protects every employee route", async () => {
    for (const [method, path] of [["GET", "/employees"], ["POST", "/employees"], ["GET", "/employees/1"], ["DELETE", "/employees/1"]]) {
      expect((await sim.request(method, path, {})).status).toBe(401);
    }
    expect((await sim.request("GET", "/employees", { token: "garbage" })).status).toBe(401);
  });

  it("expires tokens after an hour", async () => {
    const t = await token();
    expect((await sim.request("GET", "/employees", { token: t })).status).toBe(200);
    clock += 60 * 60 * 1000 + 1000;
    expect((await sim.request("GET", "/employees", { token: t })).status).toBe(401);
  });
});

describe("employees", () => {
  it("lists seeded people ordered by name", async () => {
    const { data } = await sim.request("GET", "/employees", { token: await token() });
    expect(data.length).toBeGreaterThan(20);
    const names = data.map((e) => e.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("searches names case-insensitively and treats % literally", async () => {
    const t = await token();
    const hit = await sim.request("GET", "/employees", { token: t, query: { search: "amara" } });
    expect(hit.data.map((e) => e.name)).toEqual(["Amara Okafor"]);
    const wild = await sim.request("GET", "/employees", { token: t, query: { search: "%" } });
    expect(wild.data).toEqual([]);
  });

  it("filters by exact department and paginates", async () => {
    const t = await token();
    const eng = await sim.request("GET", "/employees", { token: t, query: { department: "Engineering" } });
    expect(new Set(eng.data.map((e) => e.department))).toEqual(new Set(["Engineering"]));
    const page = await sim.request("GET", "/employees", { token: t, query: { limit: 2, offset: 1 } });
    expect(page.data).toHaveLength(2);
    expect((await sim.request("GET", "/employees", { token: t, query: { limit: 0 } })).status).toBe(422);
  });

  it("creates, reads, updates and deletes a record with real state changes", async () => {
    const t = await token();
    const before = (await sim.request("GET", "/employees", { token: t })).data.length;
    const created = await sim.request("POST", "/employees", {
      token: t,
      body: { name: "  Grace Hopper ", department: "Engineering", start_date: "2026-01-05" },
    });
    expect(created.status).toBe(201);
    expect(created.data.name).toBe("Grace Hopper");

    const id = created.data.id;
    expect((await sim.request("GET", `/employees/${id}`, { token: t })).data.department).toBe("Engineering");
    expect((await sim.request("GET", "/employees", { token: t })).data).toHaveLength(before + 1);

    const updated = await sim.request("PUT", `/employees/${id}`, {
      token: t,
      body: { name: "Grace Hopper", department: "Finance", start_date: "2026-01-05" },
    });
    expect(updated.data.department).toBe("Finance");

    expect((await sim.request("DELETE", `/employees/${id}`, { token: t })).status).toBe(204);
    expect((await sim.request("GET", `/employees/${id}`, { token: t })).status).toBe(404);
    expect((await sim.request("GET", "/employees", { token: t })).data).toHaveLength(before);
  });

  it("never reuses ids", async () => {
    const t = await token();
    const body = { name: "A", department: "B", start_date: "2026-01-05" };
    const a = (await sim.request("POST", "/employees", { token: t, body })).data.id;
    await sim.request("DELETE", `/employees/${a}`, { token: t });
    const b = (await sim.request("POST", "/employees", { token: t, body })).data.id;
    expect(b).toBeGreaterThan(a);
  });

  it("mirrors the backend's validation (422 with FastAPI-shaped detail)", async () => {
    const t = await token();
    const cases = [
      { name: "", department: "Eng", start_date: "2026-01-05" },
      { name: "   ", department: "Eng", start_date: "2026-01-05" },
      { name: "x".repeat(201), department: "Eng", start_date: "2026-01-05" },
      { name: "Ok", department: "d".repeat(101), start_date: "2026-01-05" },
      { name: "Ok", department: "Eng", start_date: "2026-02-31" },
      { name: "Ok", department: "Eng" },
    ];
    for (const body of cases) {
      const res = await sim.request("POST", "/employees", { token: t, body });
      expect(res.status).toBe(422);
      expect(res.data.detail[0].loc[0]).toBe("body");
    }
  });

  it("404s for unknown ids and persists across simulator instances sharing storage", async () => {
    const storage = memoryStorage();
    const a = createSimulator({ storage, latency: 0, now: () => clock });
    const t = (await a.request("POST", "/auth/login", { form: DEMO_CREDENTIALS })).data.access_token;
    expect((await a.request("PUT", "/employees/9999", { token: t, body: {} })).status).toBe(404);
    await a.request("POST", "/employees", { token: t, body: { name: "Persisted", department: "X", start_date: "2026-01-05" } });
    const b = createSimulator({ storage, latency: 0, now: () => clock });
    const list = await b.request("GET", "/employees", { token: t, query: { search: "Persisted" } });
    expect(list.data).toHaveLength(1);
  });

  it("reset restores the seed data", async () => {
    const t = await token();
    const seeded = (await sim.request("GET", "/employees", { token: t })).data.length;
    await sim.request("DELETE", "/employees/1", { token: t });
    sim.reset();
    expect((await sim.request("GET", "/employees", { token: t })).data).toHaveLength(seeded);
  });
});
