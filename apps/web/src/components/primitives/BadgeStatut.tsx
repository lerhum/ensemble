import { Badge } from "@/components/ui/badge";
import { statusMeta } from "./status";

interface BadgeStatutProps {
  inscrits: number;
  necessaires: number;
  className?: string;
}

/** Status badge showing "Complet", "N places", or "Urgent" with color derived from signup counts. */
export function BadgeStatut({ inscrits, necessaires, className }: BadgeStatutProps) {
  const { label, badgeVariant } = statusMeta(inscrits, necessaires);
  return (
    <Badge variant={badgeVariant} className={className}>
      {label}
    </Badge>
  );
}
