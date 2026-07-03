import * as React from "react";
import type { Identite } from "@/components/InscriptionDialog";
import { api } from "@/lib/api";

const IDENTITE_KEY = "ens_identite";
const TOKEN_KEY = "ens_token";

export interface VolunteerSession {
  volunteerId: string;
  nom: string;
  email: string;
  tel: string | null;
  eventSlug: string;
}

interface VolunteerCtx {
  identite: Identite | null;
  token: string | null;
  saveIdentite: (i: Identite) => void;
  saveToken: (t: string) => void;
  session: VolunteerSession | null;
  sessionLoading: boolean;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
  clearToken: () => void;
}

const VolunteerContext = React.createContext<VolunteerCtx>({
  identite: null,
  token: null,
  saveIdentite: () => {},
  saveToken: () => {},
  session: null,
  sessionLoading: false,
  refreshSession: async () => {},
  logout: async () => {},
  clearToken: () => {},
});

/** Provides volunteer identity (persisted to localStorage), email-link token, and session state to the component tree. */
export function VolunteerProvider({ children }: { children: React.ReactNode }) {
  const [identite, setIdentite] = React.useState<Identite | null>(() => {
    try {
      const s = localStorage.getItem(IDENTITE_KEY);
      return s ? (JSON.parse(s) as Identite) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = React.useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  );

  const [session, setSession] = React.useState<VolunteerSession | null>(null);
  const [sessionLoading, setSessionLoading] = React.useState(true);

  React.useEffect(() => {
    refreshSession();
  }, []);

  async function refreshSession() {
    setSessionLoading(true);
    try {
      const data = await api.volunteerMe();
      setSession(data);
    } catch {
      setSession(null);
    } finally {
      setSessionLoading(false);
    }
  }

  function saveIdentite(i: Identite) {
    setIdentite(i);
    localStorage.setItem(IDENTITE_KEY, JSON.stringify(i));
  }

  function saveToken(t: string) {
    setToken(t);
    localStorage.setItem(TOKEN_KEY, t);
  }

  /** Clears a stale/invalid email-link token (e.g. once the server reports it no longer resolves to a volunteer). */
  function clearToken() {
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
  }

  async function logout() {
    await api.volunteerLogout().catch(() => {});
    setSession(null);
    setIdentite(null);
    setToken(null);
    localStorage.removeItem(IDENTITE_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }

  return (
    <VolunteerContext.Provider
      value={{ identite, token, saveIdentite, saveToken, session, sessionLoading, refreshSession, logout, clearToken }}
    >
      {children}
    </VolunteerContext.Provider>
  );
}

/** Returns the current volunteer context (identity, token, session, and session controls). */
export function useVolunteer() {
  return React.useContext(VolunteerContext);
}
