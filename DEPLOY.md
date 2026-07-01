# Deployment — Cloudflare (free) + Neon

The app deploys on Cloudflare's **free tier**:

| Component | Hosting | Why |
| --------- | ------- | --- |
| `apps/web` (Vite frontend) | **Cloudflare Pages** | static, Vite build |
| `apps/api` (Hono) | **Cloudflare Worker** | same code as dev, Neon driver |
| Database | **Neon** (managed Postgres, free) | Cloudflare free tier doesn't host Postgres |

> ⚠️ Docker (`docker compose up`) is **for local dev only**. Cloudflare's free tier hosts neither
> containers nor Postgres: in production, the database is Neon.

Locally Drizzle uses the `pg` driver against the Docker Postgres; on the Worker it uses
`@neondatabase/serverless` against Neon. **Same schema, two drivers depending on env** (`apps/api/src/node.ts`
vs `apps/api/src/worker.ts`).

## Deployment method: Cloudflare native Git integration

Both the API and the frontend deploy via **Cloudflare's own Git integration** (Workers Builds for
`apps/api`, Pages Git integration for `apps/web`) — every push to `main` triggers a build/deploy
directly on Cloudflare, no GitHub Actions involved. The CLI steps below (`wrangler deploy`, `wrangler
pages deploy`) remain useful for the **first-time setup** (secrets, initial deploy before the Git
integration exists) and as a manual fallback.

The only GitHub Actions workflow in this repo is `.github/workflows/db-migrate.yml` — Drizzle
migrations against Neon are **never automatic**, always triggered by hand from the GitHub Actions tab
(`Actions → DB Migrate (Neon) → Run workflow`, with an optional "seed" checkbox). It needs a single
repo secret: `DATABASE_URL` (the Neon pooled connection string) under **Settings → Secrets and
variables → Actions**.

### Workers Builds config for `apps/api`

When connecting the repo under **Workers & Pages → your Worker → Settings → Build**:

