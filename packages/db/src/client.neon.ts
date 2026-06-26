// Driver Neon serverless (Cloudflare Worker) via HTTP. Importé uniquement par
// l'entrée Worker de l'API. NE PAS importer côté Node (évite de bundler pg).
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema.js";

export function createNeonDb(databaseUrl: string) {
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

export type Db = ReturnType<typeof createNeonDb>;
