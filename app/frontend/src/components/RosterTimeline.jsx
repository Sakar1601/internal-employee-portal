import { useMemo, useState } from "react";
import { formatDate, formatTenure, parseDate } from "../lib/format";

const DEFAULT_CAPTION = "Every bar runs from a start date to today. Select a bar to open the record.";

function buildLanes(employees) {
  const lanes = new Map();
  for (const emp of employees) {
    if (!lanes.has(emp.department)) lanes.set(emp.department, []);
    lanes.get(emp.department).push(emp);
  }
  return [...lanes.entries()]
    .map(([department, people]) => ({ department, people: people.sort((a, b) => a.start_date.localeCompare(b.start_date)) }))
    .sort((a, b) => a.people[0].start_date.localeCompare(b.people[0].start_date) || a.department.localeCompare(b.department));
}

export function RosterTimeline({ employees, onSelect, flashId }) {
  const [caption, setCaption] = useState(DEFAULT_CAPTION);
  const now = Date.now();

  const { lanes, years, toPct } = useMemo(() => {
    const built = buildLanes(employees);
    if (employees.length === 0) return { lanes: built, years: [], toPct: () => 0 };
    const first = Math.min(...employees.map((e) => parseDate(e.start_date).getFullYear()));
    const startMs = Date.UTC(first, 0, 1);
    const endYear = new Date(now).getUTCFullYear() + 1;
    const endMs = Date.UTC(endYear, 0, 1);
    const ys = [];
    for (let y = first; y <= endYear; y += 1) ys.push(y);
    const pct = (iso) => Math.min(100, Math.max(0, ((parseDate(iso).getTime() - startMs) / (endMs - startMs)) * 100));
    return { lanes: built, years: ys, toPct: pct };
  }, [employees, now]);

  if (employees.length === 0) return null;

  const describe = (emp) => `${emp.name} · ${emp.department} · since ${formatDate(emp.start_date)} · ${formatTenure(emp.start_date, now)}`;
  let index = 0;

  return (
    <figure className="timeline" aria-label="Roster timeline">
      <figcaption className="timeline-head">
        <h2>Roster timeline</h2>
        <p className="timeline-caption" aria-live="polite">
          {caption}
        </p>
      </figcaption>
      <div className="timeline-grid">
        <div className="timeline-axis" aria-hidden="true">
          {years.map((y, i) => (
            <span key={y} style={{ left: `${(i / (years.length - 1)) * 100}%` }}>
              {y}
            </span>
          ))}
        </div>
        {lanes.map(({ department, people }) => (
          <div className="lane" key={department}>
            <h3 className="lane-label">
              {department} <span>{people.length}</span>
            </h3>
            <ul className="lane-track">
              {people.map((emp) => {
                const x = toPct(emp.start_date);
                const i = index++;
                return (
                  <li key={emp.id}>
                    <button
                      type="button"
                      className={`bar${x > 68 ? " flip" : ""}${flashId === emp.id ? " is-flash" : ""}`}
                      style={{ "--x": `${x}%`, "--i": i }}
                      aria-label={`${describe(emp)}. Open record.`}
                      onClick={() => onSelect(emp)}
                      onMouseEnter={() => setCaption(describe(emp))}
                      onFocus={() => setCaption(describe(emp))}
                      onMouseLeave={() => setCaption(DEFAULT_CAPTION)}
                      onBlur={() => setCaption(DEFAULT_CAPTION)}
                    >
                      <span className="bar-dot" />
                      <span className="bar-line" />
                      <span className="bar-name">{emp.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </figure>
  );
}
