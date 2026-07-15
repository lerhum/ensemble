import { describe, it, expect } from "vitest";
import {
  volunteersToCsv,
  filterVolunteers,
  assembleEventDetail,
  type EventWithTree,
} from "../dto.js";
import type { VolunteerDTO } from "@ensemble/db/shared";

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeVolunteer(overrides: Partial<VolunteerDTO> = {}): VolunteerDTO {
  return {
    id: "v-1",
    nom: "Alice Dupont",
    email: "alice@example.com",
    tel: null,
    statut: "confirme",
    locale: "fr",
    poles: [{ id: "p-1", nom: "Bar" }],
    creneaux: [{ id: "cr-1", tacheId: "t-1", tache: "Serveur", debut: "10:00", fin: "12:00" }],
    ...overrides,
  };
}

function makeEvent(poles: unknown[] = []): EventWithTree {
  return {
    id: "evt-1",
    slug: "test-event",
    nom: "Test Event",
    date: "1 mai",
    dateIso: "2025-05-01",
    horaires: "10h-18h",
    lieu: "Bruxelles",
    histoire: "",
    banniere: null,
    couleurTheme: "#DA4A40",
    orgNom: "École Test",
    statut: "publie",
    pourquoiTitre: "",
    pourquoiTexte: "",
    createdAt: new Date("2025-01-01"),
    poles,
  } as unknown as EventWithTree;
}

function makePole(creneauxDefs: { necessaires: number; inscriptions: number }[], poleId = "p-1") {
  return {
    id: poleId,
    nom: "Bar",
    description: "",
    position: 0,
    taches: [
      {
        id: "t-1",
        nom: "Serveur",
        description: "",
        position: 0,
        creneaux: creneauxDefs.map((def, i) => ({
          id: `cr-${i}`,
          debut: "10:00",
          fin: "12:00",
          necessaires: def.necessaires,
          position: i,
          inscriptions: Array.from({ length: def.inscriptions }, (_, j) => ({
            id: `ins-${i}-${j}`,
          })),
        })),
      },
    ],
  };
}

// ── volunteersToCsv ───────────────────────────────────────────────────────────

