import { describe, it, expect } from "vitest";
import { statusMeta } from "@/components/primitives/status.js";
import { STATUS_COLORS } from "@ensemble/db/shared";

// statusMeta() now sources its label via i18n.t(), and i18n.ts defaults to "fr" with no
// changeLanguage() call in this suite — so these assertions verify the default French rendering
// (including real i18next pluralization for placesLeft), not the label structure independently
// of language. nl/en coverage lives in the translation-content QA pass (D1/D2).
describe("statusMeta", () => {
  it("returns complet metadata when slot is full", () => {
    const m = statusMeta(10, 10);
    expect(m.status).toBe("complet");
    expect(m.badgeVariant).toBe("success");
    expect(m.label).toBe("Complet");
    expect(m.placesLibres).toBe(0);
  });

  it("returns urgent metadata when 0 signups", () => {
    const m = statusMeta(0, 5);
    expect(m.status).toBe("urgent");
    expect(m.badgeVariant).toBe("danger");
    expect(m.label).toBe("Urgent");
    expect(m.placesLibres).toBe(5);
  });

  it("returns ambre metadata when 1 spot remaining", () => {
    const m = statusMeta(4, 5);
    expect(m.status).toBe("ambre");
    expect(m.badgeVariant).toBe("warn");
    expect(m.label).toBe("1 place");
    expect(m.placesLibres).toBe(1);
  });

  it("returns cours metadata with N places label", () => {
    const m = statusMeta(2, 5);
    expect(m.status).toBe("cours");
    expect(m.badgeVariant).toBe("default");
    expect(m.label).toBe("3 places");
    expect(m.placesLibres).toBe(3);
  });

  it("placesLibres is never negative", () => {
    const m = statusMeta(99, 5);
    expect(m.placesLibres).toBe(0);
  });

  it("color tokens match STATUS_COLORS for complet", () => {
    const m = statusMeta(5, 5);
    expect(m.fg).toBe(STATUS_COLORS.complet.fg);
    expect(m.bg).toBe(STATUS_COLORS.complet.bg);
    expect(m.fill).toBe(STATUS_COLORS.complet.bar);
  });

  it("color tokens match STATUS_COLORS for urgent", () => {
    const m = statusMeta(0, 3);
    expect(m.fg).toBe(STATUS_COLORS.urgent.fg);
    expect(m.fill).toBe(STATUS_COLORS.urgent.bar);
  });
});
