import { useId, useState } from "react";
import { Modal } from "../../shared/ui/Modal";

function fieldErrors(error) {
  const out = {};
  if (Array.isArray(error?.detail)) {
    for (const item of error.detail) out[item.loc?.[item.loc.length - 1]] = item.msg;
  }
  return out;
}

export function EmployeeForm({ initial, departments, onSubmit, onCancel }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [department, setDepartment] = useState(initial?.department ?? "");
  const [startDate, setStartDate] = useState(initial?.start_date ?? "");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const titleId = useId();
  const listId = useId();

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    setFormError("");
    setPending(true);
    try {
      await onSubmit({ name, department, start_date: startDate });
    } catch (err) {
      const found = fieldErrors(err);
      setErrors(found);
      if (Object.keys(found).length === 0) setFormError(err.message || "Could not save. Try again.");
      setPending(false);
    }
  }

  return (
    <Modal labelledBy={titleId} onClose={onCancel}>
      <form onSubmit={handleSubmit} className="employee-form">
        <div>
          <p className="eyebrow">{initial ? `Record #${initial.id}` : "New record"}</p>
          <h2 id={titleId}>{initial ? "Edit employee" : "Add employee"}</h2>
        </div>
        <label>
          <span>Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={200}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "err-name" : undefined}
          />
          {errors.name && (
            <small id="err-name" className="field-error">
              {errors.name}
            </small>
          )}
        </label>
        <label>
          <span>Department</span>
          <input
            list={listId}
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            required
            maxLength={100}
            aria-invalid={Boolean(errors.department)}
            aria-describedby={errors.department ? "err-dept" : undefined}
          />
          <datalist id={listId}>
            {departments.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
          {errors.department && (
            <small id="err-dept" className="field-error">
              {errors.department}
            </small>
          )}
        </label>
        <label>
          <span>Start date</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            aria-invalid={Boolean(errors.start_date)}
            aria-describedby={errors.start_date ? "err-date" : undefined}
          />
          {errors.start_date && (
            <small id="err-date" className="field-error">
              {errors.start_date}
            </small>
          )}
        </label>
        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Saving…" : initial ? "Save changes" : "Add to registry"}
          </button>
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
