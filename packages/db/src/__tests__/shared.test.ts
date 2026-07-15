import { describe, it, expect } from "vitest";
import {
  slotStatus,
  STATUS_COLORS,
  installSchema,
  eventInputSchema,
  creneauInputSchema,
  volunteerFilterSchema,
  broadcastSchema,
  settingsUpdateSchema,
  inscriptionSchema,
} from "../shared.js";

describe("slotStatus", () => {
  it("returns complet when necessaires is 0", () => {
    expect(slotStatus(0, 0)).toBe("complet");
  });

  it("returns complet when inscrits equals necessaires", () => {
    expect(slotStatus(5, 5)).toBe("complet");
  });

  it("returns complet when inscrits exceeds necessaires", () => {
    expect(slotStatus(6, 5)).toBe("complet");
  });

  it("returns urgent when 0 signups", () => {
    expect(slotStatus(0, 5)).toBe("urgent");
  });

  it("returns ambre when exactly 1 spot remaining", () => {
    expect(slotStatus(4, 5)).toBe("ambre");
    expect(slotStatus(1, 2)).toBe("ambre");
  });

  it("returns cours when filling up (more than 1 spot remaining)", () => {
    expect(slotStatus(2, 5)).toBe("cours");
    expect(slotStatus(1, 3)).toBe("cours");
  });
});

