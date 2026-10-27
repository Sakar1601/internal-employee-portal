import { useId, useState } from "react";
import { Modal } from "../../shared/ui/Modal";

export function ConfirmDelete({ employee, onConfirm, onCancel }) {
  const titleId = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setPending(true);
    setError("");
    try {
      await onConfirm();
    } catch (err) {
      setError(err.message || "Could not delete. Try again.");
      setPending(false);
    }
  }

  return (
    <Modal labelledBy={titleId} onClose={onCancel}>
      <div className="employee-form">
        <div>
          <p className="eyebrow">Record #{employee.id}</p>
          <h2 id={titleId}>Delete {employee.name}?</h2>
        </div>
        <p>
          This removes the {employee.department} record permanently. There is no undo in this build.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button className="btn btn-danger" onClick={confirm} disabled={pending} autoFocus>
            {pending ? "Deleting…" : "Delete record"}
          </button>
          <button className="btn" onClick={onCancel}>
            Keep record
          </button>
        </div>
      </div>
    </Modal>
  );
}
