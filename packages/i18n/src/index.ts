// Cœur partagé front + back : zéro dépendance Node ni navigateur.
// Dictionnaires fr/nl/en (clés d'erreur, puis emails/CSV/statuts au fil des issues suivantes)
// et un helper t() de résolution de clé à points, utilisable tel quel côté API.
import fr from "./locales/fr.json";
import nl from "./locales/nl.json";
import en from "./locales/en.json";

export type SupportedLocale = "fr" | "nl" | "en";

export const SUPPORTED_LOCALES: SupportedLocale[] = ["fr", "nl", "en"];
export const FALLBACK_LOCALE: SupportedLocale = "fr";

type DictionaryValue = string | { [key: string]: DictionaryValue };
export type Dictionary = Record<string, DictionaryValue>;

export const dictionaries: Record<SupportedLocale, Dictionary> = { fr, nl, en };

function lookup(locale: SupportedLocale, key: string): string | undefined {
  const segments = key.split(".");
  let node: DictionaryValue | undefined = dictionaries[locale];
  for (const segment of segments) {
    if (typeof node !== "object" || node === null) return undefined;
    node = node[segment];
  }
  return typeof node === "string" ? node : undefined;
}

/**
 * Resolves a dot-path key (e.g. "errors.notFound") for the given locale, with pluralization
 * (`_one`/`_other` suffix, driven by `params.count`), fallback to French when the key is missing
 * in the requested locale, and simple `{placeholder}` interpolation.
 */
export function t(
  locale: SupportedLocale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const pluralKey =
    typeof params?.count === "number"
      ? `${key}_${params.count === 1 ? "one" : "other"}`
      : undefined;

  const template =
    (pluralKey && lookup(locale, pluralKey)) ??
    lookup(locale, key) ??
    (pluralKey && lookup(FALLBACK_LOCALE, pluralKey)) ??
    lookup(FALLBACK_LOCALE, key);

  if (template === undefined) {
    console.warn(`[@ensemble/i18n] missing key "${key}" for locale "${locale}"`);
    return key;
  }

  if (!params) return template;

  return Object.entries(params).reduce(
    (acc, [name, value]) => acc.replaceAll(`{${name}}`, String(value)),
    template,
  );
}
