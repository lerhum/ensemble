// Typed API client. All types come from @ensemble/db/shared (single source of truth).
import type {
  EventDTO,
  EventDetailDTO,
  InscriptionInput,
  MesInscriptionsDTO,
  SessionUserDTO,
  SiteSettingsDTO,
  SettingsUpdateInput,
  VolunteerDTO,
  VolunteerFilter,
  VolunteerSessionDTO,
} from "@ensemble/db/shared";

// En dev : "/api" (proxy Vite → service api). En prod (Pages) : définir
// VITE_API_BASE = URL du Worker (ex. https://ensemble-api.<compte>.workers.dev).
const BASE = (import.meta.env.VITE_API_BASE ?? "") + "/api";

/** HTTP error thrown by the typed API client. Carries the HTTP status code and optional Zod issues. */
export class ApiError extends Error {
  status: number;
  issues?: unknown;
  constructor(status: number, message: string, issues?: unknown) {
    super(message);
    this.status = status;
    this.issues = issues;
  }
}

/** Typed fetch wrapper that prefixes BASE, sends credentials, and throws ApiError on non-2xx responses. */
async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    credentials: "include",
    headers: init?.body ? { "content-type": "application/json" } : undefined,
    ...init,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? "Erreur", data?.issues);
  }
  return data as T;
}

/** Builds a POST RequestInit with a JSON-serialized body. */
const json = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

