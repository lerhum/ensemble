import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, CheckCircle2, Mail } from "lucide-react";
import type { EventDetailDTO, PoleDTO } from "@ensemble/db/shared";
import { api } from "@/lib/api";
import { useEvent } from "@/lib/useEvent";
import { applyAccent } from "@/lib/theme";
import { initials, formatPlage } from "@/lib/utils";
import { useVolunteer } from "@/lib/volunteer-context";
import { useAuth } from "@/lib/auth-context";
import { PublicNav } from "@/components/public/PublicNav";
import { Jauge } from "@/components/primitives/Jauge";
import { CarteCreneau } from "@/components/primitives/CarteCreneau";
import { LigneCreneau } from "@/components/primitives/LigneCreneau";
import { InscriptionDialog, type Identite } from "@/components/InscriptionDialog";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";

/** Slot selection page for a specific pole: shows tasks, slots (mobile cards or desktop rows), and handles the sign-up flow. */
export default function PoleSelectionPage() {
  const { slug = "", poleId = "" } = useParams();
  const { event, loading, error, reload } = useEvent(slug);

  React.useEffect(() => {
    if (event) applyAccent(event.couleurTheme);
  }, [event]);

  if (loading) return <Center>Chargement…</Center>;
  if (error || !event) return <Center className="text-danger">{error ?? "Erreur"}</Center>;
  const pole = event.poles.find((p) => p.id === poleId);
  if (!pole) return <Center className="text-danger">Pôle introuvable</Center>;

  return <PoleInner event={event} pole={pole} reload={reload} />;
}

type DialogMode = "form" | "confirm" | null;

