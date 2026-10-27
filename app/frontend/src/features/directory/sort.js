import { parseDate } from "../../shared/lib/format";

export const SORTS = {
  name: (a, b) => a.name.localeCompare(b.name) || a.id - b.id,
  department: (a, b) => a.department.localeCompare(b.department) || a.name.localeCompare(b.name),
  start_date: (a, b) => parseDate(a.start_date) - parseDate(b.start_date) || a.name.localeCompare(b.name),
};

// Tenure is the start date seen from the other side, so it sorts the opposite way round.
export function sortEmployees(list, key, dir) {
  const compare = key === "tenure" ? (a, b) => SORTS.start_date(b, a) : SORTS[key];
  const sorted = [...list].sort(compare);
  return dir === "desc" ? sorted.reverse() : sorted;
}