/** Serializes a VolunteerFilter to a URL query string, omitting empty/undefined fields. */
export function qs(filter: VolunteerFilter): string {
  const p = new URLSearchParams();
  if (filter.q) p.set("q", filter.q);
  if (filter.pole) p.set("pole", filter.pole);
  if (filter.tache) p.set("tache", filter.tache);
  if (filter.creneau) p.set("creneau", filter.creneau);
  if (filter.statut) p.set("statut", filter.statut);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const api = {
  // — Installeur / Auth —
  /** Checks install status and returns site settings. */
  installStatus: () => req<{ needsSetup: boolean } & SiteSettingsDTO>("/install/status"),
  /** Runs the first-time setup wizard (creates the first admin). */
  install: (body: { orgNom: string; rgpdEmail: string; email: string; password: string; confirmPassword: string }) =>
    req<{ user: SessionUserDTO }>("/install", json(body)),
  /** Authenticates an admin by email and password. */
  login: (body: { email: string; password: string }) =>
    req<{ user: SessionUserDTO }>("/auth/login", json(body)),
  /** Destroys the current admin session. */
  logout: () => req<{ ok: true }>("/auth/logout", { method: "POST" }),
  /** Returns the currently authenticated admin user, or null. */
  me: () => req<{ user: SessionUserDTO | null }>("/auth/me"),

  // — Public —
  /** Returns the current active published event. */
  getCurrentEvent: () => req<EventDetailDTO | null>("/events/current"),
  /** Returns a published event's full detail by slug. */
  getEvent: (slug: string) => req<EventDetailDTO>(`/events/${slug}`),
  /** Signs up a volunteer for a slot by creneauId. */
  inscrire: (creneauId: string, body: InscriptionInput) =>
    req<{ ok: true; inscrits: number; token: string; isNew: boolean; needsConfirmation: boolean }>(
      `/creneaux/${creneauId}/inscriptions`,
      json(body),
    ),
  /** Removes a volunteer's signup from a slot by email. */
  desinscrire: (creneauId: string, email: string) =>
    req<{ ok: true }>(`/creneaux/${creneauId}/inscriptions`, {
      method: "DELETE",
      body: JSON.stringify({ email }),
      headers: { "content-type": "application/json" },
    }),
  /** Looks up a volunteer by email and creneauId for form pre-filling. */
  lookupVolunteer: (creneauId: string, email: string) =>
    req<{ nom: string; email: string; tel: string | null } | null>(
      `/volunteers/lookup?creneauId=${encodeURIComponent(creneauId)}&email=${encodeURIComponent(email)}`,
    ),
  /** Confirms participation via the email link token; idempotent. */
  confirmerToken: (token: string) =>
    req<{ ok: boolean; alreadyConfirmed?: boolean; error?: string }>(`/confirmer/${token}`),
  /** Returns a volunteer's signup summary via their email-link token. */
  getMesInscriptions: (token: string) => req<MesInscriptionsDTO>(`/mes-inscriptions/${token}`),
  /** Returns the signed-in volunteer's signup summary via session cookie. */
  getMesInscriptionsSession: () => req<MesInscriptionsDTO>("/mes-inscriptions"),

  // — Auth bénévole —
  /** Sets a volunteer's password via an email token. */
  volunteerDefinePassword: (body: { token: string; password: string; confirmPassword: string }) =>
    req<{ ok: true; volunteer: { nom: string; email: string } }>("/auth/volunteer/define-password", json(body)),
  /** Authenticates a volunteer by email and password. */
  volunteerLogin: (body: { email: string; password: string }) =>
    req<{ ok: true; volunteer: VolunteerSessionDTO }>("/auth/volunteer/login", json(body)),
  /** Returns the currently authenticated volunteer session, or null. */
  volunteerMe: () =>
    req<{ volunteer: VolunteerSessionDTO | null }>("/auth/volunteer/me").then((r) => r.volunteer),
  /** Destroys the current volunteer session. */
  volunteerLogout: () => req<{ ok: true }>("/auth/volunteer/logout", { method: "POST" }),

  // — Admin : événements —
  /** Returns all events (admin view, includes drafts). */
  listAdminEvents: () => req<EventDTO[]>("/admin/events"),
  /** Returns a single event's full detail by id (admin view). */
  getAdminEvent: (id: string) => req<EventDetailDTO>(`/admin/events/${id}`),
  /** Creates a new event. */
  createEvent: (body: Record<string, unknown>) =>
    req<EventDetailDTO>("/events", json(body)),
  /** Partially updates an event's fields. */
  updateEvent: (id: string, body: Record<string, unknown>) =>
    req<EventDetailDTO>(`/events/${id}`, { method: "PATCH", body: JSON.stringify(body), headers: { "content-type": "application/json" } }),
  /** Duplicates an event with all its poles, tasks, and slots as a new draft. */
  duplicateEvent: (id: string) =>
    req<EventDetailDTO>(`/admin/events/${id}/duplicate`, { method: "POST" }),
  /** Uploads an event banner image via multipart form. */
  uploadBanner: async (id: string, file: File): Promise<{ url: string }> => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE}/events/${id}/banner`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    if (!res.ok) throw new ApiError(res.status, "Échec de l'upload");
    return res.json();
  },
  /** Returns the current site settings. */
  getSettings: () => req<SiteSettingsDTO>("/settings"),
  /** Partially updates site settings. */
  updateSettings: (body: SettingsUpdateInput) =>
    req<SiteSettingsDTO>("/settings", { method: "PATCH", body: JSON.stringify(body), headers: { "content-type": "application/json" } }),

  /** Uploads the site logo via multipart form. */
  uploadSiteLogo: async (file: File): Promise<{ url: string }> => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE}/settings/logo`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    if (!res.ok) throw new ApiError(res.status, "Échec de l'upload du logo");
    return res.json();
  },

  // — Admin : pôles / tâches / créneaux —
  /** Creates a new pole within an event. */
  createPole: (body: { eventId: string; nom: string; description?: string }) =>
    req("/poles", json(body)),
  /** Updates a pole's name or description. */
  updatePole: (id: string, body: { nom?: string; description?: string }) =>
    req(`/poles/${id}`, { method: "PATCH", body: JSON.stringify(body), headers: { "content-type": "application/json" } }),
  /** Deletes a pole and all its tasks and slots. */
  deletePole: (id: string) => req(`/poles/${id}`, { method: "DELETE" }),
  /** Reorders poles by updating their positions to match the provided id order. */
  reorderPoles: (ids: string[]) =>
    req("/poles/reorder", { method: "PATCH", body: JSON.stringify({ ids }), headers: { "content-type": "application/json" } }),

  /** Creates a new task within a pole. */
  createTache: (body: { poleId: string; nom: string; description?: string }) =>
    req("/taches", json(body)),
  /** Updates a task's name or description. */
  updateTache: (id: string, body: { nom?: string; description?: string }) =>
    req(`/taches/${id}`, { method: "PATCH", body: JSON.stringify(body), headers: { "content-type": "application/json" } }),
  /** Deletes a task and all its slots. */
  deleteTache: (id: string) => req(`/taches/${id}`, { method: "DELETE" }),
  /** Reorders tasks by updating their positions to match the provided id order. */
  reorderTaches: (ids: string[]) =>
    req("/taches/reorder", { method: "PATCH", body: JSON.stringify({ ids }), headers: { "content-type": "application/json" } }),

  /** Creates a new slot within a task. */
  createCreneau: (body: { tacheId: string; debut: string; fin: string; necessaires?: number }) =>
    req("/creneaux", json(body)),
  /** Updates a slot's start time, end time, or volunteer capacity. */
  updateCreneau: (id: string, body: { debut?: string; fin?: string; necessaires?: number }) =>
    req(`/creneaux/${id}`, { method: "PATCH", body: JSON.stringify(body), headers: { "content-type": "application/json" } }),
  /** Deletes a slot and its inscriptions. */
  deleteCreneau: (id: string) => req(`/creneaux/${id}`, { method: "DELETE" }),
  /** Reorders slots by updating their positions to match the provided id order. */
  reorderCreneaux: (ids: string[]) =>
    req("/creneaux/reorder", { method: "PATCH", body: JSON.stringify({ ids }), headers: { "content-type": "application/json" } }),

  /** Deletes the current volunteer's account (GDPR right to erasure). */
  deleteMyAccount: () => req<{ ok: true }>("/volunteers/me", { method: "DELETE" }),

  // — Admin : bénévoles —
  /** Deletes a volunteer and all their inscriptions (admin action). */
  deleteVolunteer: (id: string) => req<{ ok: true }>(`/admin/volunteers/${id}`, { method: "DELETE" }),
  /** Returns filtered volunteers for an event with a total count. */
  getVolunteers: (eventId: string, filter: VolunteerFilter = {}) =>
    req<{ volunteers: VolunteerDTO[]; total: number }>(`/events/${eventId}/volunteers${qs(filter)}`),
  /** Returns the URL for a filtered volunteer CSV export (for direct download via anchor). */
  volunteersCsvUrl: (eventId: string, filter: VolunteerFilter = {}) =>
    `${BASE}/events/${eventId}/volunteers.csv${qs(filter)}`,
};
