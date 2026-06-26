import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Clock, MapPin, Calendar, User } from "lucide-react";
import type { MesInscriptionsDTO } from "@ensemble/db/shared";
import { api } from "@/lib/api";

export default function MesInscriptionsPage() {
  const { token = "" } = useParams();
  const [data, setData] = React.useState<MesInscriptionsDTO | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) { setError("Token manquant."); setLoading(false); return; }
    api
      .getMesInscriptions(token)
      .then(setData)
      .catch(() => setError("Lien invalide ou expiré."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return <Center><p className="text-label">Chargement…</p></Center>;
  }
  if (error || !data) {
    return (
      <Center>
        <p className="text-danger font-700">{error ?? "Erreur"}</p>
        <Link to="/" className="mt-4 text-sm text-navy underline">Retour à l'accueil</Link>
      </Center>
    );
  }

  const { volunteer, event, inscriptions, confirmed } = data;

  return (
    <div className="min-h-screen bg-[#F9F9F8] py-10 px-4">
      <div className="mx-auto max-w-lg space-y-6">

        {/* En-tête */}
        <div>
          <p className="text-[13px] text-label">
            <Link to="/" className="hover:underline">Ensemble</Link> / Mes inscriptions
          </p>
          <h1 className="mt-2 text-2xl font-800 tracking-tighter2 text-ink">Mes inscriptions</h1>
        </div>

        {/* Statut de confirmation */}
        {confirmed ? (
          <div className="flex items-center gap-2 rounded-card border border-success bg-success-bg px-4 py-3 text-success">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span className="font-700">Participation confirmée</span>
          </div>
        ) : (
          <div className="rounded-card border border-[#E8A13A] bg-[#FBF1DF] px-4 py-3 text-[#B5781E]">
            <p className="font-700">En attente de confirmation</p>
            <p className="mt-0.5 text-[13px]">
              Consulte ton email pour confirmer ta participation.
            </p>
          </div>
        )}

        {/* Infos bénévole */}
        <div className="rounded-card border border-hair bg-white p-5">
          <p className="text-[11px] font-800 uppercase tracking-[.1em] text-label2">Bénévole</p>
          <div className="mt-3 flex items-center gap-2">
            <User className="h-4 w-4 text-label" />
            <span className="font-700 text-ink">{volunteer.nom}</span>
            <span className="text-label">·</span>
            <span className="text-sm text-label">{volunteer.email}</span>
          </div>
        </div>

        {/* Infos événement */}
        <div className="rounded-card border border-hair bg-white p-5">
          <p className="text-[11px] font-800 uppercase tracking-[.1em] text-label2">Événement</p>
          <p className="mt-2 font-800 text-ink">{event.nom}</p>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2 text-sm text-label">
              <Calendar className="h-4 w-4" />
              <span>{event.date} · {event.horaires}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-label">
              <MapPin className="h-4 w-4" />
              <span>{event.lieu}</span>
            </div>
          </div>
        </div>

        {/* Créneaux inscrits */}
        <div className="rounded-card border border-hair bg-white p-5">
          <p className="text-[11px] font-800 uppercase tracking-[.1em] text-label2">
            Mes créneaux ({inscriptions.length})
          </p>
          {inscriptions.length === 0 ? (
            <p className="mt-3 text-sm text-label">Aucun créneau enregistré.</p>
          ) : (
            <div className="mt-3 divide-y divide-[#F1F3F5]">
              {inscriptions.map((ins, i) => (
                <div key={i} className="py-3 first:pt-0 last:pb-0">
                  <p className="font-700 text-sm text-ink">{ins.poleNom}</p>
                  <p className="text-[13px] text-label">{ins.tacheNom}</p>
                  <div className="mt-1 flex items-center gap-1.5 text-[13px] text-ink2">
                    <Clock className="h-3.5 w-3.5 text-label" />
                    <span>{ins.debut} – {ins.fin}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-[12px] text-label2">
          Garde ce lien — il te permettra de retrouver tes inscriptions.
        </p>
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-white">
      <div className="flex flex-col items-center text-center px-4">{children}</div>
    </div>
  );
}
