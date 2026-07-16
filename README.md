# Ensemble

**Ensemble** is a web app for managing **event volunteering** (French-language, aimed at Belgian
community organizations). Visitors discover an event (e.g. _Demo Got's Talent_), read its story,
browse **pôles** (Bar & Buvette, Pêche aux canards, Grimage…) and sign up for one or more
**créneaux**. The organizing committee manages the event: customizable public page, pôle/tâche/
créneau configuration, volunteer tracking (filters + CSV export).

## Stack

**pnpm** monorepo (one data schema, two drivers depending on environment):

| Workspace     | Stack                                            | Role                                                                |
| ------------- | ------------------------------------------------ | ------------------------------------------------------------------- |
| `apps/web`    | React + Vite + TypeScript + Tailwind + shadcn/ui | Frontend (Manrope, per-organization theming)                        |
| `apps/api`    | Hono + TypeScript + zod                          | REST API — runs on **Node** (dev) **and Cloudflare Workers** (prod) |
| `packages/db` | Drizzle ORM + PostgreSQL                         | Schema, migrations, seed, shared types + zod schemas                |

- **Local dev**: Postgres via Docker, `pg` driver.
- **Prod**: Cloudflare Pages (web) + Worker (api) + **Neon** (managed Postgres), driver
  `@neondatabase/serverless`. Same schema, same route code.

## Quick start (Docker)

Prerequisites: Docker + Docker Compose.

```bash
cp .env.example .env      # default variables (fine for dev)
docker compose up         # db → migrate (migrations + seed) → api (:8787) → web (:5173)
```

Then open **http://localhost:5173**.

On **first launch**, the app shows a first-run setup wizard (`/install`): no admin is
pre-created — you define the committee account (name, email, password). The seed creates demo
content (_Demo Got's Talent_: 6 pôles, 18 créneaux, 32 signups).

`make` shortcuts:

```bash
make up        # start the full stack
make down      # stop
make seed      # (re)seed demo content
make migrate   # apply migrations
make logs      # follow logs
make clean     # stop + delete Postgres volume (resets everything → installer)
```

## Structure

```
ensemble/
├─ apps/
│  ├─ web/   React + Vite + Tailwind + shadcn/ui
│  └─ api/   Hono (src/node.ts = Node, src/worker.ts = Cloudflare Worker)
├─ packages/
│  └─ db/    Drizzle: schema.ts, migrations, seed.ts, shared.ts (types + zod), node/neon clients
├─ docker-compose.yml   db + migrate + api + web
├─ Makefile · .env.example
└─ DEPLOY.md            Cloudflare Pages + Worker + Neon deployment
```

## Data model

```
Event → Pôles → Tâches → Créneaux        +  signups (créneau ↔ bénévole join)
```

- A **tâche** is defined once and contains **multiple créneaux**.
- `creneau = { debut, fin, necessaires }` ; a bénévole can sign up for **multiple** créneaux.
- A **créneau's status** is derived from `inscrits / necessaires` and drives the color everywhere
  (gauges, badges): green = full, navy = in progress, amber = 1 spot left, coral = urgent.
  A full créneau hides its button and shows "Complet".

## API (excerpt)

| Method          | Route                                                               | Access                                                                              |
| --------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `GET`           | `/api/install/status` · `POST /api/install`                         | installer (409 if already installed)                                                |
| `POST`          | `/api/auth/login` · `/api/auth/logout` · `GET /api/auth/me`         | session (signed cookie)                                                             |
| `GET`           | `/api/events/:slug`                                                 | public (event + pôles/tâches/créneaux + counters)                                   |
| `POST`/`DELETE` | `/api/creneaux/:id/inscriptions`                                    | public (multi-créneau signup)                                                       |
| `*`             | `/api/poles\|taches\|creneaux` (+ `/reorder`)                       | admin (CRUD + reordering)                                                           |
| `POST`/`PATCH`  | `/api/events` (+ `/:id/banner`)                                     | admin                                                                               |
| `GET`           | `/api/events/:id/volunteers[.csv]?q=&pole=&tache=&creneau=&statut=` | admin (filters + CSV export)                                                        |
| `POST`          | `/api/events/:id/volunteers/broadcast`                              | admin (email a filtered group or explicit ids)                                      |
| `POST`          | `/api/reminders/run`                                                | admin (manual trigger for due slot-reminder emails; runs on a Cron Trigger in prod) |

Portable Node/Workers authentication (PBKDF2 via WebCrypto, DB-backed sessions). Zod validation, JSON errors.

Transactional email (confirmations, slot reminders, admin broadcasts) goes through Mailpit in dev and
Resend in prod — see **[DEPLOY.md](./DEPLOY.md#transactional-email--resend)**.

## Useful commands (outside Docker)

```bash
pnpm install
pnpm -r typecheck
pnpm -r test                               # Vitest across all 3 workspaces
pnpm --filter @ensemble/web dev|build
pnpm --filter @ensemble/api dev            # requires DATABASE_URL
pnpm --filter @ensemble/db generate|migrate|seed
```

## Deployment

See **[DEPLOY.md](./DEPLOY.md)** — Neon + Cloudflare Worker (`wrangler deploy`) + Cloudflare Pages,
on free tiers.

## Contributing

See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for the dev workflow, naming/commit conventions, and
PR process.

## License

See [LICENSE](./LICENSE).
