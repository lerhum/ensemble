// Entrée Node (dev local Docker). Driver pg singleton, serveur @hono/node-server.
import { serve } from "@hono/node-server";
import { createNodeDb } from "@ensemble/db/node";
import { createApp } from "./app.js";
import { DataUriStorage } from "./storage.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL manquant");

const app = createApp({
  db: createNodeDb(databaseUrl),
  storage: new DataUriStorage(),
  sessionSecret: process.env.SESSION_SECRET ?? "dev-secret-change-me-please-32chars-min",
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
});

const port = Number(process.env.API_PORT ?? 8787);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`✓ API Ensemble sur http://localhost:${info.port}`);
});
