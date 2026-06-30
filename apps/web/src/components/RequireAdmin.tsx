import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";

/** Route guard: redirects to /install if setup is needed, or /login if the user is not authenticated. */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, needsSetup, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (needsSetup) return <Navigate to="/install" replace />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}
