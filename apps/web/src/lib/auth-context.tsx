import * as React from "react";
import type { SessionUserDTO } from "@ensemble/db/shared";
import { api } from "./api";

interface AuthState {
  user: SessionUserDTO | null;
  needsSetup: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<SessionUserDTO | null>(null);
  const [needsSetup, setNeedsSetup] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    const [{ needsSetup }, { user }] = await Promise.all([api.installStatus(), api.me()]);
    setNeedsSetup(needsSetup);
    setUser(user);
  }, []);

  React.useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = React.useCallback(async (email: string, password: string) => {
    const { user } = await api.login({ email, password });
    setUser(user);
  }, []);

  const logout = React.useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, needsSetup, loading, refresh, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return ctx;
}
