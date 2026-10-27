import { Navigate } from "react-router-dom";
import { useAuth } from "./auth";
import { paths } from "../../paths";

export function ProtectedRoute({ children }) {
  const { token } = useAuth();
  if (!token) return <Navigate to={paths.login} replace />;
  return children;
}
