import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { paths } from "../paths";
import { ArchitectureDiagram, DiagramLegend } from "./ArchitectureDiagram";
import { STEPS } from "./deployScript";
import { REPO_URL } from "./SiteLayout";

const LINE_MS = 260;
const STEP_PAUSE_MS = 450;
const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// A replay of the runbook, driven by a small state machine:
// idle -> running (step i, line n) -> done. "Skip to end" and Reset work at any point.
export function DeployPage() {
  const [status, setStatus] = useState("idle");
  const [done, setDone] = useState(0); // steps fully finished
  const [shown, setShown] = useState(0); // lines revealed in the running step
  const [view, setView] = useState(null); // step id whose log is open
  const timer = useRef(null);
  const logRef = useRef(null);

  const running = status === "running";
  const current = running ? done + 1 : null;

  const stop = () => clearTimeout(timer.current);

  const reset = () => {
    stop();
    setStatus("idle");
    setDone(0);
    setShown(0);
    setView(null);
  };

  const finish = () => {
    stop();
    setStatus("done");
    setDone(STEPS.length);
    setShown(0);
    setView(STEPS.length);
  };

  const run = () => {
    stop();
    setStatus("running");
    setDone(0);
    setShown(0);
    setView(1);
    if (reduced()) finish();
  };

  // Advance one line at a time; pause briefly between steps.
  useEffect(() => {
    if (!running) return undefined;
    const step = STEPS[done];
    if (shown < step.lines.length) {
      timer.current = setTimeout(() => setShown((n) => n + 1), LINE_MS);
    } else {
      timer.current = setTimeout(() => {
        if (done + 1 >= STEPS.length) {
          setStatus("done");
          setDone(STEPS.length);
          setShown(0);
        } else {
          setDone((d) => d + 1);
          setShown(0);
          setView(step.id + 1);
        }
      }, STEP_PAUSE_MS);
    }
    return stop;
  }, [running, done, shown]);

  useEffect(() => stop, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [shown, view]);

  const openStep = view ? STEPS[view - 1] : null;
  const lines = !openStep ? [] : running && openStep.id === done + 1 ? openStep.lines.slice(0, shown) : status === "idle" ? [] : openStep.lines;
  const stage = done;

  const stateOf = (id) => (id <= done ? "done" : id === current ? "running" : "waiting");

  return (
    <div className="wrap deploy">
      <header className="deploy-head">
        <div>
          <p className="eyebrow">Simulated replay</p>
          <h1>Watch it deploy</h1>
          <p className="page-lede">
            Six runbook steps take an empty laptop to a running portal. Press run and the diagram comes alive as each step finishes. Nothing is
            executed: the lines are the messages the repository's own scripts print.
          </p>
        </div>
        <div className="deploy-actions">
          {status !== "running" ? (
            <button className="btn btn-primary" onClick={run}>
              {status === "done" ? "Run again" : "Run deployment"}
            </button>
          ) : (
            <button className="btn" onClick={finish}>
              Skip to the end
            </button>
          )}
          <button className="btn btn-quiet" onClick={reset} disabled={status === "idle"}>
            Reset
          </button>
        </div>
      </header>

      <div className="deploy-grid">
        <div className="deploy-left">
          <ol className="steps-list" aria-label="Deployment steps">
            {STEPS.map((s) => {
              const state = stateOf(s.id);
              const open = view === s.id;
              return (
                <li key={s.id} className={`step is-${state}${open ? " is-open" : ""}`}>
                  <button type="button" onClick={() => state !== "waiting" && setView(s.id)} aria-current={open ? "step" : undefined} disabled={state === "waiting"}>
                    <span className="step-n">{String(s.id).padStart(2, "0")}</span>
                    <span className="step-title">{s.title}</span>
                    <span className="step-state">{state === "done" ? "done" : state === "running" ? "running" : "waiting"}</span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="term-box" aria-live="polite">
            <div className="term-bar">
              <span>{openStep ? openStep.cmd : "Press “Run deployment” to start"}</span>
              <em>simulated output</em>
            </div>
            <pre ref={logRef} className="term-log">
              {openStep && status !== "idle" && <span className="term-cmd">$ {openStep.cmd}{"\n"}</span>}
              {lines.map((l, i) => (
                <span key={l} className={l.startsWith("==>") ? "term-info" : "term-line"} style={{ "--i": i }}>
                  {l}
                  {"\n"}
                </span>
              ))}
            </pre>
          </div>
        </div>

        <div className="deploy-right">
          <div className="arch-frame">
            <ArchitectureDiagram stage={stage} current={current} label={`Architecture after ${stage} of ${STEPS.length} steps`} />
          </div>
          {openStep && status !== "idle" && (
            <div className="step-explain">
              <p className="eyebrow">What this step does</p>
              <p>{openStep.detail}</p>
              <p className="how-airgap">
                <strong>The air-gap angle.</strong> {openStep.airgap}
              </p>
              <a href={`${REPO_URL}/blob/main/${openStep.file}`} target="_blank" rel="noreferrer">
                {openStep.file}
              </a>
            </div>
          )}
          {status === "done" ? (
            <div className="live-card" role="status">
              <div>
                <p className="eyebrow">Deployment complete (simulated)</p>
                <h2>The portal is live.</h2>
                <p>This is what the last step deployed. The app it serves is a second simulator, running in this tab.</p>
              </div>
              <Link className="btn btn-primary" to={paths.home}>
                Open the app
              </Link>
            </div>
          ) : (
            <p className="deploy-hint">{running ? `Step ${current} of ${STEPS.length} is running…` : "Nothing is deployed yet. Every part of the diagram is dimmed."}</p>
          )}
        </div>
      </div>

      <DiagramLegend />
    </div>
  );
}
