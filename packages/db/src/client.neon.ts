// Driver Neon serverless (Cloudflare Worker) via HTTP. Importé uniquement par
// l'entrée Worker de l'API. NE PAS importer côté Node (évite de bundler pg).
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema.js";

/** Creates a Drizzle DB client backed by the Neon serverless HTTP driver. For Cloudflare Worker only — do not import from Node. */
export function createNeonDb(databaseUrl: string) {
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

export type Db = ReturnType<typeof createNeonDb>;
