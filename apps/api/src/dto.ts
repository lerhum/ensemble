// Construction des DTO dérivés (event détaillé, bénévoles filtrés) à partir des
// requêtes relationnelles Drizzle. Partagé entre routes publiques et admin.
import { desc, eq } from "drizzle-orm";
import { creneaux, events, volunteers, volunteerTokens } from "@ensemble/db";
import {
  slotStatus,
  type EventDTO,
  type EventDetailDTO,
  type MesInscriptionsDTO,
  type PoleDTO,
  type VolunteerDTO,
  type VolunteerFilter,
} from "@ensemble/db/shared";
import type { Db } from "@ensemble/db/node";

/** Sort comparator for entities with a position field, ascending. */
const asc =
  <T extends { position: number }>() =>
  (a: T, b: T) =>
    a.position - b.position;

/** Loads a slot with its task/pole tree (to derive eventId) and existing inscriptions. Shared by public and admin routes. */
export async function loadCreneau(db: Db, id: string) {
  return db.query.creneaux.findFirst({
    where: eq(creneaux.id, id),
    with: { inscriptions: true, tache: { with: { pole: true } } },
  });
}

/** Returns a lightweight list of all events (no pole tree, ordered by creation date). */
export async function listEvents(db: Db): Promise<EventDTO[]> {
  const rows = await db.query.events.findMany({ orderBy: desc(events.createdAt) });
  return rows.map((ev) => ({
    id: ev.id,
    slug: ev.slug,
    nom: ev.nom,
    date: ev.date,
    dateIso: ev.dateIso,
    horaires: ev.horaires,
    lieu: ev.lieu,
    histoire: ev.histoire,
    banniere: ev.banniere,
    couleurTheme: ev.couleurTheme,
    orgNom: ev.orgNom,
    statut: ev.statut,
    pourquoiTitre: ev.pourquoiTitre,
    pourquoiTexte: ev.pourquoiTexte,
  }));
}

/** Loads a full event (poles→taches→creneaux + inscriptions) by slug. Pass publicOnly=true to restrict to published events. */
export async function buildEventDetailBySlug(
  db: Db,
  slug: string,
  publicOnly = false,
): Promise<EventDetailDTO | null> {
  const ev = await db.query.events.findFirst({
    where: publicOnly
      ? (t, { and, eq: _eq }) => and(_eq(t.slug, slug), _eq(t.statut, "publie"))
      : eq(events.slug, slug),
    with: {
      poles: {
        with: {
          taches: {
            with: {
              creneaux: { with: { inscriptions: true } },
            },
          },
        },
      },
    },
  });
  if (!ev) return null;
  return assembleEventDetail(ev);
}

export type EventWithTree = NonNullable<Awaited<ReturnType<typeof loadTree>>>;
/** Loads a raw event tree (poles→taches→creneaux + inscriptions) by id. */
function loadTree(db: Db, id: string) {
  return db.query.events.findFirst({
    where: eq(events.id, id),
    with: {
      poles: {
        with: { taches: { with: { creneaux: { with: { inscriptions: true } } } } },
      },
    },
  });
}

/** Loads a full event detail by id (used after admin create/edit). */
export async function buildEventDetailById(db: Db, id: string): Promise<EventDetailDTO | null> {
  const ev = await loadTree(db, id);
  return ev ? assembleEventDetail(ev) : null;
}

/** Assembles an EventDetailDTO from a raw Drizzle event tree, computing per-slot status and aggregated counters. */
export function assembleEventDetail(ev: EventWithTree): EventDetailDTO {
  let totalInscrits = 0;
  let totalNecessaires = 0;
  let nbCreneaux = 0;
  let aCompleter = 0;

  const poles: PoleDTO[] = [...ev.poles].sort(asc()).map((p) => {
    let pInscrits = 0;
    let pNecessaires = 0;
    let pNbCreneaux = 0;
    const taches = [...p.taches].sort(asc()).map((t) => {
      const creneaux = [...t.creneaux].sort(asc()).map((cr) => {
        const inscrits = cr.inscriptions.length;
        pInscrits += inscrits;
        pNecessaires += cr.necessaires;
        pNbCreneaux += 1;
        nbCreneaux += 1;
        totalInscrits += inscrits;
        totalNecessaires += cr.necessaires;
        const statut = slotStatus(inscrits, cr.necessaires);
        if (statut !== "complet") aCompleter += 1;
        return {
          id: cr.id,
          debut: cr.debut,
          fin: cr.fin,
          necessaires: cr.necessaires,
          inscrits,
          position: cr.position,
          statut,
        };
      });
      return { id: t.id, nom: t.nom, description: t.description, position: t.position, creneaux };
    });
    return {
      id: p.id,
      nom: p.nom,
      description: p.description,
      position: p.position,
      taches,
      inscrits: pInscrits,
      necessaires: pNecessaires,
      nbCreneaux: pNbCreneaux,
      placesLibres: Math.max(0, pNecessaires - pInscrits),
    };
  });

  return {
    id: ev.id,
    slug: ev.slug,
    nom: ev.nom,
    date: ev.date,
    dateIso: ev.dateIso,
    horaires: ev.horaires,
    lieu: ev.lieu,
    histoire: ev.histoire,
    banniere: ev.banniere,
    couleurTheme: ev.couleurTheme,
    orgNom: ev.orgNom,
    statut: ev.statut,
    pourquoiTitre: ev.pourquoiTitre,
    pourquoiTexte: ev.pourquoiTexte,
    poles,
    counters: {
      inscrits: totalInscrits,
      necessaires: totalNecessaires,
      nbPoles: poles.length,
      nbCreneaux,
      aCompleter,
    },
  };
}

