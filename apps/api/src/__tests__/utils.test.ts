import { describe, it, expect } from "vitest";
import { slugify } from "../utils.js";

describe("slugify", () => {
  it("strips diacritics", () => {
    expect(slugify("Pêche aux canards")).toBe("peche-aux-canards");
  });

  it("lowercases", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("replaces special chars and spaces with hyphens", () => {
    expect(slugify("Bar & Grillades!")).toBe("bar-grillades");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("  --Hello World--  ")).toBe("hello-world");
  });

  it("returns empty string for empty input", () => {
    expect(slugify("")).toBe("");
  });

  it("truncates to 60 characters", () => {
    const long = "a".repeat(80);
    expect(slugify(long).length).toBeLessThanOrEqual(60);
  });

  it("handles fully non-ASCII strings", () => {
    expect(slugify("été")).toBe("ete");
  });

  it("collapses multiple separators into one hyphen", () => {
    expect(slugify("foo   bar")).toBe("foo-bar");
  });
});
