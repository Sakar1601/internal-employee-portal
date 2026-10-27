import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { isDemo, resetDemoData, tokenStore } from "../../api";
import { useAuth } from "../../features/auth/auth";
import { DemoBanner } from "../../features/demo/DemoBanner";
import { DemoTour } from "../../features/demo/DemoTour";
import { Wordmark } from "../ui/Logo";
import { ThemeToggle } from "../ui/ThemeToggle";
import { ToastProvider } from "../ui/Toasts";
import { CommandProvider } from "../ui/CommandPalette";
import { useCommandPalette, usePageCommands } from "../ui/commands";

function Chrome() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { open } = useCommandPalette();
  const [touring, setTouring] = useState(false);

  const commands = useMemo(
    () => [
      { id: "go-dir", group: "Actions", label: "Go to Directory", keywords: "people home", run: () => navigate("/") },
      { id: "go-act", group: "Actions", label: "Go to Activity", keywords: "log api requests", run: () => navigate("/activity") },
      ...(isDemo
        ? [
            { id: "tour", group: "Actions", label: "Take the guided tour", keywords: "help demo", run: () => setTouring(true) },
            {
              id: "reset",
              group: "Actions",
              label: "Reset demo data",
              keywords: "restore seed",
              run: () => {
                resetDemoData();
                tokenStore.clear();
                window.location.reload();
              },
            },
          ]
        : []),
      { id: "logout", group: "Actions", label: "Log out", keywords: "sign out", run: logout },
    ],
    [navigate, logout],
  );
  usePageCommands("shell", commands);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <DemoBanner onTour={() => setTouring(true)} />
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
          <button type="button" className="palette-btn" data-tour="palette" onClick={open} aria-label="Open command palette">
            <span>Jump to…</span>
            <kbd>Ctrl K</kbd>
          </button>
          <ThemeToggle />
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
      {touring && <DemoTour onClose={() => setTouring(false)} />}
    </>
  );
}

export function AppShell() {
  return (
    <ToastProvider>
      <CommandProvider>
        <Chrome />
      </CommandProvider>
    </ToastProvider>
  );
}
