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

  it("has all five namespaces registered for French", () => {
    for (const ns of ["common", "public", "auth", "admin", "errors"]) {
      expect(i18n.hasResourceBundle("fr", ns)).toBe(true);
    }
  });

  it("resolves the errors namespace from the shared @ensemble/i18n package, not a local file", () => {
    // The "errors" i18next namespace resource is already dictionaries.fr.errors (the object
    // sliced from under the "errors." prefix in @ensemble/i18n), so the key here is "notFound",
    // not "errors.notFound".
    expect(i18n.t("notFound", { ns: "errors" })).toBe("Ressource introuvable");
  });

  it("resolves an apps/api stable error key (C1) to its French sentence", () => {
    expect(i18n.t("slotFull", { ns: "errors" })).toBe("Ce créneau est complet.");
  });
});