/** Returns a volunteer's signup summary by volunteerId (used for authenticated volunteer sessions). */
export async function buildMesInscriptionsByVolunteerId(
  db: Db,
  volunteerId: string,
): Promise<MesInscriptionsDTO | null> {
  const vol = await db.query.volunteers.findFirst({
    where: eq(volunteers.id, volunteerId),
    with: {
      event: true,
      inscriptions: {
        with: { creneau: { with: { tache: { with: { pole: true } } } } },
      },
      tokens: true,
    },
  });
  if (!vol) return null;
  const { event } = vol;
  const hasConfirmedToken = vol.tokens.some((t) => t.confirmedAt !== null);
  return {
    // Session bénévole : n'existe que pour un email/mot de passe défini, donc email non-null ici.
    volunteer: { nom: vol.nom, email: vol.email!, statut: vol.statut },
    event: {
      nom: event.nom,
      date: event.date,
      horaires: event.horaires,
      lieu: event.lieu,
      slug: event.slug,
      orgNom: event.orgNom,
      couleurTheme: event.couleurTheme,
    },
    inscriptions: vol.inscriptions.map((ins) => ({
      poleNom: ins.creneau.tache.pole.nom,
      tacheNom: ins.creneau.tache.nom,
      debut: ins.creneau.debut,
      fin: ins.creneau.fin,
    })),
    confirmed: vol.statut === "confirme" || hasConfirmedToken,
  };
}

/** Returns a volunteer's signup summary by email-link token. */
export async function buildMesInscriptions(
  db: Db,
  token: string,
): Promise<MesInscriptionsDTO | null> {
  const row = await db.query.volunteerTokens.findFirst({
    where: eq(volunteerTokens.token, token),
    with: {
      volunteer: {
        with: {
          event: true,
          inscriptions: {
            with: { creneau: { with: { tache: { with: { pole: true } } } } },
          },
        },
      },
    },
  });
  if (!row) return null;
  const { volunteer } = row;
  const { event } = volunteer;
  return {
    // Token de confirmation : créé uniquement pour une inscription publique avec email, donc non-null ici.
    volunteer: { nom: volunteer.nom, email: volunteer.email!, statut: volunteer.statut },
    event: {
      nom: event.nom,
      date: event.date,
      horaires: event.horaires,
      lieu: event.lieu,
      slug: event.slug,
      orgNom: event.orgNom,
      couleurTheme: event.couleurTheme,
    },
    inscriptions: volunteer.inscriptions.map((ins) => ({
      poleNom: ins.creneau.tache.pole.nom,
      tacheNom: ins.creneau.tache.nom,
      debut: ins.creneau.debut,
      fin: ins.creneau.fin,
    })),
    confirmed: row.confirmedAt !== null,
  };
}

/** Applies cumulative volunteer filters (statut, pole, creneau, q) to an in-memory list. */
export function filterVolunteers(dtos: VolunteerDTO[], filter: VolunteerFilter): VolunteerDTO[] {
  const q = filter.q?.trim().toLowerCase();
  return dtos.filter((v) => {
    if (filter.statut && v.statut !== filter.statut) return false;
    if (filter.pole && !v.poles.some((p) => p.id === filter.pole)) return false;
    if (filter.tache && !v.creneaux.some((cr) => cr.tacheId === filter.tache)) return false;
    if (filter.creneau && !v.creneaux.some((cr) => cr.id === filter.creneau)) return false;
    if (q && !(v.nom.toLowerCase().includes(q) || (v.email ?? "").toLowerCase().includes(q)))
      return false;
    return true;
  });
}

/** Returns filtered volunteers for an event (q + pole + creneau + statut filters are cumulative). */
export async function buildVolunteers(
  db: Db,
  eventId: string,
  filter: VolunteerFilter,
): Promise<VolunteerDTO[]> {
  const rows = await db.query.volunteers.findMany({
    where: eq(volunteers.eventId, eventId),
    with: {
      inscriptions: {
        with: { creneau: { with: { tache: { with: { pole: true } } } } },
      },
    },
  });

  const dtos = rows.map((v): VolunteerDTO => {
    const polesMap = new Map<string, string>();
    const creneaux = v.inscriptions.map((ins) => {
      const cr = ins.creneau;
      const pole = cr.tache.pole;
      polesMap.set(pole.id, pole.nom);
      return { id: cr.id, tacheId: cr.tache.id, tache: cr.tache.nom, debut: cr.debut, fin: cr.fin };
    });
    return {
      id: v.id,
      nom: v.nom,
      email: v.email,
      tel: v.tel,
      statut: v.statut,
      poles: [...polesMap].map(([id, nom]) => ({ id, nom })),
      creneaux,
    };
  });

  return filterVolunteers(dtos, filter);
}

/** Serializes a volunteer list to CSV (UTF-8 BOM for Excel compatibility, comma-separated). */
export function volunteersToCsv(list: VolunteerDTO[]): string {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const header = ["Nom", "Email", "Téléphone", "Pôle(s)", "Créneaux", "Statut"];
  const lines = list.map((v) =>
    [
      v.nom,
      v.email ?? "",
      v.tel ?? "",
      v.poles.map((p) => p.nom).join(" / "),
      v.creneaux.map((cr) => `${cr.tache} ${cr.debut}-${cr.fin}`).join(" / "),
      v.statut === "confirme" ? "Confirmé" : "En attente",
    ]
      .map(esc)
      .join(","),
  );
  // BOM pour Excel + séparateur virgule.
  return "﻿" + [header.map(esc).join(","), ...lines].join("\r\n");
}
