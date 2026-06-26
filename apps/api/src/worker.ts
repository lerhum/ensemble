// Entrée Cloudflare Worker (prod). Driver Neon serverless créé par requête.
// Le même code de routes (createApp) tourne ici et en Node.
import { createNeonDb } from "@ensemble/db/neon";
import type { Db } from "@ensemble/db/node";
import { createApp } from "./app.js";
import { DataUriStorage } from "./storage.js";

interface WorkerEnv {
  DATABASE_URL: string;
  SESSION_SECRET: string;
  WEB_ORIGIN: string;
}

export default {
  fetch(req: Request, env: WorkerEnv, ctx: ExecutionContext): Response | Promise<Response> {
    const app = createApp({
      // Neon et pg sont tous deux des bases Drizzle/pg ; cast structurel sûr.
      db: createNeonDb(env.DATABASE_URL) as unknown as Db,
      storage: new DataUriStorage(),
      sessionSecret: env.SESSION_SECRET,
      webOrigin: env.WEB_ORIGIN,
    });
    return app.fetch(req, env, ctx);
  },
};
