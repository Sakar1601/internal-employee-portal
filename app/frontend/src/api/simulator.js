// In-browser stand-in for the FastAPI backend, used only by the static demo build.
// It implements the same contract as app/backend (routes, auth, validation rules,
// status codes, ordering) so the UI exercises real flows. Nothing here talks to a network.

export const DEMO_CREDENTIALS = { username: "admin", password: "demo-password" };

const STORAGE_KEY = "portal-demo-db-v1";
const TOKEN_TTL_MS = 60 * 60 * 1000;

const SEED = [
  ["Amara Okafor", "Engineering", "2017-03-06"],
  ["Daniel Reyes", "Engineering", "2019-08-19"],
  ["Mei Lin Zhao", "Engineering", "2021-01-11"],
  ["Tobias Brandt", "Engineering", "2022-06-27"],
  ["Priya Raman", "Engineering", "2024-02-05"],
  ["Jonas Lindqvist", "Engineering", "2025-03-17"],
  ["Hannah Cole", "Platform & Security", "2016-10-03"],
  ["Rafael Duarte", "Platform & Security", "2018-05-14"],
  ["Ngozi Adeyemi", "Platform & Security", "2020-09-21"],
  ["Samuel Weiss", "Platform & Security", "2023-04-10"],
  ["Ines Marchetti", "Finance", "2017-07-24"],
  ["Kwame Mensah", "Finance", "2019-11-04"],
  ["Olivia Hart", "Finance", "2022-01-31"],
  ["Viktor Novak", "Finance", "2024-09-16"],
  ["Leila Haddad", "People Ops", "2018-02-12"],
  ["Marcus Bell", "People Ops", "2020-03-02"],
  ["Sofia Petrov", "People Ops", "2023-10-09"],
  ["Anil Kapoor", "People Ops", "2025-01-13"],
  ["Elena Rossi", "Legal & Compliance", "2016-04-18"],
  ["Thomas Grant", "Legal & Compliance", "2019-06-03"],
  ["Yuki Tanaka", "Legal & Compliance", "2021-09-13"],
  ["Beatrice Owusu", "Legal & Compliance", "2024-05-20"],
  ["Carlos Medina", "Facilities", "2017-11-27"],
  ["Freya Nilsson", "Facilities", "2020-07-06"],
  ["Idris Bakr", "Facilities", "2022-10-24"],
  ["Nadia Volkova", "Facilities", "2025-06-02"],
];

function seedDb() {
  const employees = [...SEED]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, department, start_date], i) => ({ id: i + 1, name, department, start_date }));
  return { nextId: employees.length + 1, employees };
}

