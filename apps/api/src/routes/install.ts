import { Hono } from "hono";
import { count } from "drizzle-orm";
import { users, settings } from "@ensemble/db";
import { installSchema } from "@ensemble/db/shared";
import type { AppEnv } from "../context.js";
import { conflict, validate } from "../errors.js";
import { createSession, hashPassword } from "../auth.js";

export const installRoutes = new Hono<AppEnv>();

/** Returns the number of admin users in the database. */
async function adminCount(db: AppEnv["Variables"]["db"]): Promise<number> {
  const [row] = await db.select({ n: count() }).from(users);
  return row?.n ?? 0;
}

/** Returns whether first-time setup is needed and site settings if already configured. */
installRoutes.get("/status", async (c) => {
  const db = c.get("db");
  const needsSetup = (await adminCount(db)) === 0;
  if (needsSetup) return c.json({ needsSetup: true, siteTitle: "", siteLogo: null, rgpdEmail: "" });
  const [row] = await db.select().from(settings);
  return c.json({
    needsSetup: false,
    siteTitle: row?.siteTitle ?? "",
    siteLogo: row?.siteLogo ?? null,
    rgpdEmail: row?.rgpdEmail ?? "",
  });
});

/** Creates the first admin account (WordPress-style setup). Locked if an admin already exists. */
installRoutes.post("/", async (c) => {
  const db = c.get("db");
  if ((await adminCount(db)) > 0) throw conflict("installAlreadyDone");
  const body = validate(installSchema, await c.req.json().catch(() => ({})));
  const passwordHash = await hashPassword(body.password);
  const [user] = await db
    .insert(users)
    .values({ email: body.email, passwordHash, nom: body.orgNom, role: "admin" })
    .returning();
  await db
    .insert(settings)
    .values({ id: 1, siteTitle: body.orgNom, siteLogo: null, rgpdEmail: body.rgpdEmail });
  await createSession(c, user!.id);
  return c.json(
    { user: { id: user!.id, email: user!.email, nom: user!.nom, role: user!.role } },
    201,
  );
});
