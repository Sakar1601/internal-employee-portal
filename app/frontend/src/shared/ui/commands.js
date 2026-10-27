import { createContext, useContext, useEffect } from "react";

// Pages register the commands that make sense on them; the palette shows the union.
export const CommandContext = createContext({ register: () => () => {}, open: () => {} });

export function useCommandPalette() {
  return useContext(CommandContext);
}

export function usePageCommands(id, commands) {
  const { register } = useContext(CommandContext);
  useEffect(() => register(id, commands), [register, id, commands]);
}

const MAX_RESULTS = 8;

export function filterCommands(commands, query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return commands.filter((c) => c.group === "Actions").slice(0, MAX_RESULTS);
  return commands
    .filter((c) => {
      const hay = `${c.label} ${c.hint ?? ""} ${c.keywords ?? ""}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    })
    .slice(0, MAX_RESULTS);
}

