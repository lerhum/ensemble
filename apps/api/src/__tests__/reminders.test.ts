import { describe, it, expect } from "vitest";
import { selectDueReminders, type DueInscriptionRow } from "../reminders.js";

function makeRow(overrides: Partial<DueInscriptionRow> = {}): DueInscriptionRow {
  return {
    creneauId: "cr-1",
    volunteerId: "v-1",
    creneau: {
      debut: "13:00",
      fin: "14:00",
      tache: {
        nom: "Serveur",
        pole: {
          nom: "Bar",
          event: { statut: "publie", dateIso: "2026-01-15", nom: "Demo Got's Talent", lieu: "École" },
        },
      },
    },
    volunteer: { email: "alice@example.com", nom: "Alice", statut: "confirme" },
    ...overrides,
  };
}

const NOW = Date.parse("2026-01-15T10:00:00.000Z"); // créneau starts 12:00Z (13:00 CET)

describe("selectDueReminders", () => {
  it("selects an inscription whose créneau starts within the window", () => {
    const rows = [makeRow()];
    expect(selectDueReminders(rows, NOW, 4)).toHaveLength(1);
  });

  it("excludes a créneau starting further out than the window", () => {
    const rows = [makeRow()];
    expect(selectDueReminders(rows, NOW, 1)).toHaveLength(0);
  });

  it("excludes a créneau that already started", () => {
    const rows = [makeRow()];
    expect(selectDueReminders(rows, Date.parse("2026-01-15T13:00:00.000Z"), 4)).toHaveLength(0);
  });

  it("excludes unpublished events", () => {
    const rows = [makeRow({ creneau: { ...makeRow().creneau, tache: { nom: "Serveur", pole: { nom: "Bar", event: { statut: "brouillon", dateIso: "2026-01-15", nom: "x", lieu: "" } } } } })];
    expect(selectDueReminders(rows, NOW, 4)).toHaveLength(0);
  });

  it("excludes waitlisted volunteers", () => {
    const rows = [makeRow({ volunteer: { email: "a@b.com", nom: "Bob", statut: "attente" } })];
    expect(selectDueReminders(rows, NOW, 4)).toHaveLength(0);
  });
});
