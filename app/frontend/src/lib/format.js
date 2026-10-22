const DAY = 86400000;

export function parseDate(iso) {
  return new Date(`${iso}T00:00:00Z`);
}

export function formatDate(iso) {
  return parseDate(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function tenureYears(iso, now = Date.now()) {
  return Math.max(0, (now - parseDate(iso).getTime()) / (365.25 * DAY));
}

export function formatTenure(iso, now = Date.now()) {
  const start = parseDate(iso);
  const end = new Date(now);
  let months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth();
  if (end.getUTCDate() < start.getUTCDate()) months -= 1;
  months = Math.max(0, months);
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest} mo`;
  return rest === 0 ? `${years} yr` : `${years} yr ${rest} mo`;
}

export function pluralize(count, one, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}
