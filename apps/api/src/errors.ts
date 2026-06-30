import type { z } from "zod";

/** Application-level HTTP error. Handled by app.onError to produce a clean JSON response. */
export class ApiError extends Error {
  status: number;
  issues?: unknown;
  constructor(status: number, message: string, issues?: unknown) {
    super(message);
    this.status = status;
    this.issues = issues;
  }
}

/** Creates a 404 ApiError. */
export const notFound = (msg = "Ressource introuvable") => new ApiError(404, msg);
/** Creates a 401 ApiError. */
export const unauthorized = (msg = "Non authentifié") => new ApiError(401, msg);
/** Creates a 403 ApiError. */
export const forbidden = (msg = "Accès refusé") => new ApiError(403, msg);
/** Creates a 409 ApiError. */
export const conflict = (msg: string) => new ApiError(409, msg);

/** Validates data against a Zod schema; throws a 400 ApiError with flattened issues on failure. */
export function validate<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ApiError(400, "Données invalides", result.error.flatten());
  }
  return result.data;
}
