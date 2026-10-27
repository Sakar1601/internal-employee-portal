import { useSyncExternalStore } from "react";

const KEY = "theme";
const listeners = new Set();

function currentTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function applyTheme(theme, persist = true) {
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

// Keep other open tabs in sync with a theme change.
window.addEventListener("storage", (e) => {
  if (e.key === KEY && (e.newValue === "dark" || e.newValue === "light")) applyTheme(e.newValue, false);
});

export function useTheme() {
  return useSyncExternalStore((l) => {
    listeners.add(l);
    return () => listeners.delete(l);
  }, currentTheme);
}
