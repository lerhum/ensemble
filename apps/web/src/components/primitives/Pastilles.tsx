import { cn } from "@/lib/utils";

interface PastillesProps {
  inscrits: number;
  necessaires: number;
  /** Fill color for signed-up dots (derived from slot status). */
  color: string;
  className?: string;
}

/** Renders one dot per slot capacity: filled dots (accent color) for signups, outline dots for remaining spots. */
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
