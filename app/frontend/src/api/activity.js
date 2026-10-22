// Session activity log: every call that crosses the API seam is recorded here so the
// Activity page can show what the UI did. Lives in memory for this browser tab only.
import { useSyncExternalStore } from "react";

const MAX_ENTRIES = 200;
let entries = [];
let nextId = 1;
const listeners = new Set();

export function recordActivity(entry) {
  entries = [{ id: nextId++, at: Date.now(), ...entry }, ...entries].slice(0, MAX_ENTRIES);
  listeners.forEach((listener) => listener());
}

export const getActivity = () => entries;

export function clearActivity() {
  entries = [];
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useActivity() {
  return useSyncExternalStore(subscribe, () => entries);
}
