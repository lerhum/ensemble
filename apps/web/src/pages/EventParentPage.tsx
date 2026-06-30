import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { Calendar, ChevronRight, Clock, MapPin, Users } from "lucide-react";
import type { EventDetailDTO, PoleDTO } from "@ensemble/db/shared";
import { useEvent } from "@/lib/useEvent";
import { useAuth } from "@/lib/auth-context";
import { applyAccent } from "@/lib/theme";
import { initials } from "@/lib/utils";
import { PublicNav } from "@/components/public/PublicNav";
import { Button } from "@/components/ui/button";
import { Jauge } from "@/components/primitives/Jauge";

/** Public event page: shows the event story, poles with coverage gauges, and links to slot selection. */
export default function EventParentPage() {
  const { slug = "" } = useParams();
  const { event, loading, error } = useEvent(slug);
  const { siteTitle, siteLogo, rgpdEmail } = useAuth();

  React.useEffect(() => {
    if (event) applyAccent(event.couleurTheme);
  }, [event]);

  if (loading) return <Center>Chargement…</Center>;
  if (error || !event) return <Center className="text-danger">{error ?? "Erreur"}</Center>;

  return (
    <div className="min-h-screen bg-white">
      <MobileView event={event} siteTitle={siteTitle} siteLogo={siteLogo} />
      <DesktopView event={event} siteTitle={siteTitle} siteLogo={siteLogo} rgpdEmail={rgpdEmail} />
    </div>
  );
}

// ── Mobile (écran 1) ──────────────────────────────────────────────────────
/** Mobile layout for the public event page (screen 1): story, poles with coverage, and CTAs. */
function MobileView({ event, siteTitle, siteLogo }: { event: EventDetailDTO; siteTitle: string; siteLogo: string | null }) {
  const polesRef = React.useRef<HTMLDivElement>(null);
  return (
    <div className="mx-auto max-w-md md:hidden">
      <header className="flex items-center justify-between px-4 py-3">
        {siteLogo ? (
          <img src={siteLogo} alt={siteTitle} className="h-7 w-auto object-contain" />
        ) : (
          <span className="text-[15px] font-800 tracking-tighter2 text-ink" style={{ color: event.couleurTheme }}>
            {siteTitle}
          </span>
        )}
      </header>

      {event.banniere
        ? <img src={event.banniere} alt={event.nom} className="aspect-[16/10] w-full object-cover" />
        : <div className="aspect-[16/10] w-full bg-hair" aria-hidden />
      }

      <div className="px-4 pb-28 pt-5">
        <p className="text-[11px] font-800 uppercase tracking-[.1em] text-label2">Fête de l'école</p>
        <h1 className="mt-1 text-[28px] font-800 leading-[1.05] tracking-tightest text-ink">
          {event.nom}
        </h1>

        <div className="mt-4 space-y-2 text-sm text-ink2">
          <Meta icon={Calendar}>{event.date}</Meta>
          <Meta icon={Clock}>{event.horaires}</Meta>
          <Meta icon={MapPin}>{event.lieu}</Meta>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-ink2">{event.histoire}</p>

        <Coverage event={event} className="mt-6" />

        <h2 className="mb-3 mt-7 text-lg font-800 tracking-tighter2 text-ink">Les pôles</h2>
        <div ref={polesRef} className="space-y-2.5">
          {event.poles.map((p) => (
            <PoleRow key={p.id} slug={event.slug} pole={p} />
          ))}
        </div>
      </div>

      {/* CTA collante */}
      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-hair bg-white/95 px-4 py-3 backdrop-blur">
        <Button
          variant="brand"
          size="lg"
          className="w-full"
          onClick={() => polesRef.current?.scrollIntoView({ behavior: "smooth" })}
        >
          Je participe
        </Button>
        <p className="mt-1.5 text-center text-[12px] text-label">
          Choisis les créneaux à l'étape suivante.
        </p>
      </div>
    </div>
  );
}

