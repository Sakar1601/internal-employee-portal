import { useState } from "react";

export function EmployeeForm({ initial, onSubmit, onCancel }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [department, setDepartment] = useState(initial?.department ?? "");
  const [startDate, setStartDate] = useState(initial?.start_date ?? "");

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ name, department, start_date: startDate });
  }

  return (
    <form onSubmit={handleSubmit} className="employee-form">
      <h2>{initial ? "Edit employee" : "Add employee"}</h2>
      <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
      <input
        placeholder="Department"
        value={department}
        onChange={(e) => setDepartment(e.target.value)}
        required
      />
      <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        required
      />
      <div className="form-actions">
        <button type="submit">Save</button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
