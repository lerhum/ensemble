// Authentification portable Node + Cloudflare Workers : hachage de mot de passe
// via WebCrypto PBKDF2 (natif, rapide, dispo des deux côtés) et sessions opaques
// stockées en base, transmises par cookie signé.
import { eq, and, gt } from "drizzle-orm";
import { sessions, users } from "@ensemble/db";
import type { Db } from "@ensemble/db/node";
import type { SessionUserDTO } from "@ensemble/db/shared";
import type { Context, MiddlewareHandler } from "hono";
import { getSignedCookie, setSignedCookie, deleteCookie } from "hono/cookie";
import type { AppEnv } from "./context.js";
import { unauthorized } from "./errors.js";

// Cloudflare Workers' WebCrypto caps PBKDF2 at 100_000 iterations (Node/browsers allow more).
const PBKDF2_ITERATIONS = 100_000;
const SESSION_COOKIE = "ens_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 jours

const enc = new TextEncoder();

/** Encodes a Uint8Array as a base64 string. */
function toB64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
/** Decodes a base64 string to a Uint8Array. */
function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Derives a 256-bit key from a password and salt using PBKDF2-SHA256 via the WebCrypto API. */
async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    256,
  );
  return new Uint8Array(bits);
}

/** Hashes a password to "pbkdf2$<iter>$<saltb64>$<hashb64>". */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toB64(salt)}$${toB64(hash)}`;
}

/** Verifies a password against a stored hash using constant-time comparison to prevent timing attacks. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  const salt = fromB64(parts[2]!);
  const expected = fromB64(parts[3]!);
  const actual = await pbkdf2(password, salt, iterations);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i]! ^ expected[i]!;
  return diff === 0;
}

/** Generates a URL-safe alphanumeric random token (~43 chars). */
function randomToken(): string {
  return toB64(crypto.getRandomValues(new Uint8Array(32))).replace(/[^a-zA-Z0-9]/g, "");
}

/** Creates a session row in the DB and sets a signed HTTP-only session cookie. */
export async function createSession(c: Context<AppEnv>, userId: string): Promise<void> {
  const db = c.get("db");
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id: token, userId, expiresAt });
  // En prod (https), web (Pages) et api (Worker) sont sur des domaines distincts :
  // cookie SameSite=None + Secure pour qu'il soit envoyé en cross-site. En dev
  // (http localhost), SameSite=Lax.
  const secure = new URL(c.req.url).protocol === "https:";
  await setSignedCookie(c, SESSION_COOKIE, token, c.get("sessionSecret"), {
    httpOnly: true,
    sameSite: secure ? "None" : "Lax",
    secure,
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

/** Deletes the current session from the DB and clears the session cookie. */
export async function destroySession(c: Context<AppEnv>): Promise<void> {
  const token = await getSignedCookie(c, c.get("sessionSecret"), SESSION_COOKIE);
  if (token) await c.get("db").delete(sessions).where(eq(sessions.id, token));
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}

/** Resolves the session cookie to an admin user, or null if the cookie is missing or the session has expired. */
async function resolveUser(c: Context<AppEnv>): Promise<SessionUserDTO | null> {
  const token = await getSignedCookie(c, c.get("sessionSecret"), SESSION_COOKIE);
  if (!token) return null;
  const db: Db = c.get("db");
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      nom: users.nom,
      role: users.role,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, token), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const u = rows[0];
  return u ? { id: u.id, email: u.email, nom: u.nom, role: u.role } : null;
}

/** Middleware: resolves the session cookie and sets the current user (or null) on the context. */
export const loadUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set("user", await resolveUser(c));
  await next();
};

/** Middleware: requires an authenticated admin; throws 401 if unauthenticated. */
export const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  let user = c.get("user");
  if (user === undefined || user === null) user = await resolveUser(c);
  if (!user) throw unauthorized();
  c.set("user", user);
  await next();
};
