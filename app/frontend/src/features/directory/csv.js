// Spreadsheet apps run text that starts with these as a formula, so such cells get a leading apostrophe.
const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value) {
  let text = String(value ?? "");
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function employeesToCsv(employees) {
  const rows = [["id", "name", "department", "start_date"], ...employees.map((e) => [e.id, e.name, e.department, e.start_date])];
  return `${rows.map((r) => r.map(cell).join(",")).join("\r\n")}\r\n`;
}

export function downloadCsv(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
