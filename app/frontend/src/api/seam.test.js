import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The seam picks its transport from VITE_DEMO at build time; re-import per mode.
async function loadSeam(demo) {
  vi.resetModules();
  vi.stubEnv("VITE_DEMO", demo ? "true" : "false");
  return import("./index.js");
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllEnvs());

describe("demo mode", () => {
  it("runs the whole flow against the simulator with no fetch calls", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { api, isDemo, tokenStore, DEMO_CREDENTIALS } = await loadSeam(true);
    expect(isDemo).toBe(true);
    const { access_token } = await api.login(DEMO_CREDENTIALS.username, DEMO_CREDENTIALS.password);
    tokenStore.set(access_token);
    const created = await api.createEmployee({ name: "Test Person", department: "QA", start_date: "2026-03-02" });
    expect((await api.listEmployees({ search: "test person" })).map((e) => e.id)).toContain(created.id);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("signals expired sessions", async () => {
    const { api, tokenStore, ApiError, SESSION_EXPIRED_EVENT } = await loadSeam(true);
    const expired = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);
    tokenStore.set("stale");
    await expect(api.listEmployees()).rejects.toBeInstanceOf(ApiError);
    expect(expired).toHaveBeenCalledTimes(1);
    expect(tokenStore.get()).toBeNull();
    window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
  });

  it("logs each call to the activity store with secrets redacted", async () => {
    const { api, DEMO_CREDENTIALS } = await loadSeam(true);
    const { getActivity } = await import("./activity.js");
    await api.login(DEMO_CREDENTIALS.username, DEMO_CREDENTIALS.password);
    const [entry] = getActivity();
    expect(entry).toMatchObject({ method: "POST", path: "/auth/login", status: 200 });
    expect(JSON.stringify(entry)).not.toContain(DEMO_CREDENTIALS.password);
    expect(entry.response.access_token).toMatch(/…$/);
  });

  it("throws ApiError with the backend's detail on bad credentials", async () => {
    const { api } = await loadSeam(true);
    await expect(api.login("admin", "wrong")).rejects.toMatchObject({ status: 401, message: "Incorrect username or password" });
  });
});

describe("live mode", () => {
  it("sends real HTTP requests to /api with the bearer token", async () => {
    const { api, tokenStore } = await loadSeam(false);
    tokenStore.set("abc");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    await api.listEmployees({ search: "ann", department: "" });
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/employees\?search=ann$/);
    expect(init.headers.Authorization).toBe("Bearer abc");
    fetchSpy.mockRestore();
  });

  it("encodes the login as a form post like the OAuth2 password flow expects", async () => {
    const { api } = await loadSeam(false);
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ access_token: "t", token_type: "bearer" }), { status: 200 }));
    await api.login("admin", "pw");
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/auth\/login$/);
    expect(init.body.toString()).toBe("username=admin&password=pw");
    fetchSpy.mockRestore();
  });
});
