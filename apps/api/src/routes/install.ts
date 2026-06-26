import { Hono } from "hono";
import { count } from "drizzle-orm";
import { users } from "@ensemble/db";
import { installSchema } from "@ensemble/db/shared";
import type { AppEnv } from "../context.js";
import { conflict, validate } from "../errors.js";
import { createSession, hashPassword } from "../auth.js";

export const installRoutes = new Hono<AppEnv>();

async function adminCount(db: AppEnv["Variables"]["db"]): Promise<number> {
  const [row] = await db.select({ n: count() }).from(users);
  return row?.n ?? 0;
}

// L'app a-t-elle besoin de l'installation initiale ? (aucun admin en base)
installRoutes.get("/status", async (c) => {
  return c.json({ needsSetup: (await adminCount(c.get("db"))) === 0 });
});

// Crée le premier admin (à la WordPress). Verrouillé si un admin existe déjà.
installRoutes.post("/", async (c) => {
  const db = c.get("db");
  if ((await adminCount(db)) > 0) throw conflict("L'installation a déjà été effectuée.");
  const body = validate(installSchema, await c.req.json().catch(() => ({})));
  const passwordHash = await hashPassword(body.password);
  const [user] = await db
    .insert(users)
    .values({ email: body.email, passwordHash, nom: body.orgNom, role: "admin" })
    .returning();
  await createSession(c, user!.id);
  return c.json(
    { user: { id: user!.id, email: user!.email, nom: user!.nom, role: user!.role } },
    201,
  );
});
