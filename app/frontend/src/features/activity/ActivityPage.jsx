import { useState } from "react";
import { Link } from "react-router-dom";
import { clearActivity, useActivity } from "../../api/activity";

function describe(entry) {
  const { method, path, status } = entry;
  if (status === 0) return "Request failed before reaching the API";
  if (path === "/auth/login") return status === 200 ? "Signed in; a bearer token was issued" : "Sign-in rejected";
  if (status === 401) return "Rejected: missing or expired token";
  if (status === 422) return "Rejected: the data failed validation";
  if (status === 404) return "No such record";
  if (method === "GET" && path === "/employees") {
    const q = entry.query ?? {};
    const parts = [q.search && `name contains “${q.search}”`, q.department && `department is ${q.department}`].filter(Boolean);
    const n = Array.isArray(entry.response) ? entry.response.length : "?";
    return parts.length ? `Listed ${n} people where ${parts.join(" and ")}` : `Listed all ${n} people`;
  }
  if (method === "GET") return "Read one record";
  if (method === "POST") return `Created record #${entry.response?.id} (${entry.response?.name})`;
  if (method === "PUT") return `Updated record #${entry.response?.id} (${entry.response?.name})`;
  if (method === "DELETE") return `Deleted record ${path.split("/").pop()}`;
  return "";
}

const recordId = (entry) => (entry.status < 300 && (entry.response?.id ?? Number(entry.path.split("/")[2]))) || null;
const isWrite = (entry) => entry.method !== "GET" && entry.path !== "/auth/login";

function Json({ label, value }) {
  return (
    <div>
      <h4>{label}</h4>
      <pre>{value === undefined || value === null ? "(empty)" : JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}

export function ActivityPage() {
  const entries = useActivity();
  const [openId, setOpenId] = useState(null);
  const [writesOnly, setWritesOnly] = useState(false);
  const shown = writesOnly ? entries.filter(isWrite) : entries;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">This session</p>
          <h1>Activity</h1>
          <p className="page-lede">
            Every API call the interface has made in this browser tab, with the data that went out and came back.
            Passwords are masked and tokens are shortened. It is not stored anywhere and clears on reload.
          </p>
        </div>
        <div className="head-actions">
          <label className="check">
            <input type="checkbox" checked={writesOnly} onChange={(e) => setWritesOnly(e.target.checked)} />
            <span>Changes only</span>
          </label>
          <button className="btn" onClick={clearActivity} disabled={entries.length === 0}>
            Clear log
          </button>
        </div>
      </header>

      {shown.length === 0 ? (
        <div className="empty-state">
          <h2>Nothing here yet.</h2>
          <p>
            {writesOnly ? "No changes have been made in this session." : "Make a change in the "}
            {!writesOnly && <Link to="/">directory</Link>}
            {!writesOnly && " and it will appear here."}
          </p>
        </div>
      ) : (
        <ol className="log" aria-label="API calls, newest first">
          {shown.map((entry, i) => {
            const open = openId === entry.id;
            const id = recordId(entry);
            return (
              <li key={entry.id} className={`log-row${open ? " is-open" : ""}`} style={{ "--i": Math.min(i, 12) }}>
                <button className="log-summary" aria-expanded={open} aria-controls={`log-${entry.id}`} onClick={() => setOpenId(open ? null : entry.id)}>
                  <time className="mono log-time" dateTime={new Date(entry.at).toISOString()}>
                    {new Date(entry.at).toLocaleTimeString("en-GB")}
                  </time>
                  <span className={`method method-${entry.method}`}>{entry.method}</span>
                  <span className="mono log-path">/api{entry.path}</span>
                  <span className={`status status-${Math.floor(entry.status / 100)}`}>{entry.status || "ERR"}</span>
                  <span className="log-what">{describe(entry)}</span>
                  <span className="mono log-ms">{entry.ms} ms</span>
                </button>
                {open && (
                  <div className="log-detail" id={`log-${entry.id}`}>
                    <Json label="Request" value={entry.query && Object.values(entry.query).some(Boolean) ? { query: entry.query, body: entry.request } : entry.request} />
                    <Json label="Response" value={entry.response} />
                    {isWrite(entry) && id && entry.method !== "DELETE" && entry.status < 300 && (
                      <Link className="btn" to="/" state={{ focusId: id }}>
                        Show record #{id}
                      </Link>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
