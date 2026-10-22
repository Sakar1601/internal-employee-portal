// Live transport: talks to the real FastAPI backend under /api.
// Returns { status, data } and never throws on HTTP errors; the seam in index.js does that.
const API_BASE = "/api";

export async function httpRequest(method, path, { query, body, form, token, signal } = {}) {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  }
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) {
    payload = new URLSearchParams(form);
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const resp = await fetch(url, { method, headers, body: payload, signal });
  const text = await resp.text();
  return { status: resp.status, data: text ? JSON.parse(text) : null };
}
