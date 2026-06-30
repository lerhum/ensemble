# Ensemble

**Ensemble** est une application web de gestion du **bénévolat scolaire** (écoles belges,
francophones). Les parents découvrent un événement d'école (ex. *Demo Got's Talent*), lisent
son histoire, parcourent les **pôles** (Bar & Buvette, Pêche aux canards, Grimage…) et s'inscrivent
à un ou plusieurs **créneaux**. Le comité administre l'événement : page publique personnalisable,
configuration des pôles/tâches/créneaux, suivi des bénévoles (filtres + export CSV).

## Stack

Monorepo **pnpm** (un schéma de données, deux drivers selon l'environnement) :

| Workspace | Stack | Rôle |
| --------- | ----- | ---- |
| `apps/web` | React + Vite + TypeScript + Tailwind + shadcn/ui | Front (Manrope, thème par école) |
| `apps/api` | Hono + TypeScript + zod | API REST — tourne sur **Node** (dev) **et Cloudflare Workers** (prod) |
| `packages/db` | Drizzle ORM + PostgreSQL | Schéma, migrations, seed, types + schémas zod partagés |

- **Dev local** : Postgres via Docker, driver `pg`.
- **Prod** : Cloudflare Pages (web) + Worker (api) + **Neon** (Postgres managé), driver
  `@neondatabase/serverless`. Même schéma, même code de routes.

## Démarrage rapide (Docker)

Prérequis : Docker + Docker Compose.

```bash
cp .env.example .env      # variables par défaut (OK pour le dev)
docker compose up         # db → migrate (migrations + seed) → api (:8787) → web (:5173)
```

Puis ouvrir **http://localhost:5173**.

Au **premier lancement**, l'app affiche un **installeur « à la WordPress »** (`/install`) : aucun
admin n'est pré-créé, vous définissez le compte du comité (nom, email, mot de passe). Le seed crée
le contenu de démo (*Demo Got's Talent* : 6 pôles, 18 créneaux, 32 inscriptions).

Raccourcis `make` :

```bash
make up        # démarre toute la stack
make down      # arrête
make seed      # (re)seed le contenu de démo
make migrate   # applique les migrations
make logs      # suit les logs
make clean     # arrête + supprime le volume Postgres (réinitialise tout → installeur)
```

## Structure

```
ensemble/
├─ apps/
│  ├─ web/   React + Vite + Tailwind + shadcn/ui
│  └─ api/   Hono (src/node.ts = Node, src/worker.ts = Cloudflare Worker)
├─ packages/
│  └─ db/    Drizzle : schema.ts, migrations, seed.ts, shared.ts (types + zod), clients node/neon
├─ docker-compose.yml   db + migrate + api + web
├─ Makefile · .env.example
└─ DEPLOY.md            déploiement Cloudflare Pages + Worker + Neon
```

## Modèle de données

```
Événement → Pôles → Tâches → Créneaux        +  inscriptions (jointure créneau ↔ bénévole)
```

- Une **tâche** est définie une fois et contient **plusieurs créneaux**.
- `creneau = { debut, fin, necessaires }` ; un bénévole peut s'inscrire à **plusieurs** créneaux.
- Le **statut d'un créneau** est dérivé de `inscrits / necessaires` et pilote la couleur partout
  (jauges, pastilles, badges) : vert = complet, marine = en cours, ambre = 1 place, corail = urgent.
  Un créneau complet masque son bouton et affiche « Complet ».

## API (extrait)

| Méthode | Route | Accès |
| ------- | ----- | ----- |
| `GET` | `/api/install/status` · `POST /api/install` | installeur (verrou 409 si déjà installé) |
| `POST` | `/api/auth/login` · `/api/auth/logout` · `GET /api/auth/me` | session (cookie signé) |
| `GET` | `/api/events/:slug` | public (event + pôles/tâches/créneaux + compteurs) |
| `POST`/`DELETE` | `/api/creneaux/:id/inscriptions` | public (inscription multi-créneaux) |
| `*` | `/api/poles\|taches\|creneaux` (+ `/reorder`) | admin (CRUD + réordonnancement) |
| `POST`/`PATCH` | `/api/events` (+ `/:id/banner`) | admin |
| `GET` | `/api/events/:id/volunteers[.csv]?q=&pole=&creneau=&statut=` | admin (filtres + export CSV) |

Authentification portable Node/Workers (hachage PBKDF2 via WebCrypto, sessions en base). Validation
zod, erreurs JSON.

## Écrans (Direction B)

Page événement (parent, mobile + desktop) · Sélection de créneaux (mobile + desktop) · Admin :
tableau de bord & création (upload bannière + couleur de thème + aperçu live), Pôles & créneaux
(édition inline, +créneau/+tâche/+pôle, drag-and-drop), Bénévoles (filtres cumulables + chips +
export CSV) · Installeur + connexion.

## Commandes utiles (hors Docker)

```bash
pnpm install
pnpm -r typecheck
pnpm --filter @ensemble/web dev|build
pnpm --filter @ensemble/api dev            # requiert DATABASE_URL
pnpm --filter @ensemble/db generate|migrate|seed
```

## Déploiement

Voir **[DEPLOY.md](./DEPLOY.md)** — Neon + Cloudflare Worker (`wrangler deploy`) + Cloudflare Pages,
sur les offres gratuites.

## Licence

Voir [LICENSE](./LICENSE).
