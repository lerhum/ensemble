import type { Context } from "hono";
import { SUPPORTED_LOCALES, FALLBACK_LOCALE, type SupportedLocale } from "@ensemble/i18n";

function isSupportedLocale(value: string | undefined): value is SupportedLocale {
  return !!value && (SUPPORTED_LOCALES as string[]).includes(value);
}

/** Resolves the request's locale: ?locale= query param, then the Accept-Language primary tag, then French. */
export function resolveLocale(c: Context): SupportedLocale {
  const queryLocale = c.req.query("locale");
  if (isSupportedLocale(queryLocale)) return queryLocale;

  const acceptLanguage = c.req.header("accept-language");
  const primaryTag = acceptLanguage?.split(",")[0]?.split("-")[0]?.trim().toLowerCase();
  if (isSupportedLocale(primaryTag)) return primaryTag;

  return FALLBACK_LOCALE;
}

/** Coerces a raw stored value (e.g. `volunteers.locale`, a plain unconstrained text column, or a zod-inferred type zod still widens to include `undefined`) to a SupportedLocale, falling back to French. */
export function normalizeLocale(raw: string | undefined): SupportedLocale {
  return isSupportedLocale(raw) ? raw : FALLBACK_LOCALE;
}

/** Prefixes `path` with the locale segment ("/nl", "/en"), or leaves it bare for French — mirrors the frontend's withLocalePrefix (B6), simplified since server-built paths are always fresh, never an existing browser URL to strip a prefix from. */
export function localizedPath(webOrigin: string, path: string, locale: SupportedLocale): string {
  return `${webOrigin}${locale === "fr" ? "" : "/" + locale}${path}`;
}

export { t } from "@ensemble/i18n";
export type { SupportedLocale } from "@ensemble/i18n";