// ── Desktop (écran 6) ─────────────────────────────────────────────────────
/** Desktop layout for the public event page (screen 6): two-column with story, poles table, and signup links. */
function DesktopView({ event, siteTitle, siteLogo, rgpdEmail }: { event: EventDetailDTO; siteTitle: string; siteLogo: string | null; rgpdEmail: string }) {
  const polesRef = React.useRef<HTMLDivElement>(null);
  return (
    <div className="hidden md:block">
      <PublicNav orgNom={siteTitle || event.orgNom} accent={event.couleurTheme} siteLogo={siteLogo} />

      <div className="mx-auto max-w-6xl px-8">
        {/* Hero */}
        <section className="grid grid-cols-[1fr_430px] items-center gap-12 py-14">
          <div>
            <p className="text-[11px] font-800 uppercase tracking-[.1em] text-label2">
              Fête de l'école
            </p>
            <h1 className="mt-2 text-[46px] font-800 leading-[1.02] tracking-tightest text-ink">
              {event.nom}
            </h1>
            <p className="mt-3 text-sm text-label">
              {event.date} · {event.horaires} · {event.lieu}
            </p>
            <p className="mt-4 max-w-xl leading-relaxed text-ink2">{event.histoire}</p>
            <div className="mt-6 flex items-center gap-3">
              <Button
                variant="brand"
                size="lg"
                onClick={() => polesRef.current?.scrollIntoView({ behavior: "smooth" })}
              >
                Je participe
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => polesRef.current?.scrollIntoView({ behavior: "smooth" })}
              >
                Voir le programme
              </Button>
            </div>
            <Coverage event={event} className="mt-8 max-w-md" withAvatars />
          </div>
          {event.banniere
            ? <img src={event.banniere} alt={event.nom} className="h-[430px] w-full rounded-frame object-cover shadow-card" />
            : <div className="h-[430px] w-full rounded-frame shadow-card bg-hair" aria-hidden />
          }
        </section>

        {/* Pourquoi participer */}
        {(event.pourquoiTitre || event.pourquoiTexte) && (
          <section className="border-t border-hair py-12">
            <p className="text-[11px] font-800 uppercase tracking-[.1em] text-label2">
              Pourquoi participer
            </p>
            <div className="mt-3 grid grid-cols-[1fr_1.4fr] items-start gap-10">
              {event.pourquoiTitre && (
                <h2 className="text-[24px] font-800 leading-tight tracking-tighter2 text-ink">
                  {event.pourquoiTitre}
                </h2>
              )}
              {event.pourquoiTexte && (
                <p className="leading-relaxed text-ink2">{event.pourquoiTexte}</p>
              )}
            </div>
          </section>
        )}

        {/* Choisis ton pôle */}
        <section ref={polesRef} className="border-t border-hair py-12">
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="text-[24px] font-800 tracking-tighter2 text-ink">Choisis ton pôle</h2>
            <p className="text-[13px] text-label">
              {event.counters.nbPoles} pôles · {event.counters.aCompleter} créneaux à pourvoir
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {event.poles.map((p) => (
              <PoleCard key={p.id} slug={event.slug} pole={p} />
            ))}
          </div>
        </section>

        <footer className="flex items-center justify-between border-t border-hair py-8 text-[13px] text-label">
          <span>Ensemble — le bénévolat scolaire, simplement.</span>
          <span className="flex items-center gap-3">
            {rgpdEmail && (
              <a href={`mailto:${rgpdEmail}`} className="hover:underline">Contact</a>
            )}
            <Link to="/confidentialite" className="hover:underline">Confidentialité</Link>
          </span>
        </footer>
      </div>
    </div>
  );
}

// ── Sous-composants ───────────────────────────────────────────────────────
/** Icon + text row used in the event metadata section (date, time, location). */
function Meta({ icon: Icon, children }: { icon: typeof Calendar; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="h-4 w-4 text-label" />
      <span>{children}</span>
    </div>
  );
}

/** Overall volunteer coverage bar: shows total signups vs. capacity with the Jauge component. */
function Coverage({
  event,
  className = "",
  withAvatars = false,
}: {
  event: EventDetailDTO;
  className?: string;
  withAvatars?: boolean;
}) {
  const { inscrits, necessaires } = event.counters;
  const libres = Math.max(0, necessaires - inscrits);
  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        {withAvatars && (
          <div className="flex -space-x-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-chip text-[10px] font-800 text-navy"
              >
                <Users className="h-3 w-3" />
              </span>
            ))}
          </div>
        )}
        <div className="flex-1">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-sm">
              <span className="text-[22px] font-800 text-ink">{inscrits}</span>
              <span className="font-700 text-label"> / {necessaires} parents inscrits</span>
            </span>
            <span className="text-[13px] font-700 text-warn">{libres} places</span>
          </div>
          <Jauge inscrits={inscrits} necessaires={necessaires} showValue={false} />
        </div>
      </div>
    </div>
  );
}

/** Desktop table row for a pole: shows name, slot count, and available spots with a link to the pole selection page. */
function PoleRow({ slug, pole }: { slug: string; pole: PoleDTO }) {
  const libres = pole.placesLibres;
  const color = libres === 0 ? "#2F7E59" : libres <= 1 ? "#B5781E" : "#C7443A";
  return (
    <Link
      to={`/e/${slug}/pole/${pole.id}`}
      className="flex items-center gap-3 rounded-card border border-hair px-3.5 py-3 transition-colors hover:bg-surface"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-chip text-[12px] font-800 text-navy">
        {initials(pole.nom)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-700 text-ink">{pole.nom}</div>
        <div className="text-[12px] text-label">{pole.nbCreneaux} créneaux</div>
      </div>
      <span className="text-right text-[13px] font-700" style={{ color }}>
        {libres === 0 ? "Complet" : `${libres} place${libres > 1 ? "s" : ""}`}
      </span>
      <ChevronRight className="h-4 w-4 text-label2" />
    </Link>
  );
}

/** Mobile card for a pole: shows name, spot count, coverage gauge, and links to slot selection. */
function PoleCard({ slug, pole }: { slug: string; pole: PoleDTO }) {
  return (
    <Link
      to={`/e/${slug}/pole/${pole.id}`}
      className="group flex flex-col rounded-card border border-hair bg-white p-5 transition-shadow hover:shadow-soft"
    >
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-chip text-[12px] font-800 text-navy">
          {initials(pole.nom)}
        </span>
        <span className="font-800 leading-tight text-ink">{pole.nom}</span>
      </div>
      <p className="mt-2.5 line-clamp-2 min-h-[2.5rem] text-[13px] leading-snug text-label">
        {pole.description}
      </p>
      <div className="mt-3">
        <Jauge inscrits={pole.inscrits} necessaires={pole.necessaires} showValue={false} />
      </div>
      <div className="mt-3 flex items-center justify-between text-[13px]">
        <span className="font-700 text-ink2">
          {pole.placesLibres} place{pole.placesLibres > 1 ? "s" : ""} · {pole.nbCreneaux} créneaux
        </span>
        <span className="inline-flex items-center gap-0.5 font-700 text-brand group-hover:gap-1.5">
          Voir <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

/** Full-screen centered wrapper for loading and error states. */
function Center({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`grid min-h-screen place-items-center text-label ${className}`}>{children}</div>;
}
