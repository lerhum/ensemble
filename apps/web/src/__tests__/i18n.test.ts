import { describe, it, expect } from "vitest";
import i18n from "@/i18n.js";

describe("i18n", () => {
  it("defaults to French", () => {
    expect(i18n.language).toBe("fr");
  });

  it("resolves a common namespace key to its French value", () => {
    expect(i18n.t("nav.home", { ns: "common" })).toBe("Accueil");
    expect(i18n.t("nav.myRegistrations", { ns: "common" })).toBe("Mes inscriptions");
    expect(i18n.t("nav.logout", { ns: "common" })).toBe("Se déconnecter");
    expect(i18n.t("nav.login", { ns: "common" })).toBe("Se connecter");
  });

  it("has all five namespaces registered for French, including still-empty stubs", () => {
    for (const ns of ["common", "public", "auth", "admin", "errors"]) {
      expect(i18n.hasResourceBundle("fr", ns)).toBe(true);
    }
  });
});
