import { Hono } from "hono";
import { and, desc, eq, gt } from "drizzle-orm";
import {
  creneaux,
  events,
  inscriptions,
  volunteers,
  volunteerTokens,
} from "@ensemble/db";
import { inscriptionSchema } from "@ensemble/db/shared";
import type { AppEnv } from "../context.js";
import { conflict, notFound, validate } from "../errors.js";
import { buildEventDetailBySlug, buildMesInscriptions } from "../dto.js";

export const publicRoutes = new Hono<AppEnv>();

// Token de confirmation : hex 64 caractères, Web Crypto (Node ≥ 18 + Workers).
function randomHex(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

const TOKEN_TTL_DAYS = 7;

// Événement "en cours" : le prochain publié (dateIso ≥ aujourd'hui), ou le plus récent si aucun futur.
publicRoutes.get("/events/current", async (c) => {
  const db = c.get("db");
  const today = new Date().toISOString().slice(0, 10);
  const all = await db.query.events.findMany({
    where: eq(events.statut, "publie"),
    orderBy: desc(events.dateIso),
  });
  if (!all.length) return c.json(null);
  const upcoming = all.find((e) => e.dateIso && e.dateIso >= today) ?? all[0]!;
  const detail = await buildEventDetailBySlug(db, upcoming.slug, true);
  return c.json(detail);
});

// Page événement publique : event + pôles→tâches→créneaux + compteurs dérivés.
publicRoutes.get("/events/:slug", async (c) => {
  const detail = await buildEventDetailBySlug(c.get("db"), c.req.param("slug"), true);
  if (!detail) throw notFound("Événement introuvable");
  return c.json(detail);
});

// Pré-remplissage : retrouve un bénévole par email pour un créneau (event déduit).
publicRoutes.get("/volunteers/lookup", async (c) => {
  const db = c.get("db");
  const creneauId = c.req.query("creneauId");
  const email = c.req.query("email");
  if (!creneauId || !email) return c.json(null);

  const cr = await db.query.creneaux.findFirst({
    where: eq(creneaux.id, creneauId),
    with: { tache: { with: { pole: true } } },
  });
  if (!cr) return c.json(null);

  const eventId = cr.tache.pole.eventId;
  const [vol] = await db
    .select({ nom: volunteers.nom, email: volunteers.email, tel: volunteers.tel })
    .from(volunteers)
    .where(and(eq(volunteers.eventId, eventId), eq(volunteers.email, email)))
    .limit(1);
  return c.json(vol ?? null);
});

// Charge un créneau avec son arbre (pour eventId) et ses inscriptions.
async function loadCreneau(db: AppEnv["Variables"]["db"], id: string) {
  return db.query.creneaux.findFirst({
    where: eq(creneaux.id, id),
    with: { inscriptions: true, tache: { with: { pole: true } } },
  });
}

// Assure qu'un token valide existe pour le bénévole ; en crée un si nécessaire.
async function ensureToken(
  db: AppEnv["Variables"]["db"],
  volunteerId: string,
): Promise<string> {
  const now = new Date();
  const [existing] = await db
    .select({ token: volunteerTokens.token })
    .from(volunteerTokens)
    .where(
      and(
        eq(volunteerTokens.volunteerId, volunteerId),
        gt(volunteerTokens.expiresAt, now),
      ),
    )
    .limit(1);
  if (existing) return existing.token;

  const token = randomHex();
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_DAYS * 86_400_000);
  await db.insert(volunteerTokens).values({ token, volunteerId, expiresAt });
  return token;
}

// Inscription d'un bénévole à un créneau (multi-créneaux : un appel par créneau).
publicRoutes.post("/creneaux/:id/inscriptions", async (c) => {
  const db = c.get("db");
  const email = c.get("email");
  const webOrigin = c.get("webOrigin");
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

  let volunteerId: string;
  let isNew: boolean;

  if (existing) {
    volunteerId = existing.id;
    isNew = false;
    // Mise à jour des infos si changement de nom/tel.
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
        statut: "attente",
      })
      .returning();
    volunteerId = created!.id;
    isNew = true;
  }

  await db
    .insert(inscriptions)
    .values({ creneauId: id, volunteerId })
    .onConflictDoNothing();

  const token = await ensureToken(db, volunteerId);

  // Envoyer l'email de confirmation si nouveau ou toujours en attente.
  const vol = existing ?? (await db.query.volunteers.findFirst({ where: eq(volunteers.id, volunteerId) }));
  const needsConfirmation = !existing || existing.statut === "attente";

  if (needsConfirmation) {
    const confirmUrl = `${webOrigin}/confirmer/${token}`;
    const inscriptionsUrl = `${webOrigin}/mes-inscriptions/${token}`;
    await email.send(
      body.email,
      "Confirme ta participation — Ensemble",
      confirmationHtml(body.nom, confirmUrl, inscriptionsUrl),
      confirmationText(body.nom, confirmUrl),
    );
  }

  return c.json(
    { ok: true, inscrits: cr.inscriptions.length + 1, token, isNew, needsConfirmation },
    201,
  );
});

