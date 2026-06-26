import * as React from "react";
import { useParams } from "react-router-dom";
import type { EventDetailDTO } from "@ensemble/db/shared";
import { api, ApiError } from "@/lib/api";
import { applyAccent } from "@/lib/theme";
import { Logo } from "@/components/Logo";
import { Progress } from "@/components/ui/progress";

// Version minimale (étape 4) : valide le client API + le thème. L'écran hi-fi
// (mobile/desktop) est implémenté à l'étape 6.
export default function EventParentPage() {
  const { slug = "" } = useParams();
  const [event, setEvent] = React.useState<EventDetailDTO | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    api
      .getEvent(slug)
      .then((ev) => {
        if (!active) return;
        setEvent(ev);
        applyAccent(ev.couleurTheme);
      })
      .catch((err) => active && setError(err instanceof ApiError ? err.message : "Erreur"));
    return () => {
      active = false;
    };
  }, [slug]);

  if (error) return <div className="p-10 text-danger">{error}</div>;
  if (!event) return <div className="p-10 text-label">Chargement…</div>;

  const pct = event.counters.necessaires
    ? Math.round((event.counters.inscrits / event.counters.necessaires) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Logo className="h-9" color={event.couleurTheme} />
      <h1 className="mt-6 text-4xl font-800 tracking-tightest text-ink">{event.nom}</h1>
      <p className="mt-2 text-label">
        {event.date} · {event.horaires} · {event.lieu}
      </p>
      <p className="mt-4 leading-relaxed text-ink2">{event.histoire}</p>

      <div className="mt-8">
        <div className="mb-2 flex justify-between text-sm font-700 text-ink">
          <span>
            {event.counters.inscrits}/{event.counters.necessaires} bénévoles
          </span>
          <span className="text-label">{event.counters.aCompleter} créneaux à compléter</span>
        </div>
        <Progress value={pct} fill="var(--accent-brand)" />
      </div>

      <ul className="mt-8 space-y-2">
        {event.poles.map((p) => (
          <li key={p.id} className="flex justify-between rounded-card border border-hair px-4 py-3">
            <span className="font-700 text-ink">{p.nom}</span>
            <span className="text-sm text-label">
              {p.placesLibres} place(s) · {p.nbCreneaux} créneaux
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
