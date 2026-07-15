import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";

export type SupportedLocale = "fr" | "nl" | "en";

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
