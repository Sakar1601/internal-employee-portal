import { useEffect, useState } from "react";
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

  async function loadEmployees(query = "") {
    const resp = await apiFetch(`/employees${query ? `?search=${encodeURIComponent(query)}` : ""}`);
    setEmployees(await resp.json());
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
      <header>
        <h1>Internal Employee Portal</h1>
        <button onClick={logout}>Log out</button>
      </header>
      <div className="toolbar">
        <input
          placeholder="Search by name..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            loadEmployees(e.target.value);
          }}
        />
        <button
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
      {showForm && (
        <div className="modal">
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
