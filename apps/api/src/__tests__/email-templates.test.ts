import { describe, it, expect } from "vitest";
import { confirmationHtml, confirmationText } from "../routes/public.js";
import { reminderHtml, reminderText } from "../reminders.js";
import { broadcastHtml, broadcastText } from "../routes/admin.js";

describe("confirmation email", () => {
  it("uses the bare (French) lang attribute and unprefixed links for locale fr", () => {
    const html = confirmationHtml(
      "Alice",
      "http://localhost:5173/confirmer/tok",
      "http://localhost:5173/mes-inscriptions/tok",
      "http://localhost:5173/definir-mot-de-passe/tok",
      "fr",
    );
    expect(html).toContain('lang="fr"');
    expect(html).toContain("http://localhost:5173/confirmer/tok");
    expect(html).toContain("Bonjour Alice 👋");
  });

  it("uses lang=nl for locale nl (URLs are pre-built by the caller, only lang/text are locale-driven here)", () => {
    const html = confirmationHtml(
      "Alice",
      "http://localhost:5173/nl/confirmer/tok",
      "http://localhost:5173/nl/mes-inscriptions/tok",
      "http://localhost:5173/nl/definir-mot-de-passe/tok",
      "nl",
    );
    expect(html).toContain('lang="nl"');
    expect(html).toContain("http://localhost:5173/nl/confirmer/tok");
  });

  it("translates the plain-text body greeting for the recipient's locale, keeping the signature untranslated (brand name)", () => {
    const text = confirmationText("Alice", "http://localhost:5173/confirmer/tok", "nl");
    expect(text).toContain("Hallo Alice,");
    expect(text).toContain("Ensemble");
  });
});

describe("reminder email", () => {
  it("sets lang from the recipient's locale and bolds the event name in the HTML body", () => {
    const html = reminderHtml(
      "Alice",
      "Demo Got's Talent",
      "Serveur",
      "Bar",
      "13:00",
      "14:00",
      "Salle des fêtes",
      "nl",
    );
    expect(html).toContain('lang="nl"');
    expect(html).toContain("<strong>Demo Got's Talent</strong>");
  });

  it("does not bold the event name in the plain-text body", () => {
    const text = reminderText(
      "Alice",
      "Demo Got's Talent",
      "Serveur",
      "Bar",
      "13:00",
      "14:00",
      "Salle des fêtes",
      "fr",
    );
    expect(text).not.toContain("<strong>");
    expect(text).toContain("Demo Got's Talent");
  });
});

describe("admin broadcast email wrapper", () => {
  it("sets lang from the recipient's locale but never translates the admin's free-typed message", () => {
    const adminMessage = "Ceci est un message rédigé par l'admin, à ne jamais traduire.";
    const htmlFr = broadcastHtml("Alice", adminMessage, "fr");
    const htmlNl = broadcastHtml("Alice", adminMessage, "nl");
    expect(htmlFr).toContain('lang="fr"');
    expect(htmlNl).toContain('lang="nl"');
    expect(htmlFr).toContain(adminMessage);
    expect(htmlNl).toContain(adminMessage);
  });

  it("plain-text body carries the admin's message verbatim regardless of locale", () => {
    const adminMessage = "Message libre, verbatim.";
    expect(broadcastText("Alice", adminMessage, "fr")).toContain(adminMessage);
    expect(broadcastText("Alice", adminMessage, "en")).toContain(adminMessage);
  });
});
