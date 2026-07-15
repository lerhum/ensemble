import { describe, it, expect, vi } from "vitest";
import { t, dictionaries, SUPPORTED_LOCALES, FALLBACK_LOCALE } from "../index.js";

describe("dictionaries", () => {
  it("registers all three supported locales", () => {
    expect(SUPPORTED_LOCALES).toEqual(["fr", "nl", "en"]);
    for (const locale of SUPPORTED_LOCALES) {
      expect(dictionaries[locale]).toBeDefined();
    }
  });

  it("defaults the fallback locale to French", () => {
    expect(FALLBACK_LOCALE).toBe("fr");
  });
});

describe("t", () => {
  it("resolves a nested dot-path key in French", () => {
    expect(t("fr", "errors.notFound")).toBe("Ressource introuvable");
  });

  it("falls back to French when the key is missing in the requested locale, without warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(t("nl", "errors.notFound")).toBe("Ressource introuvable");
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("returns the key itself and warns when missing in every locale", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(t("fr", "errors.doesNotExist")).toBe("errors.doesNotExist");
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("does not choke when params are passed for a template with no {placeholder}", () => {
    expect(t("fr", "errors.notFound", { who: "test" })).toBe("Ressource introuvable");
  });

  // No dictionary key uses {placeholder}/pluralization yet — this issue's only real content is
  // errors.notFound. Interpolation/pluralization substitution gets exercised for real once C2's
  // email templates (which need both) land; see packages/i18n's t() implementation for the logic.
});
