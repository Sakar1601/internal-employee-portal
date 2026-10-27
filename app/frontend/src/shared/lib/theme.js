import { useSyncExternalStore } from "react";

const KEY = "theme";
const listeners = new Set();

function stored() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function currentTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

// Mirrors the inline script in the HTML heads: a stored choice wins, else the OS preference.
export function initialTheme() {
  const saved = stored();
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme, persist = true) {
  document.documentElement.dataset.theme = theme;
  if (persist) {
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* private mode: the choice lasts for this page only */
    }
  }
  listeners.forEach((l) => l());
}

export function toggleTheme() {
  applyTheme(currentTheme() === "dark" ? "light" : "dark");
}

// Keep iframes and other tabs in sync (the landing page embeds the app on the same origin).
window.addEventListener("storage", (e) => {
  if (e.key === KEY && (e.newValue === "dark" || e.newValue === "light")) applyTheme(e.newValue, false);
});

export function useTheme() {
  return useSyncExternalStore((l) => {
    listeners.add(l);
    return () => listeners.delete(l);
  }, currentTheme);
}
