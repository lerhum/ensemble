import { Hono, type Context } from "hono";
import { z } from "zod";
import { and, eq, isNotNull, lt, max, sql } from "drizzle-orm";
import { creneaux, events, inscriptions, poles, settings, taches, volunteers } from "@ensemble/db";
import {
  adminInscriptionSchema,
  broadcastSchema,
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
import { conflict, notFound, validate } from "../errors.js";
import { requireAdmin } from "../auth.js";
import { t, normalizeLocale, resolveLocale, type SupportedLocale } from "../i18n.js";
import {
  buildEventDetailById,
  buildVolunteers,
  listEvents,
  loadCreneau,
  volunteersToCsv,
} from "../dto.js";
import { sendDueReminders } from "../reminders.js";
import { slugify } from "../utils.js";

export const adminRoutes = new Hono<AppEnv>();

// Toutes les routes admin exigent un admin authentifié.
adminRoutes.use("*", requireAdmin);

/** Returns the next available position integer for a child entity within its parent (max + 1). */
async function nextPosition(
  db: AppEnv["Variables"]["db"],
  table: typeof poles | typeof taches | typeof creneaux,
  column: typeof poles.eventId | typeof taches.poleId | typeof creneaux.tacheId,
  parentId: string,
): Promise<number> {
  const [row] = await db
    .select({ m: max(table.position) })
    .from(table)
    .where(eq(column, parentId));
  return (row?.m ?? -1) + 1;
}

// ── Liste et duplication des événements (préfixe /admin/) ─────────────────

/** Lists all events, auto-archiving published events whose date has passed. */
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

/** Returns a single event's full detail by id. */
adminRoutes.get("/admin/events/:id", async (c) => {
  const detail = await buildEventDetailById(c.get("db"), c.req.param("id"));
  if (!detail) throw notFound("eventNotFound");
  return c.json(detail);
});

/** Duplicates an event with all its poles, tasks, and slots as a new draft. */
adminRoutes.post("/admin/events/:id/duplicate", async (c) => {
  const db = c.get("db");
  const src = await db.query.events.findFirst({
    where: eq(events.id, c.req.param("id")),
    with: { poles: { with: { taches: { with: { creneaux: true } } } } },
  });
  if (!src) throw notFound("eventNotFound");

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
        .values({
          poleId: newPole!.id,
          nom: t.nom,
          description: t.description,
          position: t.position,
        })
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
/** Creates a new event with an auto-generated slug derived from the event name. */
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

/** Partially updates an event's fields; returns the updated full detail. */
adminRoutes.patch("/events/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const body = validate(eventUpdateSchema, await c.req.json().catch(() => ({})));
  const patch = { ...body };
  if (patch.banniere === undefined) delete (patch as Record<string, unknown>).banniere;
  const [ev] = await db.update(events).set(patch).where(eq(events.id, id)).returning();
  if (!ev) throw notFound("eventNotFound");
  return c.json(await buildEventDetailById(db, ev.id));
});

/** Uploads an event banner image via multipart form; stores it via the storage abstraction and saves the URL. */
adminRoutes.post("/events/:id/banner", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const form = await c.req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") throw notFound("fileMissing");
  // Le type d'entrée FormData diffère entre @types/node et workers-types : on
  // s'appuie sur l'interface Blob commune (arrayBuffer + type).
  const blob = file as unknown as { arrayBuffer(): Promise<ArrayBuffer>; type?: string };
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const { url } = await c.get("storage").put(`banner-${id}`, bytes, blob.type || "image/jpeg");
  const [ev] = await db.update(events).set({ banniere: url }).where(eq(events.id, id)).returning();
  if (!ev) throw notFound("eventNotFound");
  return c.json({ url });
});

// ── Rappels de créneaux ──────────────────────────────────────────────────
/** Manually triggers the due-reminders job (used locally where no Cron Trigger runs, and as an ops escape hatch). */
adminRoutes.post("/reminders/run", async (c) => {
  const sent = await sendDueReminders(c.get("db"), c.get("email"));
  return c.json({ ok: true, sent });
});

// ── Paramètres du site ────────────────────────────────────────────────────
/** Returns the current site settings (title, logo URL, GDPR email, reminder lead time). */
adminRoutes.get("/settings", async (c) => {
  const db = c.get("db");
  const [row] = await db.select().from(settings);
  return c.json({
    siteTitle: row?.siteTitle ?? "",
    siteLogo: row?.siteLogo ?? null,
    rgpdEmail: row?.rgpdEmail ?? "",
    reminderHoursBefore: row?.reminderHoursBefore ?? 24,
  });
});

/** Partially updates site settings (siteTitle, siteLogo, rgpdEmail, reminderHoursBefore). */
adminRoutes.patch("/settings", async (c) => {
  const db = c.get("db");
  const body = validate(settingsUpdateSchema, await c.req.json().catch(() => ({})));
  const patch: {
    siteTitle?: string;
    siteLogo?: string | null;
    rgpdEmail?: string;
    reminderHoursBefore?: number;
  } = {};
  if (body.siteTitle !== undefined) patch.siteTitle = body.siteTitle;
  if ("siteLogo" in body) patch.siteLogo = body.siteLogo ?? null;
  if (body.rgpdEmail !== undefined) patch.rgpdEmail = body.rgpdEmail;
  if (body.reminderHoursBefore !== undefined) patch.reminderHoursBefore = body.reminderHoursBefore;
  if (Object.keys(patch).length > 0) {
    await db.update(settings).set(patch).where(eq(settings.id, 1));
  }
  const [row] = await db.select().from(settings);
  return c.json({
    siteTitle: row?.siteTitle ?? "",
    siteLogo: row?.siteLogo ?? null,
    rgpdEmail: row?.rgpdEmail ?? "",
    reminderHoursBefore: row?.reminderHoursBefore ?? 24,
  });
});

/** Uploads the site logo via multipart form; stores it via the storage abstraction and saves the URL. */
adminRoutes.post("/settings/logo", async (c) => {
  const form = await c.req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") throw notFound("fileMissing");
  const blob = file as unknown as { arrayBuffer(): Promise<ArrayBuffer>; type?: string };
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const { url } = await c.get("storage").put("site-logo", bytes, blob.type || "image/png");
  await c.get("db").update(settings).set({ siteLogo: url }).where(eq(settings.id, 1));
  return c.json({ url });
});

// ── Réordonnancement (déclaré avant les routes :id) ────────────────────────
/** Returns a Hono handler that updates position for each id in the provided ordered array. */
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
/** Creates a new pole at the next available position within an event. */
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

/** Updates a pole's name or description. */
adminRoutes.patch("/poles/:id", async (c) => {
  const db = c.get("db");
  const body = validate(poleUpdateSchema, await c.req.json().catch(() => ({})));
  const [row] = await db
    .update(poles)
    .set(body)
    .where(eq(poles.id, c.req.param("id")))
    .returning();
  if (!row) throw notFound("poleNotFound");
  return c.json(row);
});

/** Deletes a pole and all its tasks and slots (cascades in DB). */
adminRoutes.delete("/poles/:id", async (c) => {
  const [row] = await c
    .get("db")
    .delete(poles)
    .where(eq(poles.id, c.req.param("id")))
    .returning();
  if (!row) throw notFound("poleNotFound");
  return c.json({ ok: true });
});

// ── Tâches ───────────────────────────────────────────────────────────────
/** Creates a new task at the next available position within a pole. */
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

/** Updates a task's name or description. */
adminRoutes.patch("/taches/:id", async (c) => {
  const db = c.get("db");
  const body = validate(tacheUpdateSchema, await c.req.json().catch(() => ({})));
  const [row] = await db
    .update(taches)
    .set(body)
    .where(eq(taches.id, c.req.param("id")))
    .returning();
  if (!row) throw notFound("tacheNotFound");
  return c.json(row);
});

/** Deletes a task and all its slots (cascades in DB). */
adminRoutes.delete("/taches/:id", async (c) => {
  const [row] = await c
    .get("db")
    .delete(taches)
    .where(eq(taches.id, c.req.param("id")))
    .returning();
  if (!row) throw notFound("tacheNotFound");
  return c.json({ ok: true });
});

// ── Créneaux ─────────────────────────────────────────────────────────────
/** Creates a new slot at the next available position within a task. */
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

/** Updates a slot's start time, end time, or volunteer capacity. */
adminRoutes.patch("/creneaux/:id", async (c) => {
  const db = c.get("db");
  const body = validate(creneauUpdateSchema, await c.req.json().catch(() => ({})));
  const [row] = await db
    .update(creneaux)
    .set(body)
    .where(eq(creneaux.id, c.req.param("id")))
    .returning();
  if (!row) throw notFound("creneauNotFound");
  return c.json(row);
});

/** Deletes a slot and its inscriptions (cascades in DB). */
adminRoutes.delete("/creneaux/:id", async (c) => {
  const [row] = await c
    .get("db")
    .delete(creneaux)
    .where(eq(creneaux.id, c.req.param("id")))
    .returning();
  if (!row) throw notFound("creneauNotFound");
  return c.json({ ok: true });
});

// ── Bénévoles (liste filtrée + export CSV) ─────────────────────────────────
/** Parses volunteer filter query parameters (q, pole, tache, creneau, statut) from the request. */
function parseFilter(c: { req: { query: (k: string) => string | undefined } }) {
  return validate(volunteerFilterSchema, {
    q: c.req.query("q") || undefined,
    pole: c.req.query("pole") || undefined,
    tache: c.req.query("tache") || undefined,
    creneau: c.req.query("creneau") || undefined,
    statut: c.req.query("statut") || undefined,
  });
}

/** Returns filtered volunteers for an event with a total count. */
adminRoutes.get("/events/:id/volunteers", async (c) => {
  const list = await buildVolunteers(c.get("db"), c.req.param("id"), parseFilter(c));
  return c.json({ volunteers: list, total: list.length });
});

/** Streams filtered volunteers as a CSV download (UTF-8 BOM for Excel). Headers/status labels follow ?locale= (resolveLocale precedence: query param → Accept-Language → French). */
adminRoutes.get("/events/:id/volunteers.csv", async (c) => {
  const list = await buildVolunteers(c.get("db"), c.req.param("id"), parseFilter(c));
  const locale = resolveLocale(c);
  c.header("Content-Type", "text/csv; charset=utf-8");
  c.header("Content-Disposition", 'attachment; filename="benevoles.csv"');
  return c.body(volunteersToCsv(list, locale));
});

/** Manually registers a person on a slot (admin action) — email/tel are optional, unlike public signup. */
adminRoutes.post("/admin/creneaux/:id/volunteers", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const body = validate(adminInscriptionSchema, await c.req.json().catch(() => ({})));

  const cr = await loadCreneau(db, id);
  if (!cr) throw notFound("creneauNotFound");
  if (cr.inscriptions.length >= cr.necessaires) throw conflict("slotFull");

  const eventId = cr.tache.pole.eventId;
  let volunteerId: string;

  if (body.email) {
    const [existing] = await db
      .select()
      .from(volunteers)
      .where(and(eq(volunteers.eventId, eventId), eq(volunteers.email, body.email)))
      .limit(1);
    if (existing) {
      volunteerId = existing.id;
      if (existing.nom !== body.nom || existing.tel !== (body.tel ?? null)) {
        await db
          .update(volunteers)
          .set({ nom: body.nom, tel: body.tel ?? null })
          .where(eq(volunteers.id, volunteerId));
      }
    } else {
      const [created] = await db
        .insert(volunteers)
        .values({
          eventId,
          nom: body.nom,
          email: body.email,
          tel: body.tel ?? null,
          statut: "confirme",
        })
        .returning();
      volunteerId = created!.id;
    }
  } else {
    const [created] = await db
      .insert(volunteers)
      .values({ eventId, nom: body.nom, email: null, tel: body.tel ?? null, statut: "confirme" })
      .returning();
    volunteerId = created!.id;
  }

  await db.insert(inscriptions).values({ creneauId: id, volunteerId }).onConflictDoNothing();
  return c.json({ ok: true }, 201);
});

