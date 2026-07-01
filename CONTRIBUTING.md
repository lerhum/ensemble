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
```

Run typecheck and the relevant test suite(s) before opening a PR.

## Naming convention

Identifiers (files, functions, variables) are written in **English**. Domain terms stay in
**French** where they refer to the product's vocabulary (pôle, tâche, créneau, bénévole) — this
mirrors how the codebase already names things, so match existing patterns in the file you're
editing.

## Commit messages

This repo follows [Conventional Commits](https://www.conventionalcommits.org/):
`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:` — optionally scoped, e.g.
`feat(admin): add pilotage dashboard`.

## Pull requests

- Keep PRs small and focused on a single change.
- Describe the problem/motivation, not just the diff.
- Note how you tested the change locally (screenshots for UI changes are welcome).
