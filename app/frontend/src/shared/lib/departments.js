// Stable colour per department: the same name always gets the same hue, in both themes.
// Order and multiplier are chosen so the six seeded departments land at least 40 degrees apart.
const HUES = [22, 110, 60, 165, 205, 250, 290, 335];

export function deptHue(name) {
  let hash = 0;
  for (const ch of name) hash = (hash * 43 + ch.charCodeAt(0)) >>> 0;
  return HUES[hash % HUES.length];
}

export const deptStyle = (name) => ({ "--h": deptHue(name) });
