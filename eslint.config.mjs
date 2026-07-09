import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
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
    // Context providers co-locate their hook with the Provider component,
    // which breaks Fast Refresh but is the established pattern here.
    files: ["apps/web/src/lib/*-context.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  eslintConfigPrettier,
);
