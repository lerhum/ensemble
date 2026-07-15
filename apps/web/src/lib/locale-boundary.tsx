import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";

export type SupportedLocale = "fr" | "nl" | "en";

export const LOCALE_STORAGE_KEY = "ens_locale";

/** Forces i18next to the locale matching the current route branch, then renders its children. */
export function LocaleBoundary({ lng }: { lng: SupportedLocale }) {
  const { i18n } = useTranslation();

  useEffect(() => {
    if (i18n.language !== lng) {
      void i18n.changeLanguage(lng);
    }
  }, [lng, i18n]);

  return <Outlet />;
}

/**
 * Strips any existing "nl"/"en" prefix from `pathname`, then reapplies it for `lng` (none for
 * "fr"). Preserves `search` untouched. Pure — used by both LocaleSwitcher and its tests.
 */
export function withLocalePrefix(pathname: string, search: string, lng: SupportedLocale): string {
  const segments = pathname.split("/").filter(Boolean);
  const isPrefixed = segments[0] === "nl" || segments[0] === "en";
  const rest = isPrefixed ? segments.slice(1) : segments;
  const bare = "/" + rest.join("/");
  const prefixed = lng === "fr" ? bare : `/${lng}${bare === "/" ? "" : bare}`;
  return prefixed + search;
}

/**
 * Wraps the bare (French) index route only: redirects to the locale remembered by LocaleSwitcher
 * in localStorage, if any. Never applies to an explicit "/nl" or "/en" visit — those are always
 * rendered as authored, never overridden.
 */
export function LocaleRootRedirect({ children }: { children: React.ReactNode }) {
  const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (saved === "nl" || saved === "en") {
    return <Navigate to={`/${saved}`} replace />;
  }
  return <>{children}</>;
}
