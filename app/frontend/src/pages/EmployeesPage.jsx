import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { EmployeeTable } from "../components/EmployeeTable";
import { EmployeeForm } from "../components/EmployeeForm";

export function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const { logout } = useAuth();
  const latestQuery = useRef("");
  const departments = new Set(employees.map((employee) => employee.department)).size;

  async function loadEmployees(query = "") {
    latestQuery.current = query;
    const resp = await apiFetch(`/employees${query ? `?search=${encodeURIComponent(query)}` : ""}`);
    const data = await resp.json();
    if (latestQuery.current === query) {
      setEmployees(data);
    }
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  async function handleSave(data) {
    if (editing) {
      await apiFetch(`/employees/${editing.id}`, { method: "PUT", body: JSON.stringify(data) });
    } else {
      await apiFetch("/employees", { method: "POST", body: JSON.stringify(data) });
    }
    setShowForm(false);
    setEditing(null);
    loadEmployees(search);
  }

  async function handleDelete(id) {
    if (!confirm("Delete this employee?")) return;
    await apiFetch(`/employees/${id}`, { method: "DELETE" });
    loadEmployees(search);
  }

  return (
    <div className="employees-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">People registry</p>
          <h1>Internal Employee Portal</h1>
          <p className="page-subtitle">Find, add, and maintain employee records.</p>
        </div>
        <button className="ghost-button" onClick={logout}>
          Log out
        </button>
      </header>

      <main className="directory-shell">
        <section className="directory-summary" aria-label="Directory summary">
          <div>
            <span>{employees.length}</span>
            <p>Visible employees</p>
          </div>
          <div>
            <span>{departments}</span>
            <p>Departments</p>
          </div>
        </section>

        <section className="directory-workspace">
          <div className="toolbar">
            <label className="search-field">
              <span>Search employees</span>
              <input
                placeholder="Search by name"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  loadEmployees(e.target.value);
                }}
              />
            </label>
            <button
              className="primary-button"
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
            >
              Add employee
            </button>
          </div>
          <EmployeeTable
            employees={employees}
            onEdit={(emp) => {
              setEditing(emp);
              setShowForm(true);
            }}
            onDelete={handleDelete}
          />
        </section>
      </main>

      {showForm && (
        <div className="modal" role="presentation">
          <EmployeeForm
            initial={editing}
            onSubmit={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
          />
        </div>
      )}
    </div>
  );
}
