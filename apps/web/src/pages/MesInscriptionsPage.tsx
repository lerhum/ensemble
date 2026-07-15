import * as React from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { CheckCircle2, Clock, MapPin, Calendar, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MesInscriptionsDTO } from "@ensemble/db/shared";
import { api } from "@/lib/api";
import { applyAccent } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";
import { useVolunteer } from "@/lib/volunteer-context";
import { PublicNav } from "@/components/public/PublicNav";
import { Button } from "@/components/ui/button";

/** Volunteer's signup summary page, accessible via email-link token or session cookie. */
export default function MesInscriptionsPage() {
  const { token } = useParams<{ token?: string }>();
  const { siteTitle, siteLogo } = useAuth();
  const { logout, clearToken } = useVolunteer();
  const navigate = useNavigate();
  const { t } = useTranslation("public");
  const [data, setData] = React.useState<MesInscriptionsDTO | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    const fetch = token ? api.getMesInscriptions(token) : api.getMesInscriptionsSession();

    fetch
      .then(setData)
      .catch(() => {
        if (token) clearToken();
        setError(token ? t("mesInscriptions.invalidLink") : t("mesInscriptions.notConnected"));
      })
      .finally(() => setLoading(false));
    // clearToken isn't memoized in VolunteerProvider; adding it here would refetch on every provider render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  React.useEffect(() => {
    if (data) applyAccent(data.event.couleurTheme);
  }, [data]);

  if (loading) {
    return (
      <Center>
        <p className="text-label">{t("shared.loading")}</p>
      </Center>
    );
  }
  if (error || !data) {
    return (
      <Center>
        <p className="text-danger font-700">{error ?? t("shared.error")}</p>
        <Link to="/" className="mt-4 text-sm text-navy underline">
          {t("mesInscriptions.backToHome")}
        </Link>
      </Center>
    );
  }

  const { volunteer, event, inscriptions, confirmed } = data;

  return (
    <div className="min-h-screen bg-[#F9F9F8]">
      <div className="hidden md:block">
        <PublicNav
          orgNom={siteTitle || event.orgNom}
          accent={event.couleurTheme}
          siteLogo={siteLogo}
          containerClassName="max-w-lg px-4"
        />
      </div>

      <div className="py-10 px-4">
        <div className="mx-auto max-w-lg space-y-6">
          {/* En-tête */}
          <div>
            <p className="text-[13px] text-label">
              <Link to={`/e/${event.slug}`} className="hover:underline">
                {event.nom}
              </Link>{" "}
              / {t("mesInscriptions.breadcrumb")}
            </p>
            <h1 className="mt-2 text-2xl font-800 tracking-tighter2 text-ink">
              {t("mesInscriptions.title")}
            </h1>
          </div>

          {/* Statut de confirmation */}
          {confirmed ? (
            <div className="flex items-center gap-2 rounded-card border border-success bg-success-bg px-4 py-3 text-success">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span className="font-700">{t("mesInscriptions.confirmed")}</span>
            </div>
          ) : (
            <div className="rounded-card border border-[#E8A13A] bg-[#FBF1DF] px-4 py-3 text-[#B5781E]">
              <p className="font-700">{t("mesInscriptions.pendingTitle")}</p>
              <p className="mt-0.5 text-[13px]">{t("mesInscriptions.pendingBody")}</p>
            </div>
          )}

          {/* Infos bénévole */}
          <div className="rounded-card border border-hair bg-white p-5">
            <p className="text-[11px] font-800 uppercase tracking-[.1em] text-label2">
              {t("mesInscriptions.volunteerKicker")}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <User className="h-4 w-4 text-label" />
              <span className="font-700 text-ink">{volunteer.nom}</span>
              <span className="text-label">·</span>
              <span className="text-sm text-label">{volunteer.email}</span>
            </div>
          </div>

          {/* Infos événement */}
          <div className="rounded-card border border-hair bg-white p-5">
            <p className="text-[11px] font-800 uppercase tracking-[.1em] text-label2">
              {t("mesInscriptions.eventKicker")}
            </p>
            <p className="mt-2 font-800 text-ink">{event.nom}</p>
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 text-sm text-label">
                <Calendar className="h-4 w-4" />
                <span>
                  {event.date} · {event.horaires}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-label">
                <MapPin className="h-4 w-4" />
                <span>{event.lieu}</span>
              </div>
            </div>
            <Link
              to={`/e/${event.slug}`}
              className="mt-3 inline-block text-[13px] font-700 text-navy underline-offset-2 hover:underline"
            >
              {t("mesInscriptions.viewEvent")}
            </Link>
          </div>

          {/* Créneaux inscrits */}
          <div className="rounded-card border border-hair bg-white p-5">
            <p className="text-[11px] font-800 uppercase tracking-[.1em] text-label2">
              {t("mesInscriptions.mySlots", { count: inscriptions.length })}
            </p>
            {inscriptions.length === 0 ? (
              <p className="mt-3 text-sm text-label">{t("mesInscriptions.noSlots")}</p>
            ) : (
              <div className="mt-3 divide-y divide-[#F1F3F5]">
                {inscriptions.map((ins, i) => (
                  <div key={i} className="py-3 first:pt-0 last:pb-0">
                    <p className="font-700 text-sm text-ink">{ins.poleNom}</p>
                    <p className="text-[13px] text-label">{ins.tacheNom}</p>
                    <div className="mt-1 flex items-center gap-1.5 text-[13px] text-ink2">
                      <Clock className="h-3.5 w-3.5 text-label" />
                      <span>
                        {ins.debut} – {ins.fin}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {token && (
            <p className="text-center text-[12px] text-label2">
              {t("mesInscriptions.keepLinkHint")}
            </p>
          )}

          {/* Droit à l'effacement */}
          <div className="rounded-card border border-hair bg-white p-5">
            <p className="text-[11px] font-800 uppercase tracking-[.1em] text-label2">
              {t("mesInscriptions.myDataKicker")}
            </p>
            <p className="mt-2 text-sm text-label">{t("mesInscriptions.deleteDataBody")}</p>
            {!deleteConfirm ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 border-danger text-danger hover:bg-danger/5"
                onClick={() => setDeleteConfirm(true)}
              >
                {t("mesInscriptions.deleteData")}
              </Button>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-700 text-danger">
                  {t("mesInscriptions.deleteConfirmPrompt")}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-danger text-danger hover:bg-danger/5"
                    disabled={deleting}
                    onClick={async () => {
                      setDeleting(true);
                      try {
                        await api.deleteMyAccount();
                        await logout();
                        navigate("/");
                      } catch {
                        setDeleting(false);
                        setDeleteConfirm(false);
                      }
                    }}
                  >
                    {deleting ? t("mesInscriptions.deleting") : t("mesInscriptions.confirmDelete")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={deleting}
                    onClick={() => setDeleteConfirm(false)}
                  >
                    {t("mesInscriptions.cancel")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Full-screen centered wrapper for loading and error states. */
function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-white">
      <div className="flex flex-col items-center text-center px-4">{children}</div>
    </div>
  );
}
