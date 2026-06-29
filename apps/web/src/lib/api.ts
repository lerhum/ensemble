// Client API typé. Les types proviennent de @ensemble/db/shared (source unique).
import type {
  EventDTO,
  EventDetailDTO,
  InscriptionInput,
  MesInscriptionsDTO,
  SessionUserDTO,
  VolunteerDTO,
  VolunteerFilter,
  VolunteerSessionDTO,
} from "@ensemble/db/shared";

// En dev : "/api" (proxy Vite → service api). En prod (Pages) : définir
// VITE_API_BASE = URL du Worker (ex. https://ensemble-api.<compte>.workers.dev).
const BASE = (import.meta.env.VITE_API_BASE ?? "") + "/api";

export class ApiError extends Error {
  status: number;
  issues?: unknown;
  constructor(status: number, message: string, issues?: unknown) {
    super(message);
    this.status = status;
    this.issues = issues;
  }
}

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

const json = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

function qs(filter: VolunteerFilter): string {
  const p = new URLSearchParams();
  if (filter.q) p.set("q", filter.q);
  if (filter.pole) p.set("pole", filter.pole);
  if (filter.creneau) p.set("creneau", filter.creneau);
  if (filter.statut) p.set("statut", filter.statut);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const api = {
  // — Installeur / Auth —
  installStatus: () => req<{ needsSetup: boolean }>("/install/status"),
  install: (body: { orgNom: string; email: string; password: string; confirmPassword: string }) =>
    req<{ user: SessionUserDTO }>("/install", json(body)),
  login: (body: { email: string; password: string }) =>
    req<{ user: SessionUserDTO }>("/auth/login", json(body)),
  logout: () => req<{ ok: true }>("/auth/logout", { method: "POST" }),
  me: () => req<{ user: SessionUserDTO | null }>("/auth/me"),

  // — Public —
  getCurrentEvent: () => req<EventDetailDTO | null>("/events/current"),
  getEvent: (slug: string) => req<EventDetailDTO>(`/events/${slug}`),
  inscrire: (creneauId: string, body: InscriptionInput) =>
    req<{ ok: true; inscrits: number; token: string; isNew: boolean; needsConfirmation: boolean }>(
      `/creneaux/${creneauId}/inscriptions`,
      json(body),
    ),
  desinscrire: (creneauId: string, email: string) =>
    req<{ ok: true }>(`/creneaux/${creneauId}/inscriptions`, {
      method: "DELETE",
      body: JSON.stringify({ email }),
      headers: { "content-type": "application/json" },
    }),
  lookupVolunteer: (creneauId: string, email: string) =>
    req<{ nom: string; email: string; tel: string | null } | null>(
      `/volunteers/lookup?creneauId=${encodeURIComponent(creneauId)}&email=${encodeURIComponent(email)}`,
    ),
  confirmerToken: (token: string) =>
    req<{ ok: boolean; alreadyConfirmed?: boolean; error?: string }>(`/confirmer/${token}`),
  getMesInscriptions: (token: string) => req<MesInscriptionsDTO>(`/mes-inscriptions/${token}`),
  getMesInscriptionsSession: () => req<MesInscriptionsDTO>("/mes-inscriptions"),

  // — Auth bénévole —
  volunteerDefinePassword: (body: { token: string; password: string; confirmPassword: string }) =>
    req<{ ok: true; volunteer: { nom: string; email: string } }>("/auth/volunteer/define-password", json(body)),
  volunteerLogin: (body: { email: string; password: string }) =>
    req<{ ok: true; volunteer: VolunteerSessionDTO }>("/auth/volunteer/login", json(body)),
  volunteerMe: () =>
    req<{ volunteer: VolunteerSessionDTO | null }>("/auth/volunteer/me").then((r) => r.volunteer),
  volunteerLogout: () => req<{ ok: true }>("/auth/volunteer/logout", { method: "POST" }),

  // — Admin : événements —
  listAdminEvents: () => req<EventDTO[]>("/admin/events"),
  getAdminEvent: (id: string) => req<EventDetailDTO>(`/admin/events/${id}`),
  createEvent: (body: Record<string, unknown>) =>
    req<EventDetailDTO>("/events", json(body)),
  updateEvent: (id: string, body: Record<string, unknown>) =>
    req<EventDetailDTO>(`/events/${id}`, { method: "PATCH", body: JSON.stringify(body), headers: { "content-type": "application/json" } }),
  duplicateEvent: (id: string) =>
    req<EventDetailDTO>(`/admin/events/${id}/duplicate`, { method: "POST" }),
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

  // — Admin : pôles / tâches / créneaux —
  createPole: (body: { eventId: string; nom: string; description?: string }) =>
    req("/poles", json(body)),
  updatePole: (id: string, body: { nom?: string; description?: string }) =>
    req(`/poles/${id}`, { method: "PATCH", body: JSON.stringify(body), headers: { "content-type": "application/json" } }),
  deletePole: (id: string) => req(`/poles/${id}`, { method: "DELETE" }),
  reorderPoles: (ids: string[]) =>
    req("/poles/reorder", { method: "PATCH", body: JSON.stringify({ ids }), headers: { "content-type": "application/json" } }),

  createTache: (body: { poleId: string; nom: string; description?: string }) =>
    req("/taches", json(body)),
  updateTache: (id: string, body: { nom?: string; description?: string }) =>
    req(`/taches/${id}`, { method: "PATCH", body: JSON.stringify(body), headers: { "content-type": "application/json" } }),
  deleteTache: (id: string) => req(`/taches/${id}`, { method: "DELETE" }),
  reorderTaches: (ids: string[]) =>
    req("/taches/reorder", { method: "PATCH", body: JSON.stringify({ ids }), headers: { "content-type": "application/json" } }),

  createCreneau: (body: { tacheId: string; debut: string; fin: string; necessaires?: number }) =>
    req("/creneaux", json(body)),
  updateCreneau: (id: string, body: { debut?: string; fin?: string; necessaires?: number }) =>
    req(`/creneaux/${id}`, { method: "PATCH", body: JSON.stringify(body), headers: { "content-type": "application/json" } }),
  deleteCreneau: (id: string) => req(`/creneaux/${id}`, { method: "DELETE" }),
  reorderCreneaux: (ids: string[]) =>
    req("/creneaux/reorder", { method: "PATCH", body: JSON.stringify({ ids }), headers: { "content-type": "application/json" } }),

  // — Admin : bénévoles —
  getVolunteers: (eventId: string, filter: VolunteerFilter = {}) =>
    req<{ volunteers: VolunteerDTO[]; total: number }>(`/events/${eventId}/volunteers${qs(filter)}`),
  volunteersCsvUrl: (eventId: string, filter: VolunteerFilter = {}) =>
    `${BASE}/events/${eventId}/volunteers.csv${qs(filter)}`,
};
