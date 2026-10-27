import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import { isDemo } from "./api";
import { AuthProvider } from "./features/auth/AuthProvider";
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import { AppShell } from "./shared/layout/AppShell";
import { LoginPage } from "./features/auth/LoginPage";
import { DirectoryPage } from "./features/directory/DirectoryPage";
import { ActivityPage } from "./features/activity/ActivityPage";

// The static demo is hosted under an arbitrary sub-path, so it routes with the URL hash.
const Router = isDemo ? HashRouter : BrowserRouter;

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DirectoryPage />} />
            <Route path="/activity" element={<ActivityPage />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
