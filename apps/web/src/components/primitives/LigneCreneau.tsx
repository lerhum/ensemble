import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatPlage } from "@/lib/utils";
import { Pastilles } from "./Pastilles";
import { statusMeta } from "./status";

export interface LigneCreneauProps {
  debut: string;
  fin: string;
  inscrits: number;
  necessaires: number;
  selected?: boolean;
  onToggle?: () => void;
  className?: string;
}

/** Desktop slot row (screen 7, slots grouped under a task). Shows time range, pastilles, signup count/status, and a toggle button. */
export function LigneCreneau({
  debut,
  fin,
  inscrits,
  necessaires,
  selected = false,
  onToggle,
  className,
}: LigneCreneauProps) {
  const meta = statusMeta(inscrits, necessaires);
  const complet = meta.status === "complet";
  const suffix =
    meta.status === "complet"
      ? "complet"
      : meta.status === "urgent"
        ? "urgent"
        : meta.status === "ambre"
          ? "1 place"
          : "inscrits";

  return (
    <div className={cn("flex items-center gap-4 py-3", className)}>
      <span className="w-28 shrink-0 text-sm font-700 text-ink">{formatPlage(debut, fin)}</span>
      <Pastilles inscrits={inscrits} necessaires={necessaires} color={meta.fill} />
      <span className="flex-1 text-sm font-600">
        <span className="text-ink">
          {inscrits}/{necessaires}
        </span>{" "}
        <span style={{ color: meta.fg }}>· {suffix}</span>
      </span>

      {complet ? (
        <span className="text-sm font-700 text-label">Complet</span>
      ) : selected ? (
        <Button variant="outline" size="sm" onClick={onToggle} className="w-32 gap-1.5">
          <Check className="h-4 w-4 text-success" /> Inscrit
        </Button>
      ) : (
        <Button
          variant={meta.status === "ambre" ? "outline" : "brand"}
          size="sm"
          onClick={onToggle}
          className="w-32"
        >
          Je participe
        </Button>
      )}
    </div>
  );
}
