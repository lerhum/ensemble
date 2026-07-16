import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import i18next from "eslint-plugin-i18next";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/.wrangler/**",
      "**/coverage/**",
      "**/node_modules/**",
      "packages/db/drizzle/**",
      // shadcn/ui vendored primitives — generated, not hand-styled by the team.
      "apps/web/src/components/ui/**",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
  },
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs["recommended-latest"].rules,
      ...reactRefresh.configs.vite.rules,
    },
  },
  {
    files: ["apps/api/**/*.ts", "packages/db/**/*.ts"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // Context providers co-locate their hook with the Provider component, routes.tsx exports
    // a JSX-returning route-tree function alongside a small local component, and
    // locale-boundary.tsx co-locates the locale-prefix helper/constant with its two small
    // components — all three break Fast Refresh but are the established pattern here.
    files: [
      "apps/web/src/lib/*-context.tsx",
      "apps/web/src/routes.tsx",
      "apps/web/src/lib/locale-boundary.tsx",
    ],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    // Anti-regression guardrail: files already migrated to react-i18next keys.
    // Add a file here once its hardcoded French JSX text is migrated — see
    // CONTRIBUTING.md § Internationalization.
    files: [
      "apps/web/src/components/public/PublicNav.tsx",
      "apps/web/src/pages/InstallPage.tsx",
      "apps/web/src/pages/LoginPage.tsx",
      "apps/web/src/pages/VolunteerLoginPage.tsx",
      "apps/web/src/pages/SetPasswordPage.tsx",
      "apps/web/src/pages/EventParentPage.tsx",
      "apps/web/src/pages/EventRedirectPage.tsx",
      "apps/web/src/pages/PoleSelectionPage.tsx",
      "apps/web/src/pages/ConfirmPage.tsx",
      "apps/web/src/pages/MesInscriptionsPage.tsx",
      "apps/web/src/pages/PrivacyPage.tsx",
      "apps/web/src/pages/stubs.tsx",
      "apps/web/src/components/InscriptionDialog.tsx",
      "apps/web/src/components/ConfirmationDialog.tsx",
      "apps/web/src/pages/admin/AdminDashboardPage.tsx",
      "apps/web/src/pages/admin/AdminEventsListPage.tsx",
      "apps/web/src/pages/admin/AdminSettingsPage.tsx",
      "apps/web/src/components/admin/AdminLayout.tsx",
      "apps/web/src/pages/admin/AdminEventEditPage.tsx",
      "apps/web/src/pages/admin/AdminPilotagePage.tsx",
      "apps/web/src/pages/admin/AdminPolesPage.tsx",
      "apps/web/src/pages/admin/AdminVolunteersPage.tsx",
      "apps/web/src/components/primitives/status.ts",
      "apps/web/src/lib/auth-context.tsx",
      "apps/web/src/lib/volunteer-context.tsx",
      "apps/web/src/components/LocaleSwitcher.tsx",
      "apps/web/src/components/primitives/CarteCreneau.tsx",
      "apps/web/src/components/primitives/LigneCreneau.tsx",
      "apps/web/src/components/primitives/BadgeStatut.tsx",
      "apps/web/src/components/primitives/Jauge.tsx",
      "apps/web/src/components/primitives/Pastilles.tsx",
    ],
    plugins: { i18next },
    rules: {
      "i18next/no-literal-string": "error",
    },
  },
  eslintConfigPrettier,
);
