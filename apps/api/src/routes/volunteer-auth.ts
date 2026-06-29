import { Hono } from "hono";
import { and, desc, eq, gt } from "drizzle-orm";
import { volunteers, volunteerSessions, volunteerTokens } from "@ensemble/db";
import {
  definePasswordSchema,
  volunteerLoginSchema,
  type VolunteerSessionDTO,
} from "@ensemble/db/shared";
import type { AppEnv } from "../context.js";
import { validate, unauthorized, notFound } from "../errors.js";
import { hashPassword, verifyPassword } from "../auth.js";
import type { Context } from "hono";
import { getSignedCookie, setSignedCookie, deleteCookie } from "hono/cookie";

export const volunteerAuthRoutes = new Hono<AppEnv>();

const VOL_SESSION_COOKIE = "ens_vol_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 jours

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/[^a-zA-Z0-9]/g, "");
}

async function createVolunteerSession(c: Context<AppEnv>, volunteerId: string) {
  const db = c.get("db");
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(volunteerSessions).values({ id: token, volunteerId, expiresAt });
  const secure = new URL(c.req.url).protocol === "https:";
  await setSignedCookie(c, VOL_SESSION_COOKIE, token, c.get("sessionSecret"), {
    httpOnly: true,
    sameSite: secure ? "None" : "Lax",
    secure,
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function resolveVolunteerSession(c: Context<AppEnv>): Promise<VolunteerSessionDTO | null> {
  const token = await getSignedCookie(c, c.get("sessionSecret"), VOL_SESSION_COOKIE);
  if (!token) return null;
  const now = new Date();
  const db = c.get("db");
  const row = await db.query.volunteerSessions.findFirst({
    where: and(eq(volunteerSessions.id, token), gt(volunteerSessions.expiresAt, now)),
    with: { volunteer: { with: { event: true } } },
  });
  if (!row) return null;
  const { volunteer } = row;
  return {
    volunteerId: volunteer.id,
    nom: volunteer.nom,
    email: volunteer.email,
    tel: volunteer.tel,
    eventSlug: volunteer.event.slug,
  };
}

// POST /auth/volunteer/define-password — Définit le mot de passe via token email.
volunteerAuthRoutes.post("/define-password", async (c) => {
  const db = c.get("db");
  const body = validate(definePasswordSchema, await c.req.json().catch(() => ({})));
  const now = new Date();

  const tokenRow = await db.query.volunteerTokens.findFirst({
    where: and(eq(volunteerTokens.token, body.token), gt(volunteerTokens.expiresAt, now)),
    with: { volunteer: true },
  });
  if (!tokenRow) throw notFound("Lien invalide ou expiré.");

  const passwordHash = await hashPassword(body.password);

  await Promise.all([
    db.update(volunteers).set({ passwordHash, statut: "confirme" }).where(eq(volunteers.id, tokenRow.volunteerId)),
    db.update(volunteerTokens).set({ confirmedAt: now }).where(eq(volunteerTokens.token, body.token)),
  ]);

  await createVolunteerSession(c, tokenRow.volunteerId);

  return c.json({ ok: true, volunteer: { nom: tokenRow.volunteer.nom, email: tokenRow.volunteer.email } });
});

// POST /auth/volunteer/login — Connexion bénévole (email + mot de passe).
volunteerAuthRoutes.post("/login", async (c) => {
  const db = c.get("db");
  const body = validate(volunteerLoginSchema, await c.req.json().catch(() => ({})));

  // Cherche le volunteer le plus récent avec cet email et un mot de passe défini.
  const rows = await db
    .select()
    .from(volunteers)
    .where(eq(volunteers.email, body.email))
    .orderBy(desc(volunteers.createdAt));

  let matched: (typeof rows)[0] | null = null;
  for (const v of rows) {
    if (!v.passwordHash) continue;
    const ok = await verifyPassword(body.password, v.passwordHash);
    if (ok) { matched = v; break; }
  }

  if (!matched) throw unauthorized();

  await createVolunteerSession(c, matched.id);

  const vol = await db.query.volunteers.findFirst({
    where: eq(volunteers.id, matched.id),
    with: { event: true },
  });

  return c.json({
    ok: true,
    volunteer: {
      volunteerId: matched.id,
      nom: matched.nom,
      email: matched.email,
      tel: matched.tel,
      eventSlug: vol?.event.slug ?? "",
    } satisfies VolunteerSessionDTO,
  });
});

// GET /auth/volunteer/me — Retourne la session courante ou null.
volunteerAuthRoutes.get("/me", async (c) => {
  const data = await resolveVolunteerSession(c);
  return c.json({ volunteer: data });
});

// POST /auth/volunteer/logout — Détruit la session.
volunteerAuthRoutes.post("/logout", async (c) => {
  const token = await getSignedCookie(c, c.get("sessionSecret"), VOL_SESSION_COOKIE);
  if (token) await c.get("db").delete(volunteerSessions).where(eq(volunteerSessions.id, token));
  deleteCookie(c, VOL_SESSION_COOKIE, { path: "/" });
  return c.json({ ok: true });
});
