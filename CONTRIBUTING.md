# Contributing to Ensemble

Thanks for your interest in contributing! This document covers everything you need to get set up
and submit changes.

## Getting started

Follow the **Quick start (Docker)** section in the [README](./README.md) to get the full stack
running locally (Postgres, API, web, Mailpit).

```bash
pnpm install
```

## Project structure

```
apps/web      React + Vite + TypeScript + Tailwind + shadcn/ui
apps/api      Hono + TypeScript (Node in dev, Cloudflare Worker in prod)
packages/db   Drizzle ORM + Postgres (schema, migrations, seed, shared types + zod)
```

See [CLAUDE.md](./CLAUDE.md) for the full architecture, domain model (Event → Pôles → Tâches →
Créneaux), and coding conventions used throughout the codebase.

## Development workflow

```bash
pnpm -r typecheck                       # tsc --noEmit across all workspaces
pnpm --filter @ensemble/web test        # vitest
pnpm --filter @ensemble/api test        # vitest
pnpm --filter @ensemble/db test         # vitest
pnpm --filter @ensemble/web build       # production build
pnpm lint                               # eslint across all workspaces
pnpm format                             # prettier --write .
```

Run typecheck and the relevant test suite(s) before opening a PR.

## Automated PR quality gate

Every PR triggers a Danger.js check (`.github/workflows/pr-quality-gate.yml`) that runs typecheck,
tests, lint, formatting, and a `pnpm audit` dependency scan, and reports a coverage summary.
Typecheck and test failures block the PR; lint, formatting, and dependency audit issues are posted
as warnings (not blocking yet) since there's no baseline history for those checks — fix them
anyway, they'll become blocking once the codebase is caught up.

## Naming convention

Identifiers (files, functions, variables) are written in **English**. Domain terms stay in
**French** where they refer to the product's vocabulary (pôle, tâche, créneau, bénévole) — this
mirrors how the codebase already names things, so match existing patterns in the file you're
editing.

## Internationalization

Ensemble is being translated into French (default), Dutch, and English. New user-facing strings
must go through `react-i18next`, not hardcoded JSX text:

```tsx
import { useTranslation } from "react-i18next";

function MyComponent() {
  const { t } = useTranslation("common"); // or "public" / "auth" / "admin" / "errors"
  return <span>{t("nav.home")}</span>;
}
```

- Locale files live in `apps/web/src/locales/{fr,nl,en}/<namespace>.json`. Add the French value
  first — `nl`/`en` are filled in during the dedicated translation-content issues, so a key without
  an `nl`/`en` entry yet is expected, not a bug.
- The rendered locale is currently hardcoded to `fr` (`apps/web/src/i18n.ts`); URL-based locale
  switching (`/nl/…`, `/en/…`) is separate, later work, so `nl`/`en` files existing as stubs
  doesn't mean those locales are reachable in the app yet.
- Once you migrate a file's hardcoded French text to `t()` calls, add it to the `files` list of the
  `i18next/no-literal-string` block in `eslint.config.mjs` — this is an anti-regression guardrail
  that only covers files explicitly opted in, so it grows one file at a time. Note it currently only
  catches plain JSX text nodes, not string literals in attributes (`alt`, `placeholder`, …) or in
  plain `.ts` files — real coverage, not yet complete coverage.

## Commit messages

This repo follows [Conventional Commits](https://www.conventionalcommits.org/):
`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:` — optionally scoped, e.g.
`feat(admin): add pilotage dashboard`.

## Pull requests

- Keep PRs small and focused on a single change.
- Describe the problem/motivation, not just the diff.
- Note how you tested the change locally (screenshots for UI changes are welcome).
