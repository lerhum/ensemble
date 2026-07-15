import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALE_STORAGE_KEY, withLocalePrefix, type SupportedLocale } from "@/lib/locale-boundary";

const LOCALES: SupportedLocale[] = ["fr", "nl", "en"];

/** Language dropdown: navigates to the current page's equivalent under the new locale prefix, switches i18next, and remembers the choice for the next bare "/" visit. */
export function LocaleSwitcher() {
  const { t, i18n } = useTranslation("common");
  const location = useLocation();
  const navigate = useNavigate();
  const current = i18n.language as SupportedLocale;

  function switchTo(lng: SupportedLocale) {
    if (lng === current) return;
    localStorage.setItem(LOCALE_STORAGE_KEY, lng);
    void i18n.changeLanguage(lng);
    navigate(withLocalePrefix(location.pathname, location.search, lng));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("localeSwitcher.label")}
        className="flex items-center gap-1.5 rounded-[10px] border border-hair px-3 py-2 text-sm font-700 text-ink2 hover:bg-surface"
      >
        <Globe className="h-4 w-4" />
        {t(`localeSwitcher.${current}`)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((lng) => (
          <DropdownMenuItem key={lng} onSelect={() => switchTo(lng)}>
            {t(`localeSwitcher.${lng}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
