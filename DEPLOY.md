# Déploiement — Cloudflare (gratuit) + Neon

L'app se déploie sur le **plan gratuit** de Cloudflare :

| Composant | Hébergement | Pourquoi |
| --------- | ----------- | -------- |
| `apps/web` (front Vite) | **Cloudflare Pages** | statique, build Vite |
| `apps/api` (Hono) | **Cloudflare Worker** | même code que le dev, driver Neon |
| Base de données | **Neon** (Postgres managé free) | Cloudflare gratuit n'héberge pas Postgres |

> ⚠️ Docker (`docker compose up`) sert **uniquement au dev local**. Cloudflare gratuit
> n'héberge ni conteneurs ni Postgres : en prod, la base est Neon.

En local Drizzle utilise le driver `pg` vers le Postgres Docker ; sur le Worker il utilise
`@neondatabase/serverless` vers Neon. **Même schéma, deux drivers selon l'env** (`apps/api/src/node.ts`
vs `apps/api/src/worker.ts`).

---

## 1. Base de données — Neon

1. Créer un projet sur https://neon.tech (région proche, ex. EU).
2. Copier la chaîne de connexion *pooled* :
   `postgresql://<user>:<pwd>@<...>-pooler.<region>.aws.neon.tech/<db>?sslmode=require`
3. Appliquer le schéma + le seed depuis votre machine (driver pg, compatible Neon) :
   ```bash
   export DATABASE_URL="postgresql://...neon.tech/...?sslmode=require"
   pnpm --filter @ensemble/db migrate
   pnpm --filter @ensemble/db seed     # optionnel : contenu de démo
   ```
   `migrate` rejoue le dossier `packages/db/drizzle`. Pour régénérer après un changement de
   schéma : `pnpm --filter @ensemble/db generate`.

---

## 2. API — Cloudflare Worker

Config : `apps/api/wrangler.toml` (`main = src/worker.ts`, `nodejs_compat`).

```bash
cd apps/api

# Secrets (jamais commités) :
npx wrangler secret put DATABASE_URL     # coller l'URL Neon
npx wrangler secret put SESSION_SECRET   # chaîne aléatoire 32+ car. (openssl rand -base64 32)

# Variable publique : éditer WEB_ORIGIN dans wrangler.toml avec l'URL Pages finale.

npx wrangler deploy
```

Le Worker est servi sur `https://ensemble-api.<compte>.workers.dev`. Notez cette URL.

> Bannières : par défaut stockées en data-URI (champ `events.banniere`). Pour de vraies images,
> activer un bucket **R2** (free) dans `wrangler.toml` et implémenter un `R2Storage`
> (cf. `apps/api/src/storage.ts`) branché dans `worker.ts`.

---

## 3. Front — Cloudflare Pages

Le front interroge l'API via `VITE_API_BASE` (vide en dev → proxy ; URL du Worker en prod).

**Option A — Tableau de bord Pages (CI Git)**
- Connecter le repo. Réglages de build :
  - **Build command** : `pnpm install && pnpm --filter @ensemble/web build`
  - **Build output directory** : `apps/web/dist`
  - **Variable d'environnement** : `VITE_API_BASE = https://ensemble-api.<compte>.workers.dev`

**Option B — CLI**
```bash
VITE_API_BASE="https://ensemble-api.<compte>.workers.dev" pnpm --filter @ensemble/web build
npx wrangler pages deploy apps/web/dist --project-name ensemble-web
```

Pages publie sur `https://ensemble-web.pages.dev`. Reporter cette URL dans
`apps/api/wrangler.toml` (`WEB_ORIGIN`) puis **redéployer le Worker** (`npx wrangler deploy`) pour
que CORS et les cookies cross-site fonctionnent.

> Cookies : en prod (https, domaines distincts), la session utilise `SameSite=None; Secure`
> (géré automatiquement, cf. `apps/api/src/auth.ts`). En dev local (http), `SameSite=Lax`.

---

## 4. Récapitulatif des URLs à synchroniser

1. Worker déployé → URL `*.workers.dev`.
2. `VITE_API_BASE` (Pages) = URL du Worker → rebuild/redeploy Pages.
3. `WEB_ORIGIN` (wrangler.toml) = URL Pages → redeploy Worker.

## 5. Migrations en continu

Après modification du schéma Drizzle :
```bash
pnpm --filter @ensemble/db generate                 # nouveau fichier SQL dans packages/db/drizzle
DATABASE_URL="<url-neon>" pnpm --filter @ensemble/db migrate
```
