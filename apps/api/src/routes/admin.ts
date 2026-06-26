import { Hono, type Context } from "hono";
import { z } from "zod";
import { and, eq, max } from "drizzle-orm";
import { creneaux, events, poles, taches } from "@ensemble/db";
import {
  creneauInputSchema,
  creneauUpdateSchema,
  eventInputSchema,
  eventUpdateSchema,
  poleInputSchema,
  poleUpdateSchema,
  reorderSchema,
  tacheInputSchema,
  tacheUpdateSchema,
  volunteerFilterSchema,
} from "@ensemble/db/shared";
import type { AppEnv } from "../context.js";
import { notFound, validate } from "../errors.js";
import { requireAdmin } from "../auth.js";
import {
  buildEventDetailById,
  buildVolunteers,
  volunteersToCsv,
} from "../dto.js";

export const adminRoutes = new Hono<AppEnv>();

// Toutes les routes admin exigent un admin authentifié.
adminRoutes.use("*", requireAdmin);

function slugify(s: string): string {
  return s
    .normalize("NFD") // sépare les diacritiques (U+0300–U+036F) puis les retire
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function nextPosition(
  db: AppEnv["Variables"]["db"],
  table: typeof poles | typeof taches | typeof creneaux,
  column: typeof poles.eventId | typeof taches.poleId | typeof creneaux.tacheId,
  parentId: string,
): Promise<number> {
  const [row] = await db.select({ m: max(table.position) }).from(table).where(eq(column, parentId));
  return (row?.m ?? -1) + 1;
}

// ── Événements ────────────────────────────────────────────────────────────
adminRoutes.post("/events", async (c) => {
  const db = c.get("db");
  const body = validate(eventInputSchema, await c.req.json().catch(() => ({})));
  let slug = slugify(body.nom) || "evenement";
  const [clash] = await db.select({ id: events.id }).from(events).where(eq(events.slug, slug));
  if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  const [ev] = await db
    .insert(events)
    .values({
      slug,
      nom: body.nom,
      date: body.date,
      horaires: body.horaires,
      lieu: body.lieu,
      histoire: body.histoire,
      banniere: body.banniere ?? null,
      couleurTheme: body.couleurTheme,
      orgNom: body.orgNom,
      statut: body.statut,
    })
    .returning();
  return c.json(await buildEventDetailById(db, ev!.id), 201);
});

adminRoutes.patch("/events/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const body = validate(eventUpdateSchema, await c.req.json().catch(() => ({})));
  const patch = { ...body };
  if (patch.banniere === undefined) delete (patch as Record<string, unknown>).banniere;
  const [ev] = await db.update(events).set(patch).where(eq(events.id, id)).returning();
  if (!ev) throw notFound("Événement introuvable");
  return c.json(await buildEventDetailById(db, ev.id));
});

// Upload de bannière (multipart) → storage abstrait → event.banniere.
adminRoutes.post("/events/:id/banner", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const form = await c.req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") throw notFound("Fichier manquant");
  // Le type d'entrée FormData diffère entre @types/node et workers-types : on
  // s'appuie sur l'interface Blob commune (arrayBuffer + type).
  const blob = file as unknown as { arrayBuffer(): Promise<ArrayBuffer>; type?: string };
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const { url } = await c.get("storage").put(`banner-${id}`, bytes, blob.type || "image/jpeg");
  const [ev] = await db.update(events).set({ banniere: url }).where(eq(events.id, id)).returning();
  if (!ev) throw notFound("Événement introuvable");
  return c.json({ url });
});

// ── Réordonnancement (déclaré avant les routes :id) ────────────────────────
function reorder(table: typeof poles | typeof taches | typeof creneaux) {
  return async (c: Context<AppEnv>) => {
    const db = c.get("db");
    const { ids } = validate(reorderSchema, await c.req.json().catch(() => ({})));
    for (let i = 0; i < ids.length; i++) {
      await db.update(table).set({ position: i }).where(eq(table.id, ids[i]!));
    }
    return c.json({ ok: true });
  };
}
adminRoutes.patch("/poles/reorder", reorder(poles));
adminRoutes.patch("/taches/reorder", reorder(taches));
adminRoutes.patch("/creneaux/reorder", reorder(creneaux));

