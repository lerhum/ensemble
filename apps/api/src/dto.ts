// Construction des DTO dérivés (event détaillé, bénévoles filtrés) à partir des
// requêtes relationnelles Drizzle. Partagé entre routes publiques et admin.
import { desc, eq } from "drizzle-orm";
import { events, volunteers, volunteerTokens } from "@ensemble/db";
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

const asc =
  <T extends { position: number }>() =>
  (a: T, b: T) =>
    a.position - b.position;

/** Liste légère de tous les événements (sans l'arbre de pôles). */
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

/** Charge un événement complet (pôles→tâches→créneaux + inscriptions) par slug. */
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

type EventWithTree = NonNullable<Awaited<ReturnType<typeof loadTree>>>;
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

/** Variante par id (utilisée après création/édition admin). */
export async function buildEventDetailById(db: Db, id: string): Promise<EventDetailDTO | null> {
  const ev = await loadTree(db, id);
  return ev ? assembleEventDetail(ev) : null;
}

function assembleEventDetail(ev: EventWithTree): EventDetailDTO {
  let totalInscrits = 0;
  let totalNecessaires = 0;
  let nbCreneaux = 0;
  let aCompleter = 0;

  const poles: PoleDTO[] = [...ev.poles]
    .sort(asc())
    .map((p) => {
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

/** Récapitulatif des inscriptions d'un bénévole via son token. */
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
    volunteer: { nom: volunteer.nom, email: volunteer.email, statut: volunteer.statut },
    event: {
      nom: event.nom,
      date: event.date,
      horaires: event.horaires,
      lieu: event.lieu,
      slug: event.slug,
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

/** Bénévoles d'un événement, filtrés (q + pôle + créneau + statut, cumulatifs). */
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

  const q = filter.q?.trim().toLowerCase();

  const dtos = rows.map((v): VolunteerDTO => {
    const polesMap = new Map<string, string>();
    const creneaux = v.inscriptions.map((ins) => {
      const cr = ins.creneau;
      const pole = cr.tache.pole;
      polesMap.set(pole.id, pole.nom);
      return { id: cr.id, tache: cr.tache.nom, debut: cr.debut, fin: cr.fin };
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

  return dtos.filter((v) => {
    if (filter.statut && v.statut !== filter.statut) return false;
    if (filter.pole && !v.poles.some((p) => p.id === filter.pole)) return false;
    if (filter.creneau && !v.creneaux.some((cr) => cr.id === filter.creneau)) return false;
    if (q && !(v.nom.toLowerCase().includes(q) || v.email.toLowerCase().includes(q))) return false;
    return true;
  });
}

/** Sérialise les bénévoles filtrés en CSV (respecte les filtres). */
export function volunteersToCsv(list: VolunteerDTO[]): string {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const header = ["Nom", "Email", "Téléphone", "Pôle(s)", "Créneaux", "Statut"];
  const lines = list.map((v) =>
    [
      v.nom,
      v.email,
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
