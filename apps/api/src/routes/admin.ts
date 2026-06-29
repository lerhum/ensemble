import { Hono, type Context } from "hono";
import { z } from "zod";
import { and, eq, isNotNull, lt, max, sql } from "drizzle-orm";
import { creneaux, events, poles, settings, taches, volunteers } from "@ensemble/db";
import {
  creneauInputSchema,
  creneauUpdateSchema,
  eventInputSchema,
  eventUpdateSchema,
  poleInputSchema,
  poleUpdateSchema,
  reorderSchema,
  settingsUpdateSchema,
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
  listEvents,
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

// ── Liste et duplication des événements (préfixe /admin/) ─────────────────

adminRoutes.get("/admin/events", async (c) => {
  const db = c.get("db");
  // Auto-archivage : publie dont la date est passée → archive
  await db
    .update(events)
    .set({ statut: "archive" })
    .where(
      and(
        eq(events.statut, "publie"),
        isNotNull(events.dateIso),
        lt(events.dateIso, sql`CURRENT_DATE::text`),
      ),
    );
  return c.json(await listEvents(db));
});

adminRoutes.get("/admin/events/:id", async (c) => {
  const detail = await buildEventDetailById(c.get("db"), c.req.param("id"));
  if (!detail) throw notFound("Événement introuvable");
  return c.json(detail);
});

adminRoutes.post("/admin/events/:id/duplicate", async (c) => {
  const db = c.get("db");
  const src = await db.query.events.findFirst({
    where: eq(events.id, c.req.param("id")),
    with: { poles: { with: { taches: { with: { creneaux: true } } } } },
  });
  if (!src) throw notFound("Événement introuvable");

  let slug = slugify(`${src.nom}-copie`) || "evenement-copie";
  const [clash] = await db.select({ id: events.id }).from(events).where(eq(events.slug, slug));
  if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

  const [copy] = await db
    .insert(events)
    .values({
      slug,
      nom: `${src.nom} — copie`,
      date: src.date,
      dateIso: null,
      horaires: src.horaires,
      lieu: src.lieu,
      histoire: src.histoire,
      banniere: src.banniere,
      couleurTheme: src.couleurTheme,
      orgNom: src.orgNom,
      statut: "brouillon",
    })
    .returning();

  const sortedPoles = [...src.poles].sort((a, b) => a.position - b.position);
  for (const p of sortedPoles) {
    const [newPole] = await db
      .insert(poles)
      .values({ eventId: copy!.id, nom: p.nom, description: p.description, position: p.position })
      .returning();
    const sortedTaches = [...p.taches].sort((a, b) => a.position - b.position);
    for (const t of sortedTaches) {
      const [newTache] = await db
        .insert(taches)
        .values({ poleId: newPole!.id, nom: t.nom, description: t.description, position: t.position })
        .returning();
      const sortedCreneaux = [...t.creneaux].sort((a, b) => a.position - b.position);
      if (sortedCreneaux.length > 0) {
        await db.insert(creneaux).values(
          sortedCreneaux.map((cr) => ({
            tacheId: newTache!.id,
            debut: cr.debut,
            fin: cr.fin,
            necessaires: cr.necessaires,
            position: cr.position,
          })),
        );
      }
    }
  }

  return c.json(await buildEventDetailById(db, copy!.id), 201);
});

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
      date: body.date ?? "",
      dateIso: body.dateIso ?? null,
      horaires: body.horaires ?? "",
      lieu: body.lieu ?? "",
      histoire: body.histoire ?? "",
      banniere: body.banniere ?? null,
      couleurTheme: body.couleurTheme ?? "#DA4A40",
      orgNom: body.orgNom ?? "",
      statut: body.statut ?? "brouillon",
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

// ── Paramètres du site ────────────────────────────────────────────────────
adminRoutes.get("/settings", async (c) => {
  const db = c.get("db");
  const [row] = await db.select().from(settings);
  return c.json({ siteTitle: row?.siteTitle ?? "", siteLogo: row?.siteLogo ?? null, rgpdEmail: row?.rgpdEmail ?? "" });
});

adminRoutes.patch("/settings", async (c) => {
  const db = c.get("db");
  const body = validate(settingsUpdateSchema, await c.req.json().catch(() => ({})));
  const patch: { siteTitle?: string; siteLogo?: string | null; rgpdEmail?: string } = {};
  if (body.siteTitle !== undefined) patch.siteTitle = body.siteTitle;
  if ("siteLogo" in body) patch.siteLogo = body.siteLogo ?? null;
  if (body.rgpdEmail !== undefined) patch.rgpdEmail = body.rgpdEmail;
  if (Object.keys(patch).length > 0) {
    await db.update(settings).set(patch).where(eq(settings.id, 1));
  }
  const [row] = await db.select().from(settings);
  return c.json({ siteTitle: row?.siteTitle ?? "", siteLogo: row?.siteLogo ?? null, rgpdEmail: row?.rgpdEmail ?? "" });
});

// Upload du logo du site (multipart) → storage → settings.site_logo.
adminRoutes.post("/settings/logo", async (c) => {
  const form = await c.req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") throw notFound("Fichier manquant");
  const blob = file as unknown as { arrayBuffer(): Promise<ArrayBuffer>; type?: string };
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const { url } = await c.get("storage").put("site-logo", bytes, blob.type || "image/png");
  await c.get("db").update(settings).set({ siteLogo: url }).where(eq(settings.id, 1));
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

adminRoutes.delete("/volunteers/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  await db.delete(volunteers).where(eq(volunteers.id, id));
  return c.json({ ok: true });
});