describe("volunteersToCsv", () => {
  it("returns BOM + header only for empty list", () => {
    const csv = volunteersToCsv([]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("Nom");
    expect(csv).toContain("Email");
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(1);
  });

  it("produces one data line per volunteer", () => {
    const csv = volunteersToCsv([
      makeVolunteer(),
      makeVolunteer({ id: "v-2", email: "bob@test.com" }),
    ]);
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(3); // header + 2 data
  });

  it("labels confirme as Confirmé", () => {
    expect(volunteersToCsv([makeVolunteer({ statut: "confirme" })])).toContain("Confirmé");
  });

  it("labels attente as En attente", () => {
    expect(volunteersToCsv([makeVolunteer({ statut: "attente" })])).toContain("En attente");
  });

  it("defaults to French headers when no locale is given", () => {
    const csv = volunteersToCsv([makeVolunteer()]);
    expect(csv).toContain('"Nom","Email","Téléphone","Pôle(s)","Créneaux","Statut"');
  });

  it("translates headers for an explicit locale", () => {
    const csv = volunteersToCsv([makeVolunteer()], "nl");
    expect(csv).toContain('"Naam","E-mail","Telefoon","Stand(s)","Tijdsloten","Status"');
  });

  it("escapes double quotes inside fields", () => {
    const csv = volunteersToCsv([makeVolunteer({ nom: 'Alice "La Grande" Dupont' })]);
    expect(csv).toContain('""La Grande""');
  });

  it("joins multiple poles with ' / '", () => {
    const csv = volunteersToCsv([
      makeVolunteer({
        poles: [
          { id: "p-1", nom: "Bar" },
          { id: "p-2", nom: "Grimage" },
        ],
      }),
    ]);
    expect(csv).toContain("Bar / Grimage");
  });

  it("joins multiple créneaux with ' / '", () => {
    const csv = volunteersToCsv([
      makeVolunteer({
        creneaux: [
          { id: "cr-1", tacheId: "t-1", tache: "Serveur", debut: "10:00", fin: "12:00" },
          { id: "cr-2", tacheId: "t-2", tache: "Caisse", debut: "14:00", fin: "16:00" },
        ],
      }),
    ]);
    expect(csv).toContain(" / ");
  });

  it("handles null tel gracefully", () => {
    expect(() => volunteersToCsv([makeVolunteer({ tel: null })])).not.toThrow();
  });
});

// ── filterVolunteers ──────────────────────────────────────────────────────────

describe("filterVolunteers", () => {
  const alice = makeVolunteer({
    statut: "confirme",
    locale: "fr",
    poles: [{ id: "p-1", nom: "Bar" }],
    creneaux: [{ id: "cr-1", tacheId: "t-1", tache: "Serveur", debut: "10:00", fin: "12:00" }],
  });
  const bob = makeVolunteer({
    id: "v-2",
    nom: "Bob Martin",
    email: "bob@example.com",
    statut: "attente",
    poles: [{ id: "p-2", nom: "Grimage" }],
    creneaux: [{ id: "cr-2", tacheId: "t-2", tache: "Maquillage", debut: "14:00", fin: "16:00" }],
  });
  const list = [alice, bob];

  it("filters by tache UUID", () => {
    const result = filterVolunteers(list, { tache: "t-2" });
    expect(result).toHaveLength(1);
    expect(result[0]?.nom).toBe("Bob Martin");
  });

  it("returns all when filter is empty", () => {
    expect(filterVolunteers(list, {})).toHaveLength(2);
  });

  it("filters by statut confirme", () => {
    const result = filterVolunteers(list, { statut: "confirme" });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("v-1");
  });

  it("filters by statut attente", () => {
    const result = filterVolunteers(list, { statut: "attente" });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("v-2");
  });

  it("filters by pole UUID", () => {
    const result = filterVolunteers(list, { pole: "p-1" });
    expect(result).toHaveLength(1);
    expect(result[0]?.nom).toBe("Alice Dupont");
  });

  it("filters by creneau UUID", () => {
    const result = filterVolunteers(list, { creneau: "cr-2" });
    expect(result).toHaveLength(1);
    expect(result[0]?.nom).toBe("Bob Martin");
  });

  it("filters by search query on nom (case-insensitive)", () => {
    expect(filterVolunteers(list, { q: "alice" })).toHaveLength(1);
    expect(filterVolunteers(list, { q: "ALICE" })).toHaveLength(1);
  });

  it("filters by search query on email", () => {
    expect(filterVolunteers(list, { q: "bob@example" })).toHaveLength(1);
  });

  it("returns empty when no match", () => {
    expect(filterVolunteers(list, { q: "zzznomatch" })).toHaveLength(0);
  });

  it("applies multiple filters cumulatively (AND logic)", () => {
    const result = filterVolunteers(list, { statut: "confirme", pole: "p-2" });
    expect(result).toHaveLength(0);
  });
});

// ── assembleEventDetail ───────────────────────────────────────────────────────

describe("assembleEventDetail", () => {
  it("returns all-zero counters for an event with no poles", () => {
    const dto = assembleEventDetail(makeEvent([]));
    expect(dto.counters).toEqual({
      inscrits: 0,
      necessaires: 0,
      nbPoles: 0,
      nbCreneaux: 0,
      aCompleter: 0,
    });
    expect(dto.poles).toHaveLength(0);
  });

  it("computes counters for a partially-filled créneau", () => {
    const pole = makePole([{ necessaires: 5, inscriptions: 2 }]);
    const dto = assembleEventDetail(makeEvent([pole]));
    expect(dto.counters.inscrits).toBe(2);
    expect(dto.counters.necessaires).toBe(5);
    expect(dto.counters.nbPoles).toBe(1);
    expect(dto.counters.nbCreneaux).toBe(1);
    expect(dto.counters.aCompleter).toBe(1);
  });

  it("sets créneau statut to cours for partial fill", () => {
    const pole = makePole([{ necessaires: 5, inscriptions: 2 }]);
    const dto = assembleEventDetail(makeEvent([pole]));
    expect(dto.poles[0]?.taches[0]?.creneaux[0]?.statut).toBe("cours");
  });

  it("sets créneau statut to complet when full, and aCompleter stays 0", () => {
    const pole = makePole([{ necessaires: 5, inscriptions: 5 }]);
    const dto = assembleEventDetail(makeEvent([pole]));
    expect(dto.poles[0]?.taches[0]?.creneaux[0]?.statut).toBe("complet");
    expect(dto.counters.aCompleter).toBe(0);
  });

  it("computes pole-level placesLibres correctly", () => {
    const pole = makePole([{ necessaires: 5, inscriptions: 2 }]);
    const dto = assembleEventDetail(makeEvent([pole]));
    expect(dto.poles[0]?.placesLibres).toBe(3);
  });

  it("aggregates across multiple créneaux", () => {
    const pole = makePole([
      { necessaires: 5, inscriptions: 5 }, // complet
      { necessaires: 3, inscriptions: 1 }, // cours
    ]);
    const dto = assembleEventDetail(makeEvent([pole]));
    expect(dto.counters.inscrits).toBe(6);
    expect(dto.counters.necessaires).toBe(8);
    expect(dto.counters.nbCreneaux).toBe(2);
    expect(dto.counters.aCompleter).toBe(1);
  });

  it("passes through event metadata unchanged", () => {
    const dto = assembleEventDetail(makeEvent([]));
    expect(dto.id).toBe("evt-1");
    expect(dto.slug).toBe("test-event");
    expect(dto.couleurTheme).toBe("#DA4A40");
  });
});
