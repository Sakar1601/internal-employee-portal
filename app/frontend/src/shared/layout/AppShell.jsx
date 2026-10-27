import { NavLink, Outlet, useLocation } from "react-router-dom";
import { isDemo } from "../../api";
import { paths } from "../../paths";
import { useAuth } from "../../features/auth/auth";
import { DemoBanner } from "../../features/demo/DemoBanner";
import { Wordmark } from "../ui/Logo";
import { ThemeToggle } from "../ui/ThemeToggle";
import { ToastProvider } from "../ui/Toasts";

// The employee portal's frame. In the real app it is the whole header; in the demo site the
// site header sits above it, so this only adds a slim tab bar for the portal's own pages.
export function AppShell() {
  const { logout } = useAuth();
  const location = useLocation();

  const tabs = (
    <nav aria-label="Portal" className="app-nav">
      <NavLink to={paths.home} end>
        Directory
      </NavLink>
      <NavLink to={paths.activity}>Activity</NavLink>
    </nav>
  );

  return (
    <ToastProvider>
      {!isDemo && (
        <a className="skip-link" href="#main">
          Skip to content
        </a>
      )}
      <DemoBanner />
      <header className={`app-header${isDemo ? " is-subbar" : ""}`}>
        <div className="app-header-inner">
          {!isDemo && (
            <NavLink to={paths.home} className="brand" aria-label="Employee Portal, directory">
              <Wordmark />
            </NavLink>
          )}
          {tabs}
          <span className="header-spacer" />
          {!isDemo && <ThemeToggle />}
          <button className="btn btn-quiet" onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      <main id="main" className="app-main">
        <div key={location.pathname} className="page-enter">
          <Outlet />
        </div>
      </main>
    </ToastProvider>
  );
}
