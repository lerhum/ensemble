import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import commonFr from "./locales/fr/common.json";
import commonNl from "./locales/nl/common.json";
import commonEn from "./locales/en/common.json";
import publicFr from "./locales/fr/public.json";
import publicNl from "./locales/nl/public.json";
import publicEn from "./locales/en/public.json";
import authFr from "./locales/fr/auth.json";
import authNl from "./locales/nl/auth.json";
import authEn from "./locales/en/auth.json";
import adminFr from "./locales/fr/admin.json";
import adminNl from "./locales/nl/admin.json";
import adminEn from "./locales/en/admin.json";
import errorsFr from "./locales/fr/errors.json";
import errorsNl from "./locales/nl/errors.json";
import errorsEn from "./locales/en/errors.json";

const resources = {
  fr: { common: commonFr, public: publicFr, auth: authFr, admin: adminFr, errors: errorsFr },
  nl: { common: commonNl, public: publicNl, auth: authNl, admin: adminNl, errors: errorsNl },
  en: { common: commonEn, public: publicEn, auth: authEn, admin: adminEn, errors: errorsEn },
} as const;

i18n
  .use(initReactI18next)
  .init({
    resources,
    // Locale is hardcoded until URL-based locale routing lands (issue A2) — must not
    // silently change the rendered language before then.
    lng: "fr",
    fallbackLng: "fr",
    ns: ["common", "public", "auth", "admin", "errors"],
    defaultNS: "common",
    interpolation: { escapeValue: false },
    // No Suspense boundary exists yet anywhere in the app.
    react: { useSuspense: false },
  })
  .catch((err: unknown) => {
    console.error("i18n initialization failed", err);
  });

export default i18n;
