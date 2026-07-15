import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { resolveLocale, normalizeLocale, localizedPath } from "../i18n.js";

async function resolve(path: string, headers?: Record<string, string>) {
  const app = new Hono();
  let resolved: string | undefined;
  app.get("/", (c) => {
    resolved = resolveLocale(c);
    return c.text("ok");
  });
  await app.request(path, { headers });
  return resolved;
}

describe("resolveLocale", () => {
  it("prefers the ?locale= query param when supported", async () => {
    expect(await resolve("/?locale=nl")).toBe("nl");
  });

  it("ignores an unsupported ?locale= value and falls through", async () => {
    expect(await resolve("/?locale=de")).toBe("fr");
  });

  it("falls back to the Accept-Language primary tag when no query param is given", async () => {
    expect(await resolve("/", { "Accept-Language": "en-US,en;q=0.9" })).toBe("en");
  });

  it("defaults to French when neither is present or supported", async () => {
    expect(await resolve("/")).toBe("fr");
    expect(await resolve("/", { "Accept-Language": "de-DE" })).toBe("fr");
  });

  it("prioritizes the query param over Accept-Language", async () => {
    expect(await resolve("/?locale=nl", { "Accept-Language": "en-US" })).toBe("nl");
  });
});

describe("normalizeLocale", () => {
  it("passes through a supported locale", () => {
    expect(normalizeLocale("nl")).toBe("nl");
    expect(normalizeLocale("en")).toBe("en");
    expect(normalizeLocale("fr")).toBe("fr");
  });

  it("falls back to French for an unsupported or empty value", () => {
    expect(normalizeLocale("de")).toBe("fr");
    expect(normalizeLocale("")).toBe("fr");
  });
});

describe("localizedPath", () => {
  it("leaves the path bare for French", () => {
    expect(localizedPath("http://localhost:5173", "/confirmer/abc", "fr")).toBe(
      "http://localhost:5173/confirmer/abc",
    );
  });

  it("prefixes the path with the locale segment for nl/en", () => {
    expect(localizedPath("http://localhost:5173", "/confirmer/abc", "nl")).toBe(
      "http://localhost:5173/nl/confirmer/abc",
    );
    expect(localizedPath("http://localhost:5173", "/confirmer/abc", "en")).toBe(
      "http://localhost:5173/en/confirmer/abc",
    );
  });
});
