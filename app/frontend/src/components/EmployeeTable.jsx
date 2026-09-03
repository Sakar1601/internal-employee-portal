export function EmployeeTable({ employees, onEdit, onDelete }) {
  if (employees.length === 0) {
    return (
      <div className="empty-state">
        <h2>No employees found</h2>
        <p>Adjust the search or add the first employee record.</p>
      </div>
    );
  }

  return (
    <div className="table-frame">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Department</th>
            <th>Start date</th>
            <th aria-label="Actions"></th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => (
            <tr key={emp.id}>
              <td>
                <strong>{emp.name}</strong>
              </td>
              <td>
                <span className="department-pill">{emp.department}</span>
              </td>
              <td className="date-cell">{emp.start_date}</td>
              <td>
                <div className="row-actions">
                  <button className="text-button" onClick={() => onEdit(emp)}>
                    Edit
                  </button>
                  <button className="danger-button" onClick={() => onDelete(emp.id)}>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
