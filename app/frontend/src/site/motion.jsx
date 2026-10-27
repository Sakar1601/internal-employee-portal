import { createElement, useEffect, useRef, useState } from "react";
import { useTween } from "../shared/lib/useTween";

const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function useInView(threshold = 0.2) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(() => reduced() || typeof IntersectionObserver === "undefined");
  useEffect(() => {
    if (seen || !ref.current) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen, threshold]);
  return [ref, seen];
}

// Fades and lifts its children in once, when they scroll into view.
export function Reveal({ as: Tag = "div", delay = 0, className = "", children, ...rest }) {
  const [ref, seen] = useInView(0.15);
  return createElement(
    Tag,
    { ref, className: `reveal${seen ? " is-in" : ""} ${className}`.trim(), style: { "--d": delay }, ...rest },
    children,
  );
}

// A number that counts up the first time it is seen.
export function CountUp({ value }) {
  const [ref, seen] = useInView(0.6);
  const shown = useTween(seen ? value : 0, 900);
  return (
    <span ref={ref}>
      <span className="visually-hidden">{value}</span>
      <span aria-hidden="true">{Math.round(shown)}</span>
    </span>
  );
}

// Splits a headline into words that rise in one after another.
export function Words({ text, offset = 0, italic = false }) {
  const words = text.split(" ");
  const parts = words.map((w, i) => (
    <span key={`${w}-${i}`}>
      <span className="word" style={{ "--i": i + offset }}>
        {w}
      </span>{" "}
    </span>
  ));
  return italic ? <em>{parts}</em> : <>{parts}</>;
}
