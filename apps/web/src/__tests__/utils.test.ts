import { describe, it, expect } from "vitest";
import { formatHeure, formatPlage, initials, formatFullDate, cn } from "@/lib/utils.js";

describe("formatHeure", () => {
  it("converts HH:MM to HHhMM", () => {
    expect(formatHeure("13:00")).toBe("13h00");
    expect(formatHeure("08:05")).toBe("08h05");
    expect(formatHeure("00:00")).toBe("00h00");
    expect(formatHeure("23:59")).toBe("23h59");
  });
});

describe("formatPlage", () => {
  it("formats a time range as HHhMM – HHhMM", () => {
    expect(formatPlage("08:30", "10:00")).toBe("08h30 – 10h00");
    expect(formatPlage("14:00", "16:30")).toBe("14h00 – 16h30");
  });
});

describe("formatFullDate", () => {
  it("formats a full date in French by default (fr-BE)", () => {
    expect(formatFullDate("2025-05-15", "fr")).toBe("jeudi 15 mai 2025");
  });

  it("formats a full date in Dutch (nl-BE)", () => {
    expect(formatFullDate("2025-05-15", "nl")).toBe("donderdag 15 mei 2025");
  });

  it("formats a full date in English (en-GB)", () => {
    expect(formatFullDate("2025-05-15", "en")).toBe("Thursday, 15 May 2025");
  });

  it("falls back to French for an unsupported locale", () => {
    expect(formatFullDate("2025-05-15", "xx")).toBe("jeudi 15 mai 2025");
  });
});

describe("initials", () => {
  it("extracts first letter of first and last name", () => {
    expect(initials("Jean Dupont")).toBe("JD");
  });

  it("returns single initial for a single name", () => {
    expect(initials("Jean")).toBe("J");
  });

  it("returns only 2 initials even for 3+ word names", () => {
    expect(initials("Jean Marc Pierre")).toBe("JM");
  });

  it("returns empty string for empty input", () => {
    expect(initials("")).toBe("");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(initials("   ")).toBe("");
  });

  it("uppercases initials", () => {
    expect(initials("alice bob")).toBe("AB");
  });

  it("handles extra whitespace between words", () => {
    expect(initials("Jean  Dupont")).toBe("JD");
  });
});

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("resolves Tailwind conflicts (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("filters falsy values", () => {
    expect(cn("foo", false, undefined, "bar")).toBe("foo bar");
  });
});
