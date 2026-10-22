import { useTween } from "../lib/useTween";

export function Stat({ value, label, decimals = 0, suffix = "" }) {
  const shown = useTween(value);
  return (
    <div className="stat">
      <span className="stat-value">
        <span className="visually-hidden">
          {value.toFixed(decimals)}
          {suffix}
        </span>
        <span aria-hidden="true">
          {shown.toFixed(decimals)}
          {suffix}
        </span>
      </span>
      <p>{label}</p>
    </div>
  );
}
