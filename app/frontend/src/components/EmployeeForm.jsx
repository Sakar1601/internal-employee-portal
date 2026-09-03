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
    <form
      onSubmit={handleSubmit}
      className="employee-form"
      role="dialog"
      aria-modal="true"
      aria-labelledby="employee-form-title"
    >
      <div>
        <p className="eyebrow">Employee record</p>
        <h2 id="employee-form-title">{initial ? "Edit employee" : "Add employee"}</h2>
      </div>
      <label>
        <span>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label>
        <span>Department</span>
        <input value={department} onChange={(e) => setDepartment(e.target.value)} required />
      </label>
      <label>
        <span>Start date</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
        />
      </label>
      <div className="form-actions">
        <button type="submit" className="primary-button">
          Save employee
        </button>
        <button type="button" className="ghost-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
