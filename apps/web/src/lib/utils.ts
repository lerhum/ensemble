import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formate une heure "13:00" → "13h00" (style FR). */
export function formatHeure(hhmm: string): string {
  return hhmm.replace(":", "h");
}

/** Plage horaire "13:00"–"14:00" → "13h00 – 14h00". */
export function formatPlage(debut: string, fin: string): string {
  return `${formatHeure(debut)} – ${formatHeure(fin)}`;
}

/** Initiales (max 2 lettres) à partir d'un nom complet. */
export function initials(nom: string): string {
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