/** Inner component for slot selection within a pole; handles the sign-up dialog flow and selected slots state. */
function PoleInner({
  event,
  pole,
  reload,
}: {
  event: EventDetailDTO;
  pole: PoleDTO;
  reload: () => Promise<void>;
}) {
  const { identite, session, saveIdentite, saveToken } = useVolunteer();
  const { siteTitle, siteLogo } = useAuth();

  const [activeCreneau, setActiveCreneau] = React.useState<{ id: string; label: string } | null>(null);
  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);
  const [inscribed, setInscribed] = React.useState<Set<string>>(new Set());
  const [success, setSuccess] = React.useState<{ token: string; needsConfirmation: boolean } | null>(null);

  // Identité effective : session connectée > localStorage
  const effectiveIdentite: Identite | null = session
    ? { nom: session.nom, email: session.email, tel: session.tel ?? undefined }
    : identite;

  function openForCreneau(id: string, label: string) {
    setActiveCreneau({ id, label });
    setDialogMode(effectiveIdentite ? "confirm" : "form");
  }

  async function register(id: Identite) {
    const r = await api.inscrire(activeCreneau!.id, id);
    if (!session) {
      saveIdentite(id);
      saveToken(r.token);
    }
    setInscribed((prev) => new Set([...prev, activeCreneau!.id]));
    setDialogMode(null);
    setActiveCreneau(null);
    setSuccess({ token: r.token, needsConfirmation: r.needsConfirmation });
    await reload();
  }

  const nbCreneaux = pole.taches.reduce((n, t) => n + t.creneaux.length, 0);

  return (
    <div className="min-h-screen bg-white">
      {/* Desktop nav */}
      <div className="hidden md:block">
        <PublicNav
          orgNom={siteTitle || event.orgNom}
          accent={event.couleurTheme}
          siteLogo={siteLogo}
          eventSlug={event.slug}
          containerClassName="max-w-5xl px-4 md:px-8"
        />
      </div>

      {/* Mobile header */}
      <header className="flex items-center gap-3 border-b border-hair px-4 py-3 md:hidden">
        <Link to={`/e/${event.slug}`} className="text-label">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-800 leading-tight text-ink">{pole.nom}</h1>
          <p className="text-[12px] text-label">
            {event.nom} · {nbCreneaux} créneaux
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">
        {/* Fil d'Ariane + en-tête desktop */}
        <div className="hidden md:block">
          <p className="text-[13px] text-label">
            <Link to={`/e/${event.slug}`} className="hover:underline">
              ‹ {event.nom}
            </Link>{" "}
            / {pole.nom}
          </p>
          <div className="mt-3 flex items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-chip text-[13px] font-800 text-navy">
                {initials(pole.nom)}
              </span>
              <h1 className="text-[26px] font-800 tracking-tighter2 text-ink">{pole.nom}</h1>
            </div>
            <div className="w-64">
              <Jauge inscrits={pole.inscrits} necessaires={pole.necessaires} label="Couverture du pôle" />
            </div>
          </div>
        </div>

        {success && (
          <div className="mt-5 rounded-card border border-success bg-success-bg px-4 py-4 text-success">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span className="font-700">Merci ! Ton inscription est enregistrée.</span>
            </div>
            {success.needsConfirmation && (
              <div className="mt-2 flex items-start gap-2 text-[13px] text-ink2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-label" />
                <span>
                  Un email a été envoyé. Clique sur le lien pour confirmer ta participation et protéger ton accès.
                </span>
              </div>
            )}
            <Link
              to={session ? "/mes-inscriptions" : `/mes-inscriptions/${success.token}`}
              className="mt-3 inline-block text-[13px] font-700 text-navy underline-offset-2 hover:underline"
            >
              Voir mes inscriptions →
            </Link>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-[280px_1fr]">
          {/* Carte pôle (desktop) */}
          <aside className="hidden md:block">
            <div className="rounded-card border border-hair bg-surface p-5">
              <p className="text-[11px] font-800 uppercase tracking-[.1em] text-label2">Le pôle</p>
              <p className="mt-2 text-sm leading-relaxed text-ink2">{pole.description}</p>
            </div>
          </aside>

          {/* Tâches & créneaux */}
          <section>
            <div className="mb-3 hidden items-baseline justify-between md:flex">
              <h2 className="text-lg font-800 tracking-tighter2 text-ink">Tâches &amp; créneaux</h2>
              <p className="text-[13px] text-label">
                Clique sur « Je participe » pour t'inscrire directement.
              </p>
            </div>
            <p className="mb-4 text-sm text-ink2 md:hidden">
              Clique sur « Je participe » pour le créneau qui t'arrange.
            </p>

            <div className="space-y-5">
              {pole.taches.map((tache) => (
                <div key={tache.id} className="md:rounded-card md:border md:border-hair md:bg-white">
                  {/* En-tête de tâche (desktop) */}
                  <div className="hidden items-center gap-2 border-b border-hair px-5 py-3 md:flex">
                    <span className="font-800 text-ink">{tache.nom}</span>
                    <span className="rounded-full bg-chip px-2 py-0.5 text-[11px] font-700 text-navy">
                      {tache.creneaux.length} créneau{tache.creneaux.length > 1 ? "x" : ""}
                    </span>
                    {tache.description && (
                      <span className="ml-auto text-[13px] text-label">{tache.description}</span>
                    )}
                  </div>

                  {/* Desktop : lignes */}
                  <div className="hidden divide-y divide-[#F1F3F5] px-5 md:block">
                    {tache.creneaux.map((cr) => (
                      <LigneCreneau
                        key={cr.id}
                        debut={cr.debut}
                        fin={cr.fin}
                        inscrits={cr.inscrits}
                        necessaires={cr.necessaires}
                        selected={inscribed.has(cr.id)}
                        onToggle={
                          inscribed.has(cr.id)
                            ? undefined
                            : () =>
                                openForCreneau(
                                  cr.id,
                                  `${pole.nom} · ${tache.nom} · ${formatPlage(cr.debut, cr.fin)}`,
                                )
                        }
                      />
                    ))}
                  </div>

                  {/* Mobile : cartes */}
                  <div className="space-y-3 md:hidden">
                    {tache.creneaux.map((cr) => (
                      <CarteCreneau
                        key={cr.id}
                        tacheNom={tache.nom}
                        debut={cr.debut}
                        fin={cr.fin}
                        inscrits={cr.inscrits}
                        necessaires={cr.necessaires}
                        selected={inscribed.has(cr.id)}
                        onToggle={
                          inscribed.has(cr.id)
                            ? undefined
                            : () =>
                                openForCreneau(
                                  cr.id,
                                  `${pole.nom} · ${tache.nom} · ${formatPlage(cr.debut, cr.fin)}`,
                                )
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Dialogs */}
      <InscriptionDialog
        open={dialogMode === "form"}
        onOpenChange={(open) => !open && setDialogMode(null)}
        creneauId={activeCreneau?.id ?? ""}
        initialIdentite={effectiveIdentite}
        onConfirm={register}
      />

      {effectiveIdentite && (
        <ConfirmationDialog
          open={dialogMode === "confirm"}
          onOpenChange={(open) => !open && setDialogMode(null)}
          creneauLabel={activeCreneau?.label ?? ""}
          identite={effectiveIdentite}
          onConfirm={() => register(effectiveIdentite)}
          onEditIdentite={() => setDialogMode("form")}
        />
      )}
    </div>
  );
}

/** Full-screen centered wrapper for loading and error states. */
function Center({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`grid min-h-screen place-items-center text-label ${className}`}>{children}</div>;
}
