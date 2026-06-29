import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useVolunteer } from "@/lib/volunteer-context";

interface Props {
  orgNom: string;
  accent: string;
  eventSlug?: string;
}

export function PublicNav({ orgNom, accent, eventSlug }: Props) {
  const { token, session, sessionLoading, logout } = useVolunteer();
  const navigate = useNavigate();

  const mesInscriptionsHref = session
    ? "/mes-inscriptions"
    : token
      ? `/mes-inscriptions/${token}`
      : null;

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <nav className="flex items-center justify-between border-b border-hair px-8 py-4">
      <div className="flex items-center gap-3">
        <Logo className="h-8" color={accent} />
        {orgNom && (
          <>
            <span className="h-5 w-px bg-hair" />
            <span className="text-[13px] font-700 text-label">{orgNom}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-6 text-sm font-700 text-ink2">
        <Link to="/" className="hidden hover:text-ink sm:inline">
          Accueil
        </Link>
        {mesInscriptionsHref && (
          <Link to={mesInscriptionsHref} className="hidden hover:text-ink sm:inline">
            Mes inscriptions
          </Link>
        )}
        {!sessionLoading && session ? (
          <div className="flex items-center gap-3">
            <span className="hidden text-[13px] text-label sm:inline">{session.nom}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-[10px] border border-hair px-3.5 py-2 text-ink hover:bg-surface"
            >
              Se déconnecter
            </button>
          </div>
        ) : (
          <Link
            to="/benevole/connexion"
            className="rounded-[10px] border border-hair px-3.5 py-2 text-ink hover:bg-surface"
          >
            Se connecter
          </Link>
        )}
      </div>
    </nav>
  );
}
