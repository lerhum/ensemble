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

---

## 3. Frontend — Cloudflare Pages

The frontend queries the API via `VITE_API_BASE` (empty in dev → proxy; Worker URL in prod).

**Option A — Pages dashboard (Git CI)**
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
