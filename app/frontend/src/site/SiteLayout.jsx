import "./site.css";
import { NavLink, Outlet } from "react-router-dom";
import { paths } from "../paths";
import { Wordmark } from "../shared/ui/Logo";
import { ThemeToggle } from "../shared/ui/ThemeToggle";

export const REPO_URL = "https://github.com/Sakar1601/internal-employee-portal";

// Frame for the whole demo site: Overview, Watch it deploy, Try the app.
export function SiteLayout() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-header site-header">
        <div className="app-header-inner">
          <NavLink to="/" className="brand" aria-label="Employee Portal, overview">
            <Wordmark />
          </NavLink>
          <nav aria-label="Site" className="app-nav site-nav">
            <NavLink to="/" end>
              Overview
            </NavLink>
            <NavLink to="/deploy">Watch it deploy</NavLink>
            <NavLink to={paths.home}>Try the app</NavLink>
          </nav>
          <a className="btn btn-quiet site-repo" href={REPO_URL} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <ThemeToggle />
        </div>
      </header>
      <div id="main">
        <Outlet />
      </div>
    </>
  );
}
