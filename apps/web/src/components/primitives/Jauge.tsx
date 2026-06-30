import { Progress } from "@/components/ui/progress";
import { statusMeta } from "./status";
import { cn } from "@/lib/utils";

interface JaugeProps {
  inscrits: number;
  necessaires: number;
  /** Optional label displayed on the left (e.g. "Couverture du pôle"). */
  label?: string;
  /** Show "inscrits / necessaires" on the right. */
  showValue?: boolean;
  className?: string;
}

/** Color-coded coverage gauge: green when full, navy while filling, amber at 1 spot, coral when urgent. */
export function Jauge({ inscrits, necessaires, label, showValue = true, className }: JaugeProps) {
  const { fill } = statusMeta(inscrits, necessaires);
  const pct = necessaires ? Math.round((inscrits / necessaires) * 100) : 0;
  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between text-[12px] font-700">
          {label && <span className="uppercase tracking-[.08em] text-label">{label}</span>}
          {showValue && (
            <span className="text-ink">
              {inscrits} / {necessaires}
            </span>
          )}
        </div>
      )}
      <Progress value={pct} fill={fill} />
    </div>
  );
}
