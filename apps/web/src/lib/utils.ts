import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merges class names with Tailwind CSS conflict resolution via clsx + tailwind-merge. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats a "HH:MM" time string as "HHhMM" (French style). */
export function formatHeure(hhmm: string): string {
  return hhmm.replace(":", "h");
}

/** Formats a time range as "HHhMM – HHhMM". */
export function formatPlage(debut: string, fin: string): string {
  return `${formatHeure(debut)} – ${formatHeure(fin)}`;
}

/** Returns up to 2 initials (uppercased) from a full name. */
export function initials(nom: string): string {
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