// Désinscription d'un bénévole (par email) d'un créneau.
publicRoutes.delete("/creneaux/:id/inscriptions", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}) as { email?: string });
  const emailAddr = (body as { email?: string }).email;
  if (!emailAddr) throw notFound("Bénévole introuvable");

  const cr = await loadCreneau(db, id);
  if (!cr) throw notFound("Créneau introuvable");
  const eventId = cr.tache.pole.eventId;

  const [vol] = await db
    .select()
    .from(volunteers)
    .where(and(eq(volunteers.eventId, eventId), eq(volunteers.email, emailAddr)))
    .limit(1);
  if (vol) {
    await db
      .delete(inscriptions)
      .where(and(eq(inscriptions.creneauId, id), eq(inscriptions.volunteerId, vol.id)));
  }
  return c.json({ ok: true });
});

// Confirmation de participation via token (lien email).
publicRoutes.get("/confirmer/:token", async (c) => {
  const db = c.get("db");
  const token = c.req.param("token");
  const now = new Date();

  const row = await db.query.volunteerTokens.findFirst({
    where: and(eq(volunteerTokens.token, token), gt(volunteerTokens.expiresAt, now)),
    with: { volunteer: true },
  });

  if (!row) return c.json({ ok: false, error: "Lien invalide ou expiré." }, 400);

  if (!row.confirmedAt) {
    await Promise.all([
      db
        .update(volunteerTokens)
        .set({ confirmedAt: now })
        .where(eq(volunteerTokens.token, token)),
      db
        .update(volunteers)
        .set({ statut: "confirme" })
        .where(eq(volunteers.id, row.volunteerId)),
    ]);
  }

  return c.json({ ok: true, alreadyConfirmed: row.confirmedAt !== null });
});

// Récapitulatif des inscriptions d'un bénévole.
publicRoutes.get("/mes-inscriptions/:token", async (c) => {
  const dto = await buildMesInscriptions(c.get("db"), c.req.param("token"));
  if (!dto) return c.json({ error: "Token introuvable." }, 404);
  return c.json(dto);
});

// ── Templates email ───────────────────────────────────────────────────────

function confirmationHtml(nom: string, confirmUrl: string, inscriptionsUrl: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>Confirme ta participation</title></head>
<body style="font-family:system-ui,sans-serif;background:#f9f9f9;margin:0;padding:40px 0">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:36px;border:1px solid #e8e8e8">
    <p style="font-size:22px;font-weight:800;color:#111;margin:0 0 8px">Bonjour ${nom} 👋</p>
    <p style="color:#555;margin:0 0 24px">Merci pour ton inscription ! Clique sur le bouton ci-dessous pour confirmer ta participation.</p>
    <a href="${confirmUrl}" style="display:inline-block;background:#DA4A40;color:#fff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:8px;text-decoration:none">
      Confirmer ma participation
    </a>
    <p style="margin:24px 0 8px;color:#888;font-size:13px">
      Ou consulte directement tes inscriptions :<br>
      <a href="${inscriptionsUrl}" style="color:#1C3A5E">${inscriptionsUrl}</a>
    </p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
    <p style="color:#aaa;font-size:12px;margin:0">Ce lien expire dans 7 jours. Si tu n'as pas demandé cette inscription, ignore cet email.</p>
  </div>
</body>
</html>`;
}

function confirmationText(nom: string, confirmUrl: string): string {
  return `Bonjour ${nom},

Merci pour ton inscription ! Confirme ta participation en ouvrant ce lien :

${confirmUrl}

Ce lien expire dans 7 jours.

Ensemble`;
}