const b64 = (obj) => btoa(JSON.stringify(obj)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
const unb64 = (str) => JSON.parse(atob(str.replace(/-/g, "+").replace(/_/g, "/")));

function problem(status, detail) {
  return { status, data: { detail } };
}

function validate(body) {
  const errors = [];
  const rules = [
    ["name", 200],
    ["department", 100],
  ];
  for (const [field, max] of rules) {
    const raw = body?.[field];
    if (typeof raw !== "string") {
      errors.push({ type: "string_type", loc: ["body", field], msg: "Input should be a valid string" });
      continue;
    }
    const value = raw.trim();
    if (value.length < 1) {
      errors.push({ type: "string_too_short", loc: ["body", field], msg: "String should have at least 1 character" });
    } else if (value.length > max) {
      errors.push({ type: "string_too_long", loc: ["body", field], msg: `String should have at most ${max} characters` });
    }
  }
  const date = body?.start_date;
  const valid =
    typeof date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    new Date(`${date}T00:00:00Z`).toISOString().startsWith(date);
  if (!valid) {
    errors.push({ type: "date_from_datetime_parsing", loc: ["body", "start_date"], msg: "Input should be a valid date" });
  }
  if (errors.length) return { errors };
  return {
    value: { name: body.name.trim(), department: body.department.trim(), start_date: body.start_date },
  };
}

export function createSimulator({ storage, latency = [90, 260], now = () => Date.now() } = {}) {
  let store = storage;
  if (store === undefined) {
    try {
      store = window.sessionStorage;
    } catch {
      store = null;
    }
  }
  let memory = null;

  function load() {
    if (memory) return memory;
    try {
      const raw = store?.getItem(STORAGE_KEY);
      if (raw) {
        memory = JSON.parse(raw);
        return memory;
      }
    } catch {
      /* fall through to a fresh seed */
    }
    memory = seedDb();
    return memory;
  }

  function save() {
    try {
      store?.setItem(STORAGE_KEY, JSON.stringify(memory));
    } catch {
      /* private mode: state lives for this page only */
    }
  }

  function authenticate(token) {
    if (!token) return false;
    try {
      const [, payload] = token.split(".");
      const { sub, exp } = unb64(payload);
      return Boolean(sub) && exp * 1000 > now();
    } catch {
      return false;
    }
  }

  const unauthorized = () => problem(401, "Could not validate credentials");

  function route(method, path, { query = {}, body, form, token }) {
    if (method === "POST" && path === "/auth/login") {
      const { username, password } = form ?? {};
      if (username !== DEMO_CREDENTIALS.username || password !== DEMO_CREDENTIALS.password) {
        return problem(401, "Incorrect username or password");
      }
      const exp = Math.floor((now() + TOKEN_TTL_MS) / 1000);
      const access_token = `${b64({ alg: "none", typ: "SIMULATED" })}.${b64({ sub: username, exp })}.simulated`;
      return { status: 200, data: { access_token, token_type: "bearer" } };
    }

    if (!path.startsWith("/employees")) return problem(404, "Not Found");
    if (!authenticate(token)) return unauthorized();

    const db = load();
    const idMatch = path.match(/^\/employees\/(\d+)$/);

    if (path === "/employees" && method === "GET") {
      const search = (query.search ?? "").toLowerCase();
      const limit = query.limit === undefined ? 500 : Number(query.limit);
      const offset = query.offset === undefined ? 0 : Number(query.offset);
      if (!Number.isInteger(limit) || limit < 1 || limit > 1000 || !Number.isInteger(offset) || offset < 0) {
        return problem(422, [{ type: "int_range", loc: ["query", "limit"], msg: "Input out of range" }]);
      }
      const rows = db.employees
        .filter((e) => !search || e.name.toLowerCase().includes(search))
        .filter((e) => !query.department || e.department === query.department)
        .sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id)
        .slice(offset, offset + limit);
      return { status: 200, data: rows.map((e) => ({ ...e })) };
    }

    if (path === "/employees" && method === "POST") {
      const checked = validate(body);
      if (checked.errors) return problem(422, checked.errors);
      const employee = { id: db.nextId++, ...checked.value };
      db.employees.push(employee);
      save();
      return { status: 201, data: { ...employee } };
    }

    if (idMatch) {
      const id = Number(idMatch[1]);
      const index = db.employees.findIndex((e) => e.id === id);
      if (index === -1) return problem(404, "Employee not found");
      if (method === "GET") return { status: 200, data: { ...db.employees[index] } };
      if (method === "PUT") {
        const checked = validate(body);
        if (checked.errors) return problem(422, checked.errors);
        db.employees[index] = { id, ...checked.value };
        save();
        return { status: 200, data: { ...db.employees[index] } };
      }
      if (method === "DELETE") {
        db.employees.splice(index, 1);
        save();
        return { status: 204, data: null };
      }
    }
    return problem(405, "Method Not Allowed");
  }

  async function request(method, path, options = {}) {
    const [min, max] = Array.isArray(latency) ? latency : [latency, latency];
    const wait = max > 0 ? min + Math.random() * (max - min) : 0;
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    return route(method, path, options);
  }

  function reset() {
    memory = seedDb();
    save();
  }

  return { request, reset };
}

const instance = createSimulator();
export const simulatorRequest = instance.request;
export const resetSimulator = instance.reset;
