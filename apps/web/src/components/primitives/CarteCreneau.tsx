import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatPlage } from "@/lib/utils";
import { BadgeStatut } from "./BadgeStatut";
import { Pastilles } from "./Pastilles";
import { statusMeta } from "./status";

export interface CarteCreneauProps {
  tacheNom: string;
  debut: string;
  fin: string;
  inscrits: number;
  necessaires: number;
  /** Whether the volunteer has already selected or is signed up for this slot. */
  selected?: boolean;
  onToggle?: () => void;
  className?: string;
}

/** Mobile slot card (screen 2). Shows task name, time range, pastilles, and status badge. Hides the sign-up button and shows "Complet" when the slot is full. */
export function CarteCreneau({
  tacheNom,
  debut,
  fin,
  inscrits,
  necessaires,
  selected = false,
  onToggle,
  className,
}: CarteCreneauProps) {
  const meta = statusMeta(inscrits, necessaires);
  const complet = meta.status === "complet";

  return (
    <div
      className={cn(
        "rounded-card border bg-white p-4 transition-shadow",
        selected ? "border-ink shadow-soft" : "border-hair",
        complet && "opacity-95",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-800 leading-tight text-ink">{tacheNom}</h3>
          <p className="mt-0.5 text-sm text-label">{formatPlage(debut, fin)}</p>
        </div>
        <BadgeStatut inscrits={inscrits} necessaires={necessaires} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Pastilles inscrits={inscrits} necessaires={necessaires} color={meta.fill} />
          <span className="text-sm font-700" style={{ color: complet ? meta.fg : undefined }}>
            <span className={complet ? "" : "text-ink"}>
              {inscrits}/{necessaires}
            </span>{" "}
            <span className="text-label">inscrits</span>
          </span>
        </div>

        {complet ? (
          <span className="text-sm font-700 text-label">Complet</span>
        ) : selected ? (
          <Button variant="outline" size="sm" onClick={onToggle} className="gap-1.5">
            <Check className="h-4 w-4 text-success" /> Inscrit
          </Button>
        ) : (
          <Button
            variant={meta.status === "ambre" ? "outline" : "brand"}
            size="sm"
            onClick={onToggle}
          >
            Je participe
          </Button>
        )}
      </div>
    </div>
  );
}
