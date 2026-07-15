// Cœur partagé front + back : zéro dépendance Node (pas d'import de schema.ts).
// Types DTO de l'API, schémas zod de validation, et logique de statut de créneau.
import { z } from "zod";

// ── Statut de créneau dérivé (inscrits / necessaires) ────────────────────
export type SlotStatus = "complet" | "cours" | "ambre" | "urgent";

/**
 * Derives the fill status of a slot from signup counts:
 * - complet (green) : inscrits >= necessaires — sign-up button hidden, shows "Complet"
 * - urgent  (red)   : 0 signups
 * - ambre   (amber) : exactly 1 spot remaining
 * - cours   (navy)  : filling up
 */
export function slotStatus(inscrits: number, necessaires: number): SlotStatus {
  if (necessaires <= 0 || inscrits >= necessaires) return "complet";
  if (inscrits <= 0) return "urgent";
  if (necessaires - inscrits === 1) return "ambre";
  return "cours";
}

// Jetons couleur (exacts README) — réutilisés badges, jauges, pastilles.
export const STATUS_COLORS: Record<SlotStatus, { fg: string; bg: string; bar: string }> = {
  complet: { fg: "#2F7E59", bg: "#EAF4EF", bar: "#2F7E59" },
  cours: { fg: "#1C3A5E", bg: "#EEF1F4", bar: "#1C3A5E" },
  ambre: { fg: "#B5781E", bg: "#FBF1DF", bar: "#E8A13A" },
  urgent: { fg: "#C7443A", bg: "#FBE9E7", bar: "#DA4A40" },
};

// ── Énumérations métier ──────────────────────────────────────────────────
export type EventStatut = "brouillon" | "publie" | "archive";
export type VolunteerStatut = "confirme" | "attente";

// ── DTO renvoyés par l'API ───────────────────────────────────────────────
export interface CreneauDTO {
  id: string;
  debut: string;
  fin: string;
  necessaires: number;
  inscrits: number; // nombre d'inscrits (dérivé)
  position: number;
  statut: SlotStatus; // dérivé
}

export interface TacheDTO {
  id: string;
  nom: string;
  description: string;
  position: number;
  creneaux: CreneauDTO[];
}

export interface PoleDTO {
  id: string;
  nom: string;
  description: string;
  position: number;
  taches: TacheDTO[];
  // Compteurs dérivés au niveau pôle
  inscrits: number;
  necessaires: number;
  nbCreneaux: number;
  placesLibres: number;
}

export interface EventCounters {
  inscrits: number; // total bénévoles inscrits (places pourvues)
  necessaires: number; // total places à pourvoir
  nbPoles: number;
  nbCreneaux: number;
  aCompleter: number; // créneaux non complets
}

export interface EventDTO {
  id: string;
  slug: string;
  nom: string;
  date: string;
  dateIso: string | null;
  horaires: string;
  lieu: string;
  histoire: string;
  banniere: string | null;
  couleurTheme: string;
  orgNom: string;
  statut: EventStatut;
  pourquoiTitre: string;
  pourquoiTexte: string;
}

export interface EventDetailDTO extends EventDTO {
  poles: PoleDTO[];
  counters: EventCounters;
}

export interface VolunteerDTO {
  id: string;
  nom: string;
  email: string | null;
  tel: string | null;
  statut: VolunteerStatut;
  poles: { id: string; nom: string }[];
  creneaux: { id: string; tacheId: string; tache: string; debut: string; fin: string }[];
}

export interface SessionUserDTO {
  id: string;
  email: string;
  nom: string;
  role: "admin";
}

export interface SiteSettingsDTO {
  siteTitle: string;
  siteLogo: string | null;
  rgpdEmail: string;
  reminderHoursBefore: number;
}

export interface MesInscriptionsDTO {
  volunteer: { nom: string; email: string; statut: VolunteerStatut };
  event: {
    nom: string;
    date: string;
    horaires: string;
    lieu: string;
    slug: string;
    orgNom: string;
    couleurTheme: string;
  };
  inscriptions: { poleNom: string; tacheNom: string; debut: string; fin: string }[];
  confirmed: boolean;
}

export interface VolunteerSessionDTO {
  volunteerId: string;
  nom: string;
  email: string;
  tel: string | null;
  eventSlug: string;
}

// ── Schémas zod (validation des bodies d'API) ────────────────────────────
// Clés stables (pas de prose française) — voir packages/i18n pour les valeurs résolues
// (namespace "validation"). Rien ne lit result.error.flatten().fieldErrors aujourd'hui, mais
// garder les deux synchronisés évite un piège pour une future UI d'erreurs de champ inline.
const V = {
  hhmm: "validation.hhmm",
  hexColor: "validation.hexColor",
  orgNomRequired: "validation.orgNomRequired",
  rgpdEmailInvalid: "validation.rgpdEmailInvalid",
  emailInvalid: "validation.emailInvalid",
  passwordMinLength: "validation.passwordMinLength",
  passwordsMismatch: "validation.passwordsMismatch",
  passwordRequired: "validation.passwordRequired",
  dateIsoFormat: "validation.dateIsoFormat",
  tokenRequired: "validation.tokenRequired",
  nomRequired: "validation.nomRequired",
  subjectRequired: "validation.subjectRequired",
  messageRequired: "validation.messageRequired",
} as const;

