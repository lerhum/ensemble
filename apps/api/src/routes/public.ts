import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { creneaux, inscriptions, volunteers } from "@ensemble/db";
import { inscriptionSchema } from "@ensemble/db/shared";
import type { AppEnv } from "../context.js";
import { conflict, notFound, validate } from "../errors.js";
import { buildEventDetailBySlug } from "../dto.js";

export const publicRoutes = new Hono<AppEnv>();

// Page événement publique : event + pôles→tâches→créneaux + compteurs dérivés.
publicRoutes.get("/events/:slug", async (c) => {
  const detail = await buildEventDetailBySlug(c.get("db"), c.req.param("slug"));
  if (!detail) throw notFound("Événement introuvable");
  return c.json(detail);
});

// Charge un créneau avec son arbre (pour eventId) et ses inscriptions.
async function loadCreneau(db: AppEnv["Variables"]["db"], id: string) {
  return db.query.creneaux.findFirst({
    where: eq(creneaux.id, id),
    with: { inscriptions: true, tache: { with: { pole: true } } },
  });
}

// Inscription d'un bénévole à un créneau (multi-créneaux : un appel par créneau).
publicRoutes.post("/creneaux/:id/inscriptions", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const body = validate(inscriptionSchema, await c.req.json().catch(() => ({})));

  const cr = await loadCreneau(db, id);
  if (!cr) throw notFound("Créneau introuvable");
  if (cr.inscriptions.length >= cr.necessaires) throw conflict("Ce créneau est complet.");

  const eventId = cr.tache.pole.eventId;
  // Bénévole identifié par (event, email) — créé si nouveau.
  const [existing] = await db
    .select()
    .from(volunteers)
    .where(and(eq(volunteers.eventId, eventId), eq(volunteers.email, body.email)))
    .limit(1);
  let volunteerId = existing?.id;
  if (!volunteerId) {
    const [created] = await db
      .insert(volunteers)
      .values({ eventId, nom: body.nom, email: body.email, tel: body.tel ?? null })
      .returning();
    volunteerId = created!.id;
  }

  await db
    .insert(inscriptions)
    .values({ creneauId: id, volunteerId })
    .onConflictDoNothing();

  return c.json({ ok: true, inscrits: cr.inscriptions.length + 1 }, 201);
});

// Désinscription d'un bénévole (par email) d'un créneau.
publicRoutes.delete("/creneaux/:id/inscriptions", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}) as { email?: string });
  const email = (body as { email?: string }).email;
  if (!email) throw notFound("Bénévole introuvable");

  const cr = await loadCreneau(db, id);
  if (!cr) throw notFound("Créneau introuvable");
  const eventId = cr.tache.pole.eventId;

  const [vol] = await db
    .select()
    .from(volunteers)
    .where(and(eq(volunteers.eventId, eventId), eq(volunteers.email, email)))
    .limit(1);
  if (vol) {
    await db
      .delete(inscriptions)
      .where(and(eq(inscriptions.creneauId, id), eq(inscriptions.volunteerId, vol.id)));
  }
  return c.json({ ok: true });
});
