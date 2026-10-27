import { lazy, Suspense } from "react";
import { BrowserRouter, HashRouter, Navigate, Routes, Route } from "react-router-dom";
import { isDemo } from "./api";
import { paths } from "./paths";
import { AuthProvider } from "./features/auth/AuthProvider";
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import { AppShell } from "./shared/layout/AppShell";
import { LoginPage } from "./features/auth/LoginPage";
import { DirectoryPage } from "./features/directory/DirectoryPage";
import { ActivityPage } from "./features/activity/ActivityPage";

// The project site (overview and deployment replay) exists only in the static demo build;
// the constant lets the bundler drop it, and its CSS, from the real app.
const SiteLayout = isDemo ? lazy(() => import("./site/SiteLayout").then((m) => ({ default: m.SiteLayout }))) : null;
const OverviewPage = isDemo ? lazy(() => import("./site/OverviewPage").then((m) => ({ default: m.OverviewPage }))) : null;
const DeployPage = isDemo ? lazy(() => import("./site/DeployPage").then((m) => ({ default: m.DeployPage }))) : null;

// The static demo is hosted under an arbitrary sub-path, so it routes with the URL hash.
const Router = isDemo ? HashRouter : BrowserRouter;

const portalRoutes = (
  <>
    <Route path={paths.login} element={<LoginPage />} />
    <Route
      element={
        <ProtectedRoute>
          <AppShell />
        </ProtectedRoute>
      }
    >
      <Route path={paths.home} element={<DirectoryPage />} />
      <Route path={paths.activity} element={<ActivityPage />} />
    </Route>
  </>
);

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={null}>
          {isDemo ? (
            <Routes>
              <Route element={<SiteLayout />}>
                <Route path="/" element={<OverviewPage />} />
                <Route path="/deploy" element={<DeployPage />} />
                {portalRoutes}
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          ) : (
            <Routes>{portalRoutes}</Routes>
          )}
        </Suspense>
      </Router>
    </AuthProvider>
  );
}
