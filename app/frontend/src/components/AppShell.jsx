import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/auth";
import { Wordmark } from "./Logo";
import { DemoBanner } from "./DemoBanner";
import { ToastProvider } from "./Toasts";

export function AppShell() {
  const { logout } = useAuth();
  return (
    <ToastProvider>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <DemoBanner />
      <header className="app-header">
        <div className="app-header-inner">
          <NavLink to="/" className="brand" aria-label="Employee Portal, directory">
            <Wordmark />
          </NavLink>
          <nav aria-label="Primary" className="app-nav">
            <NavLink to="/" end>
              Directory
            </NavLink>
            <NavLink to="/activity">Activity</NavLink>
          </nav>
          <button className="btn btn-quiet" onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      <main id="main" className="app-main">
        <Outlet />
      </main>
    </ToastProvider>
  );
}
