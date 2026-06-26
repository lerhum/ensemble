import { Badge } from "@/components/ui/badge";
import { statusMeta } from "./status";

interface BadgeStatutProps {
  inscrits: number;
  necessaires: number;
  className?: string;
}

// Pastille de statut : « Complet » (vert), « 1 place » / « N places » (ambre/
// gris), « Urgent » (corail). Couleur dérivée de inscrits/necessaires.
export function BadgeStatut({ inscrits, necessaires, className }: BadgeStatutProps) {
  const { label, badgeVariant } = statusMeta(inscrits, necessaires);
  return (
    <Badge variant={badgeVariant} className={className}>
      {label}
    </Badge>
  );
}
