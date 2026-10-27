import { formatDate, formatTenure } from "../../shared/lib/format";
import { deptStyle } from "../../shared/lib/departments";

const COLUMNS = [
  { key: "name", label: "Name" },
  { key: "department", label: "Department" },
  { key: "start_date", label: "Start date" },
  { key: "tenure", label: "Tenure" },
];

function SortHeader({ column, sort, onSort }) {
  const active = sort.key === column.key;
  const state = active ? (sort.dir === "asc" ? "ascending" : "descending") : "none";
  return (
    <th scope="col" aria-sort={state}>
      <button type="button" className="sort-btn" onClick={() => onSort(column.key)}>
        {column.label}
        <span className={`sort-arrow${active ? ` is-${sort.dir}` : ""}`} aria-hidden="true" />
      </button>
    </th>
  );
}

export function EmployeeTable({ employees, flashId, leavingId, sort, onSort, onEdit, onDelete, loading, filtered }) {
  if (loading && employees.length === 0) {
    return (
      <div className="skeleton-list" aria-busy="true" aria-label="Loading employees">
        {[0, 1, 2, 3, 4].map((i) => (
          <div className="skeleton-row" key={i} style={{ "--i": i }} />
        ))}
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="empty-state">
        <h2>{filtered ? "Nobody matches that." : "The registry is empty."}</h2>
        <p>{filtered ? "Clear the search or pick another department." : "Add the first employee record to begin."}</p>
      </div>
    );
  }

  return (
    <div className={`table-frame${loading ? " is-refreshing" : ""}`}>
      <table>
        <caption className="visually-hidden">Employee records, sortable by column</caption>
        <thead>
          <tr>
            {COLUMNS.map((c) => (
              <SortHeader key={c.key} column={c} sort={sort} onSort={onSort} />
            ))}
            <th scope="col">
              <span className="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp, i) => (
            <tr
              key={emp.id}
              id={`employee-${emp.id}`}
              className={`${flashId === emp.id ? "is-flash" : ""} ${leavingId === emp.id ? "is-leaving" : ""}`.trim()}
              style={{ "--i": Math.min(i, 14) }}
            >
              <td data-label="Name">
                <button className="name-link" onClick={() => onEdit(emp)}>
                  {emp.name}
                </button>
                <span className="record-id">#{emp.id}</span>
              </td>
              <td data-label="Department">
                <span className="dept-tag" style={deptStyle(emp.department)}>
                  {emp.department}
                </span>
              </td>
              <td data-label="Start date" className="mono">
                {formatDate(emp.start_date)}
              </td>
              <td data-label="Tenure" className="mono">
                {formatTenure(emp.start_date)}
              </td>
              <td className="row-actions">
                <button className="btn btn-quiet" onClick={() => onEdit(emp)} aria-label={`Edit ${emp.name}`}>
                  Edit
                </button>
                <button className="btn btn-quiet btn-quiet-danger" onClick={() => onDelete(emp)} aria-label={`Delete ${emp.name}`}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
