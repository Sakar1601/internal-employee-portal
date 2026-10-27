import { useEffect, useState } from "react";

// Types text out for the eye while keeping the full sentence available to screen readers.
export function StreamText({ text, speed = 14 }) {
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [count, setCount] = useState(reduce ? text.length : 0);

  useEffect(() => {
    if (reduce) return undefined;
    const id = setInterval(() => setCount((c) => (c >= text.length ? c : c + 1)), speed);
    return () => clearInterval(id);
  }, [text, speed, reduce]);

  return (
    <>
      <span className="visually-hidden">{text}</span>
      <span aria-hidden="true">{text.slice(0, count)}</span>
    </>
  );
}
