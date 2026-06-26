import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";

// Garde des routes admin : redirige vers /install (premier lancement) ou /login.
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, needsSetup, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (needsSetup) return <Navigate to="/install" replace />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}
