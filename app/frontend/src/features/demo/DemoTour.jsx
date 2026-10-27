import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const STEPS = [
  { target: ".stats", title: "Numbers that follow the data", body: "These tween whenever the records change. They are computed from what the API returned, not hard-coded." },
  { target: ".timeline", title: "The roster timeline", body: "Each bar runs from a start date to today, coloured by department. Hover for details, select a bar to open the record." },
  { target: ".search-field", title: "Search is a real API call", body: "Type “ann”. The request is debounced, a stale response is aborted, and the call shows up on the Activity page." },
  { target: '[data-tour="add"]', title: "Add someone", body: "You will get a toast with the effect on the numbers and a link back to the record. Bad input is rejected like the real backend does." },
  { target: '[data-tour="palette"]', title: "Keyboard first", body: "Press Ctrl or Cmd + K to jump to any person or run any action without the mouse." },
  { target: 'nav a[href$="/activity"]', title: "See what the UI did", body: "Activity lists every API call with its request and response. Passwords are masked." },
];

const PAD = 8;

export function DemoTour({ onClose }) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const nextRef = useRef(null);
  const step = STEPS[index];

  useEffect(() => navigate("/"), [navigate]);

  const measure = useCallback(() => {
    const el = document.querySelector(step.target);
    if (!el) return setRect(null);
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  useLayoutEffect(() => {
    // The directory may still be loading when the tour opens, so wait for the target to exist.
    let tries = 0;
    let timer;
    const place = () => {
      const el = document.querySelector(step.target);
      if (!el && tries++ < 30) {
        timer = setTimeout(place, 100);
        return;
      }
      el?.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      timer = setTimeout(measure, 380);
      measure();
    };
    place();
    return () => clearTimeout(timer);
  }, [step, measure]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure]);

  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true });
  }, [index]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const last = index === STEPS.length - 1;
  const narrow = window.innerWidth < 640;
  let pop = {};
  if (rect && !narrow) {
    const below = rect.top + rect.height + PAD + 190 < window.innerHeight;
    pop = {
      top: below ? rect.top + rect.height + PAD + 8 : Math.max(12, rect.top - PAD - 8 - 170),
      left: Math.min(Math.max(12, rect.left), window.innerWidth - 372),
    };
  }

  return (
    <>
      {rect && (
        <div
          className="tour-spot"
          aria-hidden="true"
          style={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }}
        />
      )}
      <div className={`tour-pop${narrow ? " is-sheet" : ""}`} style={pop} role="dialog" aria-label="Guided tour" aria-live="polite">
        <p className="eyebrow">
          Step {index + 1} of {STEPS.length}
        </p>
        <h2>{step.title}</h2>
        <p>{step.body}</p>
        <div className="tour-actions">
          <button className="btn btn-quiet" onClick={onClose}>
            Skip tour
          </button>
          <span className="tour-spacer" />
          <button className="btn" onClick={() => setIndex((i) => i - 1)} disabled={index === 0}>
            Back
          </button>
          <button ref={nextRef} className="btn btn-primary" onClick={() => (last ? onClose() : setIndex((i) => i + 1))}>
            {last ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </>
  );
}
