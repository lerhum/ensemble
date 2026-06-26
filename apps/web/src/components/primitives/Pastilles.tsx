import { cn } from "@/lib/utils";

interface PastillesProps {
  inscrits: number;
  necessaires: number;
  /** Couleur des pastilles pleines (par défaut dérivée du statut). */
  color: string;
  className?: string;
}

// Pastilles : un point plein (couleur statut) par inscrit, un point contour
// gris par place restante. Reflète inscrits/necessaires.
export function Pastilles({ inscrits, necessaires, color, className }: PastillesProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {Array.from({ length: necessaires }).map((_, i) =>
        i < inscrits ? (
          <span key={i} className="h-2 w-2 rounded-full" style={{ background: color }} />
        ) : (
          <span key={i} className="h-2 w-2 rounded-full border border-[#C2C8CF] bg-transparent" />
        ),
      )}
    </div>
  );
}
