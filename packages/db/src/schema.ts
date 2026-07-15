import { relations } from "drizzle-orm";
import {
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ── Enums ────────────────────────────────────────────────────────────────
export const eventStatut = pgEnum("event_statut", ["brouillon", "publie", "archive"]);
export const volunteerStatut = pgEnum("volunteer_statut", ["confirme", "attente"]);
export const userRole = pgEnum("user_role", ["admin"]);

// ── Hiérarchie : Event → Pôles → Tâches → Créneaux ───────────────────────
export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    nom: text("nom").notNull(),
    // Date affichée telle quelle (ex. "Samedi 14 juin 2026") — pas de calcul.
    date: text("date").notNull(),
    horaires: text("horaires").notNull(),
    lieu: text("lieu").notNull(),
    histoire: text("histoire").notNull().default(""),
    banniere: text("banniere"),
    couleurTheme: text("couleur_theme").notNull().default("#DA4A40"),
    orgNom: text("org_nom").notNull().default(""),
    statut: eventStatut("statut").notNull().default("brouillon"),
    dateIso: text("date_iso"), // YYYY-MM-DD — auto-archive + tri
    pourquoiTitre: text("pourquoi_titre").notNull().default(""),
    pourquoiTexte: text("pourquoi_texte").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex("events_slug_idx").on(t.slug),
  }),
);

export const poles = pgTable("poles", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  nom: text("nom").notNull(),
  description: text("description").notNull().default(""),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Une tâche est définie UNE fois et contient PLUSIEURS créneaux.
export const taches = pgTable("taches", {
  id: uuid("id").primaryKey().defaultRandom(),
  poleId: uuid("pole_id")
    .notNull()
    .references(() => poles.id, { onDelete: "cascade" }),
  nom: text("nom").notNull(),
  description: text("description").notNull().default(""),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const creneaux = pgTable("creneaux", {
  id: uuid("id").primaryKey().defaultRandom(),
  tacheId: uuid("tache_id")
    .notNull()
    .references(() => taches.id, { onDelete: "cascade" }),
  debut: text("debut").notNull(), // "13:00"
  fin: text("fin").notNull(), // "14:00"
  necessaires: integer("necessaires").notNull().default(1),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Bénévoles + table de jointure inscriptions ───────────────────────────
export const volunteers = pgTable("volunteers", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  nom: text("nom").notNull(),
  email: text("email"),
  tel: text("tel"),
  statut: volunteerStatut("statut").notNull().default("confirme"),
  passwordHash: text("password_hash"),
  // Langue captée à l'inscription (fr/nl/en) — pour l'envoi d'emails localisés.
  locale: text("locale").notNull().default("fr"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const inscriptions = pgTable(
  "inscriptions",
  {
    creneauId: uuid("creneau_id")
      .notNull()
      .references(() => creneaux.id, { onDelete: "cascade" }),
    volunteerId: uuid("volunteer_id")
      .notNull()
      .references(() => volunteers.id, { onDelete: "cascade" }),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.creneauId, t.volunteerId] }),
  }),
);

// ── Tokens de confirmation (bénévoles) ───────────────────────────────────
export const volunteerTokens = pgTable("volunteer_tokens", {
  token: text("token").primaryKey(),
  volunteerId: uuid("volunteer_id")
    .notNull()
    .references(() => volunteers.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Sessions bénévoles ────────────────────────────────────────────────────
export const volunteerSessions = pgTable("volunteer_sessions", {
  id: text("id").primaryKey(),
  volunteerId: uuid("volunteer_id")
    .notNull()
    .references(() => volunteers.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Auth : users + sessions (installeur à la WordPress) ───────────────────
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    nom: text("nom").notNull().default(""),
    role: userRole("role").notNull().default("admin"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex("users_email_idx").on(t.email),
  }),
);

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // token de session opaque
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Relations (pour les requêtes relationnelles Drizzle) ──────────────────
export const eventsRelations = relations(events, ({ many }) => ({
  poles: many(poles),
  volunteers: many(volunteers),
}));

export const polesRelations = relations(poles, ({ one, many }) => ({
  event: one(events, { fields: [poles.eventId], references: [events.id] }),
  taches: many(taches),
}));

export const tachesRelations = relations(taches, ({ one, many }) => ({
  pole: one(poles, { fields: [taches.poleId], references: [poles.id] }),
  creneaux: many(creneaux),
}));

export const creneauxRelations = relations(creneaux, ({ one, many }) => ({
  tache: one(taches, { fields: [creneaux.tacheId], references: [taches.id] }),
  inscriptions: many(inscriptions),
}));

export const volunteersRelations = relations(volunteers, ({ one, many }) => ({
  event: one(events, { fields: [volunteers.eventId], references: [events.id] }),
  inscriptions: many(inscriptions),
  tokens: many(volunteerTokens),
  volunteerSessions: many(volunteerSessions),
}));

export const volunteerSessionsRelations = relations(volunteerSessions, ({ one }) => ({
  volunteer: one(volunteers, {
    fields: [volunteerSessions.volunteerId],
    references: [volunteers.id],
  }),
}));

export const volunteerTokensRelations = relations(volunteerTokens, ({ one }) => ({
  volunteer: one(volunteers, {
    fields: [volunteerTokens.volunteerId],
    references: [volunteers.id],
  }),
}));

export const inscriptionsRelations = relations(inscriptions, ({ one }) => ({
  creneau: one(creneaux, { fields: [inscriptions.creneauId], references: [creneaux.id] }),
  volunteer: one(volunteers, {
    fields: [inscriptions.volunteerId],
    references: [volunteers.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

// ── Paramètres globaux de l'instance (table singleton, id=1) ─────────────
export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  siteTitle: text("site_title").notNull().default(""),
  siteLogo: text("site_logo"),
  rgpdEmail: text("rgpd_email").notNull().default(""),
  reminderHoursBefore: integer("reminder_hours_before").notNull().default(24),
});

// ── Types de lignes (inférés) ────────────────────────────────────────────
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Pole = typeof poles.$inferSelect;
export type Tache = typeof taches.$inferSelect;
export type Creneau = typeof creneaux.$inferSelect;
export type Volunteer = typeof volunteers.$inferSelect;
export type VolunteerSession = typeof volunteerSessions.$inferSelect;
export type Inscription = typeof inscriptions.$inferSelect;
export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type VolunteerToken = typeof volunteerTokens.$inferSelect;