export const settingsUpdateSchema = z.object({
  siteTitle: z.string().min(1).optional(),
  siteLogo: z.string().url().nullish(),
  rgpdEmail: z.string().email().optional(),
  reminderHoursBefore: z.number().int().min(1).max(168).optional(),
});
export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, V.hhmm);

const hexColor = z.string().regex(/^#([0-9a-fA-F]{6})$/, V.hexColor);

export const installSchema = z
  .object({
    orgNom: z.string().min(1, V.orgNomRequired),
    rgpdEmail: z.string().email(V.rgpdEmailInvalid),
    email: z.string().email(V.emailInvalid),
    password: z.string().min(8, V.passwordMinLength),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: V.passwordsMismatch,
    path: ["confirmPassword"],
  });
export type InstallInput = z.infer<typeof installSchema>;

export const loginSchema = z.object({
  email: z.string().email(V.emailInvalid),
  password: z.string().min(1, V.passwordRequired),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const eventInputSchema = z.object({
  nom: z.string().min(1),
  date: z.string().default(""),
  horaires: z.string().default(""),
  lieu: z.string().default(""),
  histoire: z.string().max(600).default(""),
  banniere: z.string().url().nullish(),
  couleurTheme: hexColor.default("#DA4A40"),
  orgNom: z.string().default(""),
  statut: z.enum(["brouillon", "publie", "archive"]).default("brouillon"),
  dateIso: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, V.dateIsoFormat)
    .nullish(),
  pourquoiTitre: z.string().default(""),
  pourquoiTexte: z.string().default(""),
});
export type EventInput = z.infer<typeof eventInputSchema>;
export const eventUpdateSchema = eventInputSchema.partial();

export const poleInputSchema = z.object({
  nom: z.string().min(1),
  description: z.string().default(""),
});
export const poleUpdateSchema = poleInputSchema.partial();

export const tacheInputSchema = z.object({
  poleId: z.string().uuid(),
  nom: z.string().min(1),
  description: z.string().default(""),
});
export const tacheUpdateSchema = tacheInputSchema.partial().omit({ poleId: true });

export const creneauInputSchema = z.object({
  tacheId: z.string().uuid(),
  debut: hhmm,
  fin: hhmm,
  necessaires: z.coerce.number().int().min(1).default(1),
});
export const creneauUpdateSchema = creneauInputSchema.partial().omit({ tacheId: true });

// Réordonnancement : liste ordonnée d'ids pour un type d'entité.
export const reorderSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});
export type ReorderInput = z.infer<typeof reorderSchema>;

export const definePasswordSchema = z
  .object({
    token: z.string().min(1, V.tokenRequired),
    password: z.string().min(8, V.passwordMinLength),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: V.passwordsMismatch,
    path: ["confirmPassword"],
  });
export type DefinePasswordInput = z.infer<typeof definePasswordSchema>;

export const volunteerLoginSchema = z.object({
  email: z.string().email(V.emailInvalid),
  password: z.string().min(1, V.passwordRequired),
});
export type VolunteerLoginInput = z.infer<typeof volunteerLoginSchema>;

// Inscription multi-créneaux : identité du bénévole (créée si nouvelle).
export const inscriptionSchema = z.object({
  nom: z.string().min(1, V.nomRequired),
  email: z.string().email(V.emailInvalid),
  tel: z.string().nullish(),
  // Absent ou invalide retombe silencieusement sur "fr" — ne doit jamais faire échouer
  // l'inscription à cause d'une valeur de langue inattendue.
  locale: z
    .string()
    .optional()
    .transform((v): "fr" | "nl" | "en" => (v === "nl" || v === "en" ? v : "fr")),
});
// z.input (not z.infer/z.output): callers may omit locale — the transform that defaults it to
// "fr" only applies on the server side when the schema actually parses the request body.
export type InscriptionInput = z.input<typeof inscriptionSchema>;

// Inscription manuelle par l'admin : nom seul suffit, email/tel optionnels.
export const adminInscriptionSchema = z.object({
  nom: z.string().min(1, V.nomRequired),
  email: z.string().email(V.emailInvalid).nullish(),
  tel: z.string().nullish(),
});
export type AdminInscriptionInput = z.infer<typeof adminInscriptionSchema>;

// Filtres bénévoles (query string) — cumulatifs.
export const volunteerFilterSchema = z.object({
  q: z.string().optional(),
  pole: z.string().uuid().optional(),
  tache: z.string().uuid().optional(),
  creneau: z.string().uuid().optional(),
  statut: z.enum(["confirme", "attente"]).optional(),
});
export type VolunteerFilter = z.infer<typeof volunteerFilterSchema>;

// Diffusion admin ciblée : soit un filtre bénévoles, soit une liste explicite d'ids.
export const broadcastSchema = z.object({
  subject: z.string().min(1, V.subjectRequired),
  message: z.string().min(1, V.messageRequired),
  filter: volunteerFilterSchema.optional(),
  volunteerIds: z.array(z.string().uuid()).optional(),
});
export type BroadcastInput = z.infer<typeof broadcastSchema>;
