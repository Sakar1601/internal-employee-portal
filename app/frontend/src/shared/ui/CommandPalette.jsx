import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "./Modal";
import { CommandContext, filterCommands } from "./commands";

function Palette({ commands, onClose }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const results = useMemo(() => filterCommands(commands, query), [commands, query]);
  const listRef = useRef(null);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function run(command) {
    onClose();
    // Let the dialog finish closing so a command that opens another dialog keeps focus.
    setTimeout(() => command.run(), 0);
  }

  function onKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      run(results[active]);
    }
  }

  return (
    <Modal labelledBy="palette-title" onClose={onClose} className="palette">
      <h2 id="palette-title" className="visually-hidden">
        Command palette
      </h2>
      <input
        autoFocus
        className="palette-input"
        placeholder="Jump to a person, or run an action"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded="true"
        aria-controls="palette-list"
        aria-activedescendant={results[active] ? `palette-${results[active].id}` : undefined}
        aria-label="Search commands"
      />
      <ul id="palette-list" className="palette-list" role="listbox" ref={listRef}>
        {results.length === 0 && <li className="palette-empty">Nothing matches “{query}”.</li>}
        {results.map((c, i) => (
          <li
            key={c.id}
            id={`palette-${c.id}`}
            role="option"
            aria-selected={i === active}
            className="palette-item"
            onMouseMove={() => setActive(i)}
            onClick={() => run(c)}
          >
            <span>{c.label}</span>
            <small>{c.hint ?? c.group}</small>
          </li>
        ))}
      </ul>
      <p className="palette-foot">
        <kbd>↑</kbd> <kbd>↓</kbd> to move, <kbd>Enter</kbd> to run, <kbd>Esc</kbd> to close
      </p>
    </Modal>
  );
}

export function CommandProvider({ children }) {
  const [sources, setSources] = useState({});
  const [isOpen, setOpen] = useState(false);

  const register = useCallback((id, commands) => {
    setSources((s) => ({ ...s, [id]: commands }));
    return () =>
      setSources((s) => {
        const { [id]: _removed, ...rest } = s;
        return rest;
      });
  }, []);
  const open = useCallback(() => setOpen(true), []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo(() => ({ register, open }), [register, open]);
  const commands = useMemo(() => Object.values(sources).flat(), [sources]);

  return (
    <CommandContext.Provider value={value}>
      {children}
      {isOpen && <Palette commands={commands} onClose={() => setOpen(false)} />}
    </CommandContext.Provider>
  );
}