- **Root directory**: `apps/api` (must point to the folder containing `wrangler.toml` — leaving it at
  `/` breaks `wrangler deploy`, which won't find the config file)
- **Build command**: `pnpm run build` (runs `apps/api`'s `tsc --noEmit` — a typecheck gate; `wrangler
  deploy` does its own esbuild bundling)
- **Deploy command**: `npx wrangler deploy`
- **Include (watch) paths**: `apps/api/**` and `packages/db/**` — not `*`, otherwise every commit
  (even web-only changes) triggers an API rebuild/redeploy
- Runtime secrets (`DATABASE_URL`, `SESSION_SECRET`, `RESEND_API_KEY`) are set separately, see §2
  below — they are **not** the build-time "Variables and secrets".

---

## 1. Database — Neon

1. Create a project on https://neon.tech (nearby region, e.g. EU).
2. Copy the *pooled* connection string:
   `postgresql://<user>:<pwd>@<...>-pooler.<region>.aws.neon.tech/<db>?sslmode=require`
3. Apply the schema + seed from your machine (pg driver, compatible with Neon):
   ```bash
   export DATABASE_URL="postgresql://...neon.tech/...?sslmode=require"
   pnpm --filter @ensemble/db migrate
   pnpm --filter @ensemble/db seed     # optional: demo content
   ```
   `migrate` replays the `packages/db/drizzle` folder. To regenerate after a schema change:
   `pnpm --filter @ensemble/db generate`.

---

## 2. API — Cloudflare Worker

Config: `apps/api/wrangler.toml` (`main = src/worker.ts`, `nodejs_compat`).

```bash
cd apps/api

# Secrets (never committed):
npx wrangler secret put DATABASE_URL     # paste the Neon URL
npx wrangler secret put SESSION_SECRET   # random 32+ char string (openssl rand -base64 32)

# Public variable: edit WEB_ORIGIN in wrangler.toml with the final Pages URL.

npx wrangler deploy
```

The Worker is served at `https://ensemble-api.<account>.workers.dev`. Note this URL.

> Banners: stored as data-URIs by default (`events.banniere` column). For real images,
> enable an **R2** bucket (free) in `wrangler.toml` and implement an `R2Storage`
> (see `apps/api/src/storage.ts`) wired up in `worker.ts`.

### Transactional email — Resend

Locally, emails are intercepted by **Mailpit** (see `CLAUDE.md`). In production the Worker sends
real email via the **[Resend](https://resend.com)** HTTP API (`apps/api/src/email.ts`,
`ResendEmailService`) — no SMTP, works over `fetch` so it's Worker-compatible. Without a Resend
key, the Worker silently falls back to `LogEmailService` (emails are `console.log`'d, not sent —
fine for a first deploy, but volunteers won't receive confirmations or reminders).

```bash
npx wrangler secret put RESEND_API_KEY   # from resend.com → API Keys
```

Optionally set the sender identity as a public var in `wrangler.toml` (defaults to
`Ensemble <noreply@ensemble.local>`, which will fail Resend's domain check):

```toml
[vars]
EMAIL_FROM = "Ensemble <noreply@votre-domaine.be>"
```

The sending domain must be **verified in Resend** (SPF/DKIM records) or sends will fail. Resend's
free tier covers low-volume use cases like this app comfortably (see resend.com/pricing for current
limits).

Emails sent through this path: participation confirmation (on signup), slot reminders (Cron Trigger,
see below), and admin broadcasts (targeted messages from the volunteers page).

### Slot reminders — Cron Trigger

`wrangler.toml` declares a Cron Trigger (`[triggers] crons = ["*/30 * * * *"]`) that fires
`scheduled()` in `apps/api/src/worker.ts` every 30 minutes. It calls `sendDueReminders`
(`apps/api/src/reminders.ts`), which emails confirmed volunteers whose créneau starts within the
admin-configured lead time (**Réglages → Rappels**, `settings.reminderHoursBefore`, default 24h) and
marks them sent (idempotent — safe to run repeatedly). No extra setup needed: Cron Triggers are
included on Cloudflare's free Workers plan. After `wrangler deploy`, verify it's registered:

```bash
npx wrangler deployments list   # or check the Cloudflare dashboard → Workers → Triggers
```

---

## 3. Frontend — Cloudflare Pages

The frontend queries the API via `VITE_API_BASE` (empty in dev → proxy; Worker URL in prod).

**Option A — Pages dashboard (Git CI, recommended)**
- Connect the repo. Build settings:
  - **Build command**: `pnpm install && pnpm --filter @ensemble/web build`
  - **Build output directory**: `apps/web/dist`
  - **Environment variable**: `VITE_API_BASE = https://ensemble-api.<account>.workers.dev`

**Option B — CLI**
```bash
VITE_API_BASE="https://ensemble-api.<account>.workers.dev" pnpm --filter @ensemble/web build
npx wrangler pages deploy apps/web/dist --project-name ensemble-web
```

Pages publishes to `https://ensemble-web.pages.dev`. Update this URL in
`apps/api/wrangler.toml` (`WEB_ORIGIN`) then **redeploy the Worker** (`npx wrangler deploy`) so
CORS and cross-site cookies work.

> Cookies: in production (https, separate domains), the session uses `SameSite=None; Secure`
> (handled automatically, see `apps/api/src/auth.ts`). In local dev (http), `SameSite=Lax`.

---

## 4. URL sync checklist

1. Worker deployed → `*.workers.dev` URL.
2. `VITE_API_BASE` (Pages) = Worker URL → rebuild/redeploy Pages.
3. `WEB_ORIGIN` (wrangler.toml) = Pages URL → redeploy Worker.

## 5. Ongoing migrations

After modifying the Drizzle schema:
```bash
pnpm --filter @ensemble/db generate                 # new SQL file in packages/db/drizzle
DATABASE_URL="<neon-url>" pnpm --filter @ensemble/db migrate
```

Or run it from CI instead of your machine: **GitHub → Actions → "DB Migrate (Neon)" → Run workflow**
(`.github/workflows/db-migrate.yml`, `workflow_dispatch` only — never runs automatically on push, to
avoid an accidental schema change against prod). Optionally tick "seed" to also run the demo seed.
Requires a single repo secret: `DATABASE_URL` (Neon pooled connection string) under **Settings →
Secrets and variables → Actions**.