// ── Pôles ──────────────────────────────────────────────────────────────────
adminRoutes.post("/poles", async (c) => {
  const db = c.get("db");
  const body = validate(
    poleInputSchema.extend({ eventId: z.string().uuid() }),
    await c.req.json().catch(() => ({})),
  );
  const position = await nextPosition(db, poles, poles.eventId, body.eventId);
  const [row] = await db
    .insert(poles)
    .values({ eventId: body.eventId, nom: body.nom, description: body.description, position })
    .returning();
  return c.json(row, 201);
});

adminRoutes.patch("/poles/:id", async (c) => {
  const db = c.get("db");
  const body = validate(poleUpdateSchema, await c.req.json().catch(() => ({})));
  const [row] = await db.update(poles).set(body).where(eq(poles.id, c.req.param("id"))).returning();
  if (!row) throw notFound("Pôle introuvable");
  return c.json(row);
});

adminRoutes.delete("/poles/:id", async (c) => {
  const [row] = await c
    .get("db")
    .delete(poles)
    .where(eq(poles.id, c.req.param("id")))
    .returning();
  if (!row) throw notFound("Pôle introuvable");
  return c.json({ ok: true });
});

// ── Tâches ───────────────────────────────────────────────────────────────
adminRoutes.post("/taches", async (c) => {
  const db = c.get("db");
  const body = validate(tacheInputSchema, await c.req.json().catch(() => ({})));
  const position = await nextPosition(db, taches, taches.poleId, body.poleId);
  const [row] = await db
    .insert(taches)
    .values({ poleId: body.poleId, nom: body.nom, description: body.description, position })
    .returning();
  return c.json(row, 201);
});

adminRoutes.patch("/taches/:id", async (c) => {
  const db = c.get("db");
  const body = validate(tacheUpdateSchema, await c.req.json().catch(() => ({})));
  const [row] = await db.update(taches).set(body).where(eq(taches.id, c.req.param("id"))).returning();
  if (!row) throw notFound("Tâche introuvable");
  return c.json(row);
});

adminRoutes.delete("/taches/:id", async (c) => {
  const [row] = await c
    .get("db")
    .delete(taches)
    .where(eq(taches.id, c.req.param("id")))
    .returning();
  if (!row) throw notFound("Tâche introuvable");
  return c.json({ ok: true });
});

// ── Créneaux ─────────────────────────────────────────────────────────────
adminRoutes.post("/creneaux", async (c) => {
  const db = c.get("db");
  const body = validate(creneauInputSchema, await c.req.json().catch(() => ({})));
  const position = await nextPosition(db, creneaux, creneaux.tacheId, body.tacheId);
  const [row] = await db
    .insert(creneaux)
    .values({
      tacheId: body.tacheId,
      debut: body.debut,
      fin: body.fin,
      necessaires: body.necessaires,
      position,
    })
    .returning();
  return c.json(row, 201);
});

adminRoutes.patch("/creneaux/:id", async (c) => {
  const db = c.get("db");
  const body = validate(creneauUpdateSchema, await c.req.json().catch(() => ({})));
  const [row] = await db
    .update(creneaux)
    .set(body)
    .where(eq(creneaux.id, c.req.param("id")))
    .returning();
  if (!row) throw notFound("Créneau introuvable");
  return c.json(row);
});

adminRoutes.delete("/creneaux/:id", async (c) => {
  const [row] = await c
    .get("db")
    .delete(creneaux)
    .where(eq(creneaux.id, c.req.param("id")))
    .returning();
  if (!row) throw notFound("Créneau introuvable");
  return c.json({ ok: true });
});

// ── Bénévoles (liste filtrée + export CSV) ─────────────────────────────────
function parseFilter(c: { req: { query: (k: string) => string | undefined } }) {
  return validate(volunteerFilterSchema, {
    q: c.req.query("q") || undefined,
    pole: c.req.query("pole") || undefined,
    creneau: c.req.query("creneau") || undefined,
    statut: c.req.query("statut") || undefined,
  });
}

adminRoutes.get("/events/:id/volunteers", async (c) => {
  const list = await buildVolunteers(c.get("db"), c.req.param("id"), parseFilter(c));
  return c.json({ volunteers: list, total: list.length });
});

adminRoutes.get("/events/:id/volunteers.csv", async (c) => {
  const list = await buildVolunteers(c.get("db"), c.req.param("id"), parseFilter(c));
  c.header("Content-Type", "text/csv; charset=utf-8");
  c.header("Content-Disposition", 'attachment; filename="benevoles.csv"');
  return c.body(volunteersToCsv(list));
});
