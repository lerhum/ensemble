// Entrée Cloudflare Worker (prod). Driver Neon serverless créé par requête.
// Le même code de routes (createApp) tourne ici et en Node.
import { createNeonDb } from "@ensemble/db/neon";
import type { Db } from "@ensemble/db/node";
import { createApp } from "./app.js";
import { DataUriStorage } from "./storage.js";
import { LogEmailService, ResendEmailService } from "./email.js";
import { sendDueReminders } from "./reminders.js";
import type { EmailService } from "./email.js";

interface WorkerEnv {
  DATABASE_URL: string;
  SESSION_SECRET: string;
  WEB_ORIGIN: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
}

/** Builds the db + email service pair shared by the fetch and scheduled handlers. */
function buildConfig(env: WorkerEnv): { db: Db; email: EmailService } {
  const emailFrom = env.EMAIL_FROM ?? "Ensemble <noreply@ensemble.local>";
  const email = env.RESEND_API_KEY
    ? new ResendEmailService(env.RESEND_API_KEY, emailFrom)
    : new LogEmailService();
  return {
    // Neon et pg sont tous deux des bases Drizzle/pg ; cast structurel sûr.
    db: createNeonDb(env.DATABASE_URL) as unknown as Db,
    email,
  };
}

export default {
  fetch(req: Request, env: WorkerEnv, ctx: ExecutionContext): Response | Promise<Response> {
    const { db, email } = buildConfig(env);
    const app = createApp({
      db,
      storage: new DataUriStorage(),
      email,
      sessionSecret: env.SESSION_SECRET,
      webOrigin: env.WEB_ORIGIN,
    });
    return app.fetch(req, env, ctx);
  },

  scheduled(_event: ScheduledEvent, env: WorkerEnv, ctx: ExecutionContext) {
    const { db, email } = buildConfig(env);
    ctx.waitUntil(
      sendDueReminders(db, email).then((n) => console.log(`[reminders] ${n} email(s) envoyé(s)`)),
    );
  },
};
