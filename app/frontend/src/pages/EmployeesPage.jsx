import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../api";
import { tenureYears, pluralize } from "../lib/format";
import { EmployeeTable } from "../components/EmployeeTable";
import { EmployeeForm } from "../components/EmployeeForm";
import { ConfirmDelete } from "../components/ConfirmDelete";
import { RosterTimeline } from "../components/RosterTimeline";
import { Stat } from "../components/Stat";
import { useToast } from "../components/toast";

const FLASH_MS = 2600;

export function EmployeesPage() {
  const [all, setAll] = useState([]);
  const [visible, setVisible] = useState([]);
  const [status, setStatus] = useState("loading");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [flashId, setFlashId] = useState(null);
  const toast = useToast();
  const location = useLocation();
  const filters = useRef({ search: "", department: "" });
  const controller = useRef(null);
  const flashTimer = useRef(null);

  const filtered = Boolean(search || department);

  const refresh = useCallback(async () => {
    const { search: s, department: d } = filters.current;
    controller.current?.abort();
    const ctl = new AbortController();
    controller.current = ctl;
    try {
      const everyone = await api.listEmployees({ signal: ctl.signal });
      const shown = s || d ? await api.listEmployees({ search: s, department: d, signal: ctl.signal }) : everyone;
      setAll(everyone);
      setVisible(shown);
      setStatus("ready");
      return everyone;
    } catch (err) {
      if (err.name === "AbortError") return null;
      setStatus("error");
      return null;
    }
  }, []);

  useEffect(() => () => controller.current?.abort(), []);

  // Load on mount and whenever a filter changes. Typing is debounced so a burst of
  // keystrokes is one request, and a newer request aborts the stale one.
  useEffect(() => {
    filters.current = { search, department };
    const id = setTimeout(refresh, search ? 160 : 0);
    return () => clearTimeout(id);
  }, [search, department, refresh]);

  const flash = useCallback((id) => {
    setFlashId(id);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashId(null), FLASH_MS);
  }, []);

  const reveal = useCallback(
    (id) => {
      setSearch("");
      setDepartment("");
      filters.current = { search: "", department: "" };
      refresh().then(() => {
        flash(id);
        requestAnimationFrame(() => {
          const row = document.getElementById(`employee-${id}`);
          row?.scrollIntoView({ block: "center", behavior: "smooth" });
          row?.querySelector("button")?.focus({ preventScroll: true });
        });
      });
    },
    [refresh, flash],
  );

  useEffect(() => {
    if (location.state?.focusId) reveal(location.state.focusId);
  }, [location.state, reveal]);

  const departments = useMemo(() => [...new Set(all.map((e) => e.department))].sort(), [all]);
  const avgTenure = all.length ? all.reduce((sum, e) => sum + tenureYears(e.start_date), 0) / all.length : 0;

  function summary(list) {
    const depts = new Set(list.map((e) => e.department)).size;
    return `${pluralize(list.length, "person", "people")} across ${pluralize(depts, "department")}`;
  }

  async function handleSave(data) {
    const wasEditing = editing;
    const saved = wasEditing ? await api.updateEmployee(wasEditing.id, data) : await api.createEmployee(data);
    setAdding(false);
    setEditing(null);
    const everyone = await refresh();
    flash(saved.id);
    toast({
      title: wasEditing ? `Updated ${saved.name}` : `Added ${saved.name}`,
      detail: wasEditing
        ? `Record #${saved.id} now reads ${saved.department}, started ${saved.start_date}.`
        : `Record #${saved.id} created in ${saved.department}. The registry now holds ${everyone ? summary(everyone) : "one more person"}.`,
      action: { label: "Show record", run: () => reveal(saved.id) },
    });
  }

  async function handleDelete() {
    const target = deleting;
    await api.deleteEmployee(target.id);
    setDeleting(null);
    const everyone = await refresh();
    toast({
      tone: "warn",
      title: `Deleted ${target.name}`,
      detail: `Record #${target.id} is gone. The registry now holds ${everyone ? summary(everyone) : "one fewer person"}.`,
    });
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">People registry</p>
          <h1>Directory</h1>
        </div>
        <section className="stats" aria-label="Directory summary">
          <Stat value={visible.length} label={filtered ? "People shown" : "People"} />
          <Stat value={new Set(visible.map((e) => e.department)).size} label="Departments" />
          <Stat value={visible.length ? visible.reduce((s, e) => s + tenureYears(e.start_date), 0) / visible.length : avgTenure} decimals={1} suffix=" yr" label="Average tenure" />
        </section>
      </header>

      {status === "error" ? (
        <div className="empty-state" role="alert">
          <h2>The directory did not load.</h2>
          <p>The API did not answer.</p>
          <button className="btn" onClick={refresh}>
            Try again
          </button>
        </div>
      ) : (
        <>
          <RosterTimeline employees={visible} flashId={flashId} onSelect={setEditing} />

          <section className="workspace" aria-label="Employee records">
            <div className="toolbar">
              <label className="field search-field">
                <span>Search by name</span>
                <input type="search" placeholder="Try “ann” or “ok”" value={search} onChange={(e) => setSearch(e.target.value)} />
              </label>
              <label className="field">
                <span>Department</span>
                <select value={department} onChange={(e) => setDepartment(e.target.value)}>
                  <option value="">All departments</option>
                  {departments.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </label>
              <button className="btn btn-primary" onClick={() => setAdding(true)}>
                Add employee
              </button>
            </div>
            <EmployeeTable
              employees={visible}
              flashId={flashId}
              loading={status === "loading"}
              filtered={filtered}
              onEdit={setEditing}
              onDelete={setDeleting}
            />
          </section>
        </>
      )}

      {(adding || editing) && (
        <EmployeeForm
          key={editing?.id ?? "new"}
          initial={editing}
          departments={departments}
          onSubmit={handleSave}
          onCancel={() => {
            setAdding(false);
            setEditing(null);
          }}
        />
      )}
      {deleting && <ConfirmDelete employee={deleting} onConfirm={handleDelete} onCancel={() => setDeleting(null)} />}
    </div>
  );
}
