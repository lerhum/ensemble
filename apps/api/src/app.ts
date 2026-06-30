import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppConfig, AppEnv } from "./context.js";
import { ApiError } from "./errors.js";
import { loadUser } from "./auth.js";
import { installRoutes } from "./routes/install.js";
import { authRoutes } from "./routes/auth.js";
import { volunteerAuthRoutes } from "./routes/volunteer-auth.js";
import { publicRoutes } from "./routes/public.js";
import { adminRoutes } from "./routes/admin.js";

/**
 * Builds the Hono app. Called once in Node (db = singleton pool) and
 * once per request in the Worker (db = per-request Neon connection).
 */
export function createApp(config: AppConfig) {
  const app = new Hono<AppEnv>();

  // Injecte la configuration résolue dans le contexte.
  app.use("*", async (c, next) => {
    c.set("db", config.db);
    c.set("storage", config.storage);
    c.set("email", config.email);
    c.set("sessionSecret", config.sessionSecret);
    c.set("webOrigin", config.webOrigin);
    await next();
  });

  app.use(
    "/api/*",
    cors({
      origin: config.webOrigin,
      credentials: true,
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    }),
  );

  // Charge l'utilisateur courant (cookie de session) pour toutes les routes API.
  app.use("/api/*", loadUser);

  app.get("/api/health", (c) => c.json({ ok: true }));
  app.route("/api/install", installRoutes);
  app.route("/api/auth", authRoutes);
  app.route("/api/auth/volunteer", volunteerAuthRoutes);
  app.route("/api", publicRoutes);
  app.route("/api", adminRoutes);

  app.notFound((c) => c.json({ error: "Route introuvable" }, 404));
  app.onError((err, c) => {
    if (err instanceof ApiError) {
      return c.json({ error: err.message, issues: err.issues }, err.status as 400);
    }
    console.error("[api] erreur non gérée:", err);
    return c.json({ error: "Erreur serveur" }, 500);
  });

  return app;
}
