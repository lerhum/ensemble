import { describe, it, expect } from "vitest";
import { creneauStartInstant } from "../scheduling.js";

describe("creneauStartInstant", () => {
  it("converts a winter (CET, UTC+1) local time to UTC", () => {
    const d = creneauStartInstant("2026-01-15", "13:00");
    expect(d?.toISOString()).toBe("2026-01-15T12:00:00.000Z");
  });

  it("converts a summer (CEST, UTC+2) local time to UTC", () => {
    const d = creneauStartInstant("2026-07-15", "13:00");
    expect(d?.toISOString()).toBe("2026-07-15T11:00:00.000Z");
  });

  it("returns null for a missing dateIso", () => {
    expect(creneauStartInstant(null, "13:00")).toBeNull();
  });

  it("returns null for a malformed debut", () => {
    expect(creneauStartInstant("2026-01-15", "not-a-time")).toBeNull();
  });
});
