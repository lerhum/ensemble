// Cœur partagé front + back : zéro dépendance Node (pas d'import de schema.ts).
// Types DTO de l'API, schémas zod de validation, et logique de statut de créneau.
import { z } from "zod";

// ── Statut de créneau dérivé (inscrits / necessaires) ────────────────────
export type SlotStatus = "complet" | "cours" | "ambre" | "urgent";

/**
 * Couleur d'un créneau selon le remplissage :
 * - complet (vert)  : inscrits >= necessaires → bouton masqué + "Complet"
 * - urgent  (rouge) : 0 inscrit
 * - ambre           : il ne reste qu'1 place
 * - cours   (marine): en cours de remplissage
 */
export function slotStatus(inscrits: number, necessaires: number): SlotStatus {
  if (necessaires <= 0 || inscrits >= necessaires) return "complet";
  if (inscrits <= 0) return "urgent";
  if (necessaires - inscrits === 1) return "ambre";
  return "cours";
}

// Jetons couleur (exacts README) — réutilisés badges, jauges, pastilles.
export const STATUS_COLORS: Record<
  SlotStatus,
  { fg: string; bg: string; bar: string; label: string }
> = {
  complet: { fg: "#2F7E59", bg: "#EAF4EF", bar: "#2F7E59", label: "Complet" },
  cours: { fg: "#1C3A5E", bg: "#EEF1F4", bar: "#1C3A5E", label: "En cours" },
  ambre: { fg: "#B5781E", bg: "#FBF1DF", bar: "#E8A13A", label: "1 place" },
  urgent: { fg: "#C7443A", bg: "#FBE9E7", bar: "#DA4A40", label: "Urgent" },
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
}

export interface EventDetailDTO extends EventDTO {
  poles: PoleDTO[];
  counters: EventCounters;
}

export interface VolunteerDTO {
  id: string;
  nom: string;
  email: string;
  tel: string | null;
  statut: VolunteerStatut;
  poles: { id: string; nom: string }[];
  creneaux: { id: string; tache: string; debut: string; fin: string }[];
}

export interface SessionUserDTO {
  id: string;
  email: string;
  nom: string;
  role: "admin";
}

// ── Schémas zod (validation des bodies d'API) ────────────────────────────
const hhmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure attendue au format HH:MM");

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{6})$/, "Couleur hex attendue (#RRGGBB)");

export const installSchema = z
  .object({
    orgNom: z.string().min(1, "Nom de l'organisation requis"),
    email: z.string().email("Email invalide"),
    password: z.string().min(8, "Mot de passe : 8 caractères minimum"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });
export type InstallInput = z.infer<typeof installSchema>;

export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
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
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD attendu")
    .nullish(),
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
export const creneauUpdateSchema = creneauInputSchema
  .partial()
  .omit({ tacheId: true });

// Réordonnancement : liste ordonnée d'ids pour un type d'entité.
export const reorderSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});
export type ReorderInput = z.infer<typeof reorderSchema>;

// Inscription multi-créneaux : identité du bénévole (créée si nouvelle).
export const inscriptionSchema = z.object({
  nom: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
  tel: z.string().nullish(),
});
export type InscriptionInput = z.infer<typeof inscriptionSchema>;

// Filtres bénévoles (query string) — cumulatifs.
export const volunteerFilterSchema = z.object({
  q: z.string().optional(),
  pole: z.string().uuid().optional(),
  creneau: z.string().uuid().optional(),
  statut: z.enum(["confirme", "attente"]).optional(),
});
export type VolunteerFilter = z.infer<typeof volunteerFilterSchema>;
