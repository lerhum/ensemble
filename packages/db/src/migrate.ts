// Applique les migrations Drizzle (dossier ./drizzle) sur la base locale (pg).
// Lancé par le service `migrate` de docker-compose, puis enchaîne le seed.
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL manquant");

const here = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(here, "../drizzle");

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

console.log("→ Application des migrations Drizzle…");
await migrate(db, { migrationsFolder });
console.log("✓ Migrations appliquées.");
await pool.end();
