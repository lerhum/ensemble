// Entrée Cloudflare Worker (prod). Driver Neon serverless créé par requête.
// Le même code de routes (createApp) tourne ici et en Node.
import { createNeonDb } from "@ensemble/db/neon";
import type { Db } from "@ensemble/db/node";
import { createApp } from "./app.js";
import { DataUriStorage } from "./storage.js";
import { LogEmailService, ResendEmailService } from "./email.js";

interface WorkerEnv {
  DATABASE_URL: string;
  SESSION_SECRET: string;
  WEB_ORIGIN: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
}

export default {
  fetch(req: Request, env: WorkerEnv, ctx: ExecutionContext): Response | Promise<Response> {
    const emailFrom = env.EMAIL_FROM ?? "Ensemble <noreply@ensemble.local>";
    const email = env.RESEND_API_KEY
      ? new ResendEmailService(env.RESEND_API_KEY, emailFrom)
      : new LogEmailService();

    const app = createApp({
      // Neon et pg sont tous deux des bases Drizzle/pg ; cast structurel sûr.
      db: createNeonDb(env.DATABASE_URL) as unknown as Db,
      storage: new DataUriStorage(),
      email,
      sessionSecret: env.SESSION_SECRET,
      webOrigin: env.WEB_ORIGIN,
    });
    return app.fetch(req, env, ctx);
  },
};
