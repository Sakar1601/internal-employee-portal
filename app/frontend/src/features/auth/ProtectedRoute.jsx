import { Navigate } from "react-router-dom";
import { useAuth } from "./auth";

export function ProtectedRoute({ children }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}
