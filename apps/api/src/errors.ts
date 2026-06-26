import type { z } from "zod";

// Erreur applicative → réponse JSON propre (gérée par app.onError).
export class ApiError extends Error {
  status: number;
  issues?: unknown;
  constructor(status: number, message: string, issues?: unknown) {
    super(message);
    this.status = status;
    this.issues = issues;
  }
}

export const notFound = (msg = "Ressource introuvable") => new ApiError(404, msg);
export const unauthorized = (msg = "Non authentifié") => new ApiError(401, msg);
export const forbidden = (msg = "Accès refusé") => new ApiError(403, msg);
export const conflict = (msg: string) => new ApiError(409, msg);

// Valide des données avec un schéma zod, ou lève une ApiError 400 avec les issues.
export function validate<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ApiError(400, "Données invalides", result.error.flatten());
  }
  return result.data;
}
