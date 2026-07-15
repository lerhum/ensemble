import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useVolunteer } from "@/lib/volunteer-context";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

interface Props {
  orgNom: string;
  accent: string;
  siteLogo?: string | null;
  /** Width/padding classes for the inner wrapper, matched to the page's content container so the logo and menu line up with it. */
  containerClassName?: string;
}

/** Top navigation bar for the public event page: school branding, "Mes inscriptions" link, and volunteer session controls. */
export function PublicNav({
  orgNom,
  accent,
  siteLogo,
  containerClassName = "max-w-6xl px-8",
}: Props) {
  const { token, session, sessionLoading, logout } = useVolunteer();
  const navigate = useNavigate();
  const { t } = useTranslation("common");

  const mesInscriptionsHref = session
    ? "/mes-inscriptions"
    : token
      ? `/mes-inscriptions/${token}`
      : null;

  /** Signs out the volunteer and navigates to the home page. */
  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <nav className="border-b border-hair">
      <div className={`mx-auto flex items-center justify-between py-4 ${containerClassName}`}>
        <div className="flex items-center gap-3">
          {siteLogo ? (
            <img src={siteLogo} alt={orgNom} className="h-11 w-auto object-contain" />
          ) : (
            <span
              className="text-[17px] font-800 tracking-tighter2 text-ink"
              style={{ color: accent }}
            >
              {orgNom}
            </span>
          )}
        </div>
        <div className="flex items-center gap-6 text-sm font-700 text-ink2">
          <Link to="/" className="hidden hover:text-ink sm:inline">
            {t("nav.home")}
          </Link>
          {mesInscriptionsHref && (
            <Link to={mesInscriptionsHref} className="hidden hover:text-ink sm:inline">
              {t("nav.myRegistrations")}
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
                {t("nav.logout")}
              </button>
            </div>
          ) : (
            <Link
              to="/benevole/connexion"
              className="rounded-[10px] border border-hair px-3.5 py-2 text-ink hover:bg-surface"
            >
              {t("nav.login")}
            </Link>
          )}
          <LocaleSwitcher />
        </div>
      </div>
    </nav>
  );
}
