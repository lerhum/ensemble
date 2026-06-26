// Driver Postgres local (Docker) via `pg`. Importé uniquement par l'entrée Node
// de l'API et par les scripts migrate/seed. NE PAS importer côté Worker.
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

export function createNodeDb(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl });
  return drizzle(pool, { schema });
}

export type Db = ReturnType<typeof createNodeDb>;
