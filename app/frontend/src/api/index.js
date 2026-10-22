// The single seam between the UI and "the backend".
//
// By default every call goes over HTTP to the real FastAPI service. A build with
// VITE_DEMO=true swaps the transport for the in-browser simulator. Nothing else in
// the UI knows or cares which one it is talking to.
import { httpRequest } from "./http";
import { simulatorRequest, resetSimulator, DEMO_CREDENTIALS } from "./simulator";
import { recordActivity } from "./activity";

export const isDemo = import.meta.env.VITE_DEMO === "true";
const transport = isDemo ? simulatorRequest : httpRequest;

export { DEMO_CREDENTIALS };
export const resetDemoData = resetSimulator;

export class ApiError extends Error {
  constructor(status, detail) {
    super(typeof detail === "string" ? detail : "Request failed");
    this.status = status;
    this.detail = detail;
  }
}

const TOKEN_KEY = "token";
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const SESSION_EXPIRED_EVENT = "portal:session-expired";

function redact(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return value;
  const copy = { ...value };
  if ("password" in copy) copy.password = "••••••••";
  if ("access_token" in copy) copy.access_token = `${String(copy.access_token).slice(0, 12)}…`;
  return copy;
}

async function call(method, path, { query, body, form, signal } = {}) {
  const started = performance.now();
  let result;
  try {
    result = await transport(method, path, { query, body, form, token: tokenStore.get(), signal });
  } catch (error) {
    if (error.name !== "AbortError") {
      recordActivity({ method, path, query, status: 0, ms: 0, request: redact(body ?? form), response: { detail: "Network error" } });
    }
    throw error;
  }
  const ms = Math.round(performance.now() - started);
  recordActivity({
    method,
    path,
    query,
    status: result.status,
    ms,
    request: redact(body ?? form),
    response: redact(result.data),
  });
  if (result.status === 401 && path !== "/auth/login") {
    tokenStore.clear();
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  if (result.status >= 400) throw new ApiError(result.status, result.data?.detail);
  return result.data;
}

export const api = {
  login: (username, password) => call("POST", "/auth/login", { form: { username, password } }),
  listEmployees: ({ search, department, signal } = {}) =>
    call("GET", "/employees", { query: { search, department }, signal }),
  getEmployee: (id) => call("GET", `/employees/${id}`),
  createEmployee: (data) => call("POST", "/employees", { body: data }),
  updateEmployee: (id, data) => call("PUT", `/employees/${id}`, { body: data }),
  deleteEmployee: (id) => call("DELETE", `/employees/${id}`),
};
