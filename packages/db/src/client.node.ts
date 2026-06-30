// Driver Postgres local (Docker) via `pg`. Importé uniquement par l'entrée Node
// de l'API et par les scripts migrate/seed. NE PAS importer côté Worker.
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

/** Creates a Drizzle DB client backed by a node-postgres pool. For local dev and migrate/seed scripts only — do not import from the Worker. */
export function createNodeDb(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl });
  return drizzle(pool, { schema });
}

export type Db = ReturnType<typeof createNodeDb>;
