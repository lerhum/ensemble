// Entrée Node (dev local Docker). Driver pg singleton, serveur @hono/node-server.
import { serve } from "@hono/node-server";
import { createNodeDb } from "@ensemble/db/node";
import { createApp } from "./app.js";
import { DataUriStorage } from "./storage.js";
import { SmtpEmailService } from "./email.smtp.js";
import { LogEmailService, ResendEmailService } from "./email.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL manquant");

const emailFrom = process.env.EMAIL_FROM ?? "Ensemble <noreply@ensemble.local>";
const email = process.env.RESEND_API_KEY
  ? new ResendEmailService(process.env.RESEND_API_KEY, emailFrom)
  : process.env.SMTP_HOST
    ? new SmtpEmailService(process.env.SMTP_HOST, Number(process.env.SMTP_PORT ?? 1025), emailFrom)
    : new LogEmailService();

const app = createApp({
  db: createNodeDb(databaseUrl),
  storage: new DataUriStorage(),
  email,
  sessionSecret: process.env.SESSION_SECRET ?? "dev-secret-change-me-please-32chars-min",
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
});

const port = Number(process.env.API_PORT ?? 8787);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`✓ API Ensemble sur http://localhost:${info.port}`);
});
