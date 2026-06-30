import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { users } from "@ensemble/db";
import { loginSchema } from "@ensemble/db/shared";
import type { AppEnv } from "../context.js";
import { unauthorized, validate } from "../errors.js";
import { createSession, destroySession, verifyPassword } from "../auth.js";

export const authRoutes = new Hono<AppEnv>();

/** Authenticates an admin by email and password; sets a session cookie on success. */
authRoutes.post("/login", async (c) => {
  const body = validate(loginSchema, await c.req.json().catch(() => ({})));
  const db = c.get("db");
  const [u] = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
  if (!u || !(await verifyPassword(body.password, u.passwordHash))) {
    throw unauthorized("Email ou mot de passe incorrect.");
  }
  await createSession(c, u.id);
  return c.json({ user: { id: u.id, email: u.email, nom: u.nom, role: u.role } });
});

/** Destroys the current admin session and clears the session cookie. */
authRoutes.post("/logout", async (c) => {
  await destroySession(c);
  return c.json({ ok: true });
});

/** Returns the currently authenticated admin user, or null if not logged in. */
authRoutes.get("/me", (c) => c.json({ user: c.get("user") }));
