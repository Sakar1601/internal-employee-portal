import { isDemo, resetDemoData, tokenStore } from "../../api";

const REPO_URL = "https://github.com/Sakar1601/internal-employee-portal";

export function DemoBanner({ onTour }) {
  if (!isDemo) return null;
  return (
    <div className="demo-banner" role="region" aria-label="Demo notice">
      <p>
        <strong>Simulated demo.</strong> There is no server: the API is a simulator running in this browser tab, and the people are
        fictional.
      </p>
      <div className="demo-banner-actions">
        {onTour && (
          <button className="btn btn-quiet tour-cta" onClick={onTour}>
            Take the tour
          </button>
        )}
        <button
          className="btn btn-quiet"
          onClick={() => {
            resetDemoData();
            tokenStore.clear();
            window.location.reload();
          }}
        >
          Reset demo data
        </button>
        <a className="btn btn-quiet" href={REPO_URL} target="_blank" rel="noreferrer">
          Source
        </a>
      </div>
    </div>
  );
}
