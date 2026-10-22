// The mark: a registry ledger. Three tenure rules, each starting at a dot (a start date),
// the same picture the roster timeline draws.
export function LogoMark({ size = 32, title }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <rect width="32" height="32" rx="7" fill="var(--ink)" />
      <g fill="var(--paper)">
        <circle cx="8" cy="10" r="2.4" />
        <rect x="12" y="9.1" width="12" height="1.8" rx="0.9" />
        <circle cx="12" cy="16" r="2.4" fill="#6fc2ae" />
        <rect x="16" y="15.1" width="8" height="1.8" rx="0.9" fill="#6fc2ae" />
        <circle cx="10" cy="22" r="2.4" />
        <rect x="14" y="21.1" width="10" height="1.8" rx="0.9" />
      </g>
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="wordmark">
      <LogoMark />
      <span>
        Employee <em>Portal</em>
      </span>
    </span>
  );
}
