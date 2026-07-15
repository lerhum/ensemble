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

export { t } from "@ensemble/i18n";
export type { SupportedLocale } from "@ensemble/i18n";