/** Sends an email to a targeted group of volunteers — either explicit ids or the given filter. */
adminRoutes.post("/events/:id/volunteers/broadcast", async (c) => {
  const db = c.get("db");
  const eventId = c.req.param("id");
  const body = validate(broadcastSchema, await c.req.json().catch(() => ({})));

  const targets = (
    body.volunteerIds
      ? (await buildVolunteers(db, eventId, {})).filter((v) => body.volunteerIds!.includes(v.id))
      : await buildVolunteers(db, eventId, body.filter ?? {})
  ).filter((v): v is typeof v & { email: string } => Boolean(v.email));

  const email = c.get("email");
  await Promise.all(
    targets.map((v) =>
      email.send(
        v.email,
        body.subject,
        broadcastHtml(v.nom, body.message, normalizeLocale(v.locale)),
        broadcastText(v.nom, body.message, normalizeLocale(v.locale)),
      ),
    ),
  );

  return c.json({ ok: true, sent: targets.length });
});

/** Deletes a volunteer and all their inscriptions (admin action). */
adminRoutes.delete("/volunteers/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  await db.delete(volunteers).where(eq(volunteers.id, id));
  return c.json({ ok: true });
});

// ── Templates email (diffusion admin) ───────────────────────────────────────

/** Escapes HTML special characters and converts newlines to <br> for a plain-text message. */
function escapeMessageHtml(message: string): string {
  return message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

/** Generates the HTML body for an admin broadcast email. Only the wrapper (greeting, signature) is translated — the admin's free-typed subject/message is never routed through t(). */
export function broadcastHtml(nom: string, message: string, locale: SupportedLocale): string {
  return `<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="utf-8"><title>${t(locale, "emails.broadcast.htmlTitle")}</title></head>
<body style="font-family:system-ui,sans-serif;background:#f9f9f9;margin:0;padding:40px 0">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:36px;border:1px solid #e8e8e8">
    <p style="font-size:22px;font-weight:800;color:#111;margin:0 0 8px">${t(locale, "emails.greeting", { nom })}</p>
    <p style="color:#555;margin:0;white-space:pre-line">${escapeMessageHtml(message)}</p>
  </div>
</body>
</html>`;
}

/** Generates the plain-text body for an admin broadcast email. Only the wrapper is translated, never the admin's message. */
export function broadcastText(nom: string, message: string, locale: SupportedLocale): string {
  return `${t(locale, "emails.textGreeting", { nom })}\n\n${message}\n\n${t(locale, "emails.signature")}`;
}
