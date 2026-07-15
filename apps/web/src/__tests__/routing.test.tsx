import { describe, it, expect } from "vitest";
import { createRoutesFromElements, matchRoutes } from "react-router-dom";
import { routeElements } from "@/routes.js";

const routes = createRoutesFromElements(routeElements());

// Paths already embedded in emails sent to real users — must keep resolving via the bare
// (unprefixed, French) branch, byte-for-byte, forever.
const bareLinksAlreadySent = [
  "/confirmer/abc123",
  "/mes-inscriptions/abc123",
  "/definir-mot-de-passe/abc123",
];

describe("locale-prefixed routing", () => {
  it.each(bareLinksAlreadySent)(
    "resolves already-emailed link %s via the bare French branch",
    (path) => {
      const matches = matchRoutes(routes, path);
      expect(matches).not.toBeNull();
      const matchedPaths = matches!.map((m) => m.route.path);
      expect(matchedPaths).not.toContain("nl");
      expect(matchedPaths).not.toContain("en");
    },
  );

  it("resolves other bare routes (home, event page, admin) unchanged", () => {
    for (const path of ["/", "/e/demo-gots-talent", "/e/demo-gots-talent/pole/1", "/admin"]) {
      const matches = matchRoutes(routes, path);
      expect(matches).not.toBeNull();
    }
  });

  it("resolves /nl/... and /en/... to the same page routes", () => {
    const nl = matchRoutes(routes, "/nl/e/demo-gots-talent");
    const en = matchRoutes(routes, "/en/confirmer/abc123");
    expect(nl).not.toBeNull();
    expect(en).not.toBeNull();
    expect(nl!.map((m) => m.route.path)).toContain("nl");
    expect(en!.map((m) => m.route.path)).toContain("en");
  });

  it("falls through to NotFoundPage for an unsupported locale prefix", () => {
    const matches = matchRoutes(routes, "/de/e/demo-gots-talent");
    expect(matches).not.toBeNull();
    const matchedPaths = matches!.map((m) => m.route.path);
    expect(matchedPaths).not.toContain("nl");
    expect(matchedPaths).not.toContain("en");
    expect(matchedPaths.at(-1)).toBe("*");
  });
});