describe("STATUS_COLORS", () => {
  it("defines color tokens for all four statuses", () => {
    for (const status of ["complet", "cours", "ambre", "urgent"] as const) {
      const c = STATUS_COLORS[status];
      expect(c.fg).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(c.bg).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(c.bar).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("complet uses green palette", () => {
    expect(STATUS_COLORS.complet.fg).toBe("#2F7E59");
  });

  it("urgent uses red palette", () => {
    expect(STATUS_COLORS.urgent.fg).toBe("#C7443A");
  });
});

describe("installSchema", () => {
  const valid = {
    orgNom: "École Test",
    rgpdEmail: "rgpd@test.be",
    email: "admin@test.be",
    password: "motdepasse",
    confirmPassword: "motdepasse",
  };

  it("accepts a valid payload", () => {
    expect(() => installSchema.parse(valid)).not.toThrow();
  });

  it("rejects mismatched passwords", () => {
    const result = installSchema.safeParse({ ...valid, confirmPassword: "wrong" });
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 8 chars", () => {
    const result = installSchema.safeParse({
      ...valid,
      password: "short",
      confirmPassword: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = installSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects empty orgNom", () => {
    const result = installSchema.safeParse({ ...valid, orgNom: "" });
    expect(result.success).toBe(false);
  });
});

describe("eventInputSchema", () => {
  const valid = { nom: "Gala de l'école" };

  it("accepts minimal valid payload (only nom required)", () => {
    const r = eventInputSchema.safeParse(valid);
    expect(r.success).toBe(true);
  });

  it("rejects invalid hex color", () => {
    const r = eventInputSchema.safeParse({ ...valid, couleurTheme: "rouge" });
    expect(r.success).toBe(false);
  });

  it("accepts lowercase hex color", () => {
    const r = eventInputSchema.safeParse({ ...valid, couleurTheme: "#da4a40" });
    expect(r.success).toBe(true);
  });

  it("rejects histoire longer than 600 chars", () => {
    const r = eventInputSchema.safeParse({ ...valid, histoire: "a".repeat(601) });
    expect(r.success).toBe(false);
  });

  it("accepts histoire of exactly 600 chars", () => {
    const r = eventInputSchema.safeParse({ ...valid, histoire: "a".repeat(600) });
    expect(r.success).toBe(true);
  });

  it("rejects invalid dateIso format", () => {
    const r = eventInputSchema.safeParse({ ...valid, dateIso: "01/01/2025" });
    expect(r.success).toBe(false);
  });

  it("accepts valid dateIso format", () => {
    const r = eventInputSchema.safeParse({ ...valid, dateIso: "2025-06-01" });
    expect(r.success).toBe(true);
  });
});

describe("creneauInputSchema", () => {
  const valid = {
    tacheId: "00000000-0000-0000-0000-000000000001",
    debut: "10:00",
    fin: "12:00",
    necessaires: 3,
  };

  it("accepts a valid payload", () => {
    expect(() => creneauInputSchema.parse(valid)).not.toThrow();
  });

  it("rejects non-HH:MM debut", () => {
    const r = creneauInputSchema.safeParse({ ...valid, debut: "10h00" });
    expect(r.success).toBe(false);
  });

  it("rejects out-of-range hour (25:00)", () => {
    const r = creneauInputSchema.safeParse({ ...valid, debut: "25:00" });
    expect(r.success).toBe(false);
  });

  it("rejects out-of-range minutes (10:60)", () => {
    const r = creneauInputSchema.safeParse({ ...valid, fin: "10:60" });
    expect(r.success).toBe(false);
  });

  it("coerces string necessaires to number", () => {
    const r = creneauInputSchema.safeParse({ ...valid, necessaires: "5" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.necessaires).toBe(5);
  });

  it("rejects necessaires < 1", () => {
    const r = creneauInputSchema.safeParse({ ...valid, necessaires: 0 });
    expect(r.success).toBe(false);
  });
});

describe("volunteerFilterSchema", () => {
  it("accepts empty object", () => {
    expect(() => volunteerFilterSchema.parse({})).not.toThrow();
  });

  it("accepts valid UUID for pole", () => {
    const r = volunteerFilterSchema.safeParse({ pole: "00000000-0000-0000-0000-000000000001" });
    expect(r.success).toBe(true);
  });

  it("rejects non-UUID pole", () => {
    const r = volunteerFilterSchema.safeParse({ pole: "not-a-uuid" });
    expect(r.success).toBe(false);
  });

  it("accepts valid statut values", () => {
    expect(volunteerFilterSchema.safeParse({ statut: "confirme" }).success).toBe(true);
    expect(volunteerFilterSchema.safeParse({ statut: "attente" }).success).toBe(true);
  });

  it("rejects unknown statut", () => {
    const r = volunteerFilterSchema.safeParse({ statut: "invalide" });
    expect(r.success).toBe(false);
  });

  it("accepts valid UUID for tache", () => {
    const r = volunteerFilterSchema.safeParse({ tache: "00000000-0000-0000-0000-000000000001" });
    expect(r.success).toBe(true);
  });

  it("rejects non-UUID tache", () => {
    const r = volunteerFilterSchema.safeParse({ tache: "not-a-uuid" });
    expect(r.success).toBe(false);
  });
});

describe("broadcastSchema", () => {
  it("accepts subject + message with no targeting (defaults to filter: {})", () => {
    const r = broadcastSchema.safeParse({ subject: "Rappel", message: "Merci !" });
    expect(r.success).toBe(true);
  });

  it("accepts an explicit filter", () => {
    const r = broadcastSchema.safeParse({
      subject: "Rappel",
      message: "Merci !",
      filter: { pole: "00000000-0000-0000-0000-000000000001" },
    });
    expect(r.success).toBe(true);
  });

  it("accepts explicit volunteerIds", () => {
    const r = broadcastSchema.safeParse({
      subject: "Rappel",
      message: "Merci !",
      volunteerIds: ["00000000-0000-0000-0000-000000000001"],
    });
    expect(r.success).toBe(true);
  });

  it("rejects an empty subject", () => {
    expect(broadcastSchema.safeParse({ subject: "", message: "Merci !" }).success).toBe(false);
  });

  it("rejects an empty message", () => {
    expect(broadcastSchema.safeParse({ subject: "Rappel", message: "" }).success).toBe(false);
  });
});

describe("inscriptionSchema locale", () => {
  const base = { nom: "Alice", email: "alice@example.com" };

  it("defaults to fr when locale is absent", () => {
    const r = inscriptionSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.locale).toBe("fr");
  });

  it("accepts a supported locale", () => {
    const r = inscriptionSchema.safeParse({ ...base, locale: "nl" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.locale).toBe("nl");
  });

  it("silently falls back to fr for an unsupported locale, never rejecting", () => {
    const r = inscriptionSchema.safeParse({ ...base, locale: "xx" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.locale).toBe("fr");
  });
});

describe("settingsUpdateSchema", () => {
  it("accepts a valid reminderHoursBefore", () => {
    expect(settingsUpdateSchema.safeParse({ reminderHoursBefore: 24 }).success).toBe(true);
  });

  it("rejects reminderHoursBefore below 1", () => {
    expect(settingsUpdateSchema.safeParse({ reminderHoursBefore: 0 }).success).toBe(false);
  });

  it("rejects reminderHoursBefore above 168", () => {
    expect(settingsUpdateSchema.safeParse({ reminderHoursBefore: 200 }).success).toBe(false);
  });

  it("rejects a non-integer reminderHoursBefore", () => {
    expect(settingsUpdateSchema.safeParse({ reminderHoursBefore: 2.5 }).success).toBe(false);
  });
});
