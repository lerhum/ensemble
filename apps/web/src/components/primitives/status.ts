// Métadonnées d'affichage d'un créneau dérivées de inscrits/necessaires.
// S'appuie sur slotStatus + jetons couleur partagés (@ensemble/db/shared).
import { slotStatus, STATUS_COLORS, type SlotStatus } from "@ensemble/db/shared";

export interface StatusMeta {
  status: SlotStatus;
  /** Couleur de remplissage (jauge, pastilles pleines). */
  fill: string;
  fg: string;
  bg: string;
  /** Libellé de pastille de statut (« Complet », « 1 place », « 2 places »…). */
  label: string;
  placesLibres: number;
  badgeVariant: "success" | "warn" | "danger" | "default";
}

export function statusMeta(inscrits: number, necessaires: number): StatusMeta {
  const status = slotStatus(inscrits, necessaires);
  const c = STATUS_COLORS[status];
  const placesLibres = Math.max(0, necessaires - inscrits);
  const label =
    status === "complet"
      ? "Complet"
      : status === "urgent"
        ? "Urgent"
        : status === "ambre"
          ? "1 place"
          : `${placesLibres} places`;
  const badgeVariant =
    status === "complet"
      ? "success"
      : status === "urgent"
        ? "danger"
        : status === "ambre"
          ? "warn"
          : "default";
  return { status, fill: c.bar, fg: c.fg, bg: c.bg, label, placesLibres, badgeVariant };
}
