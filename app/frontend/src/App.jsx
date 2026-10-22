import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import { isDemo } from "./api";
import { AuthProvider } from "./context/AuthProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppShell } from "./components/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { EmployeesPage } from "./pages/EmployeesPage";
import { ActivityPage } from "./pages/ActivityPage";

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
            <Route path="/" element={<EmployeesPage />} />
            <Route path="/activity" element={<ActivityPage />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
