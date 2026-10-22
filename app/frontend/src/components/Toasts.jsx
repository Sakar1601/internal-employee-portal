import { useCallback, useMemo, useState } from "react";
import { StreamText } from "./StreamText";
import { ToastContext } from "./toast";

let counter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (toast) => {
      const id = ++counter;
      setToasts((list) => [...list.slice(-2), { id, tone: "ok", ...toast }]);
      setTimeout(() => dismiss(id), toast.duration ?? 7000);
    },
    [dismiss],
  );

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            <div className="toast-body">
              <strong>{t.title}</strong>
              {t.detail && (
                <p>
                  <StreamText text={t.detail} />
                </p>
              )}
            </div>
            <div className="toast-actions">
              {t.action && (
                <button
                  className="btn btn-quiet"
                  onClick={() => {
                    t.action.run();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
              <button className="btn btn-quiet" aria-label="Dismiss notification" onClick={() => dismiss(t.id)}>
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
