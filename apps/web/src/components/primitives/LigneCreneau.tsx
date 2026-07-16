import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("public");
  const meta = statusMeta(inscrits, necessaires);
  const complet = meta.status === "complet";
  // meta.label already matches for complet/urgent/ambre; only "cours" shows a distinct generic
  // word here instead of repeating the "N places" count already displayed just before it.
  const suffix = meta.status === "cours" ? t("shared.signedUpSuffix") : meta.label;

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
        <span className="text-sm font-700 text-label">{meta.label}</span>
      ) : selected ? (
        <Button variant="outline" size="sm" onClick={onToggle} className="w-32 gap-1.5">
          <Check className="h-4 w-4 text-success" /> {t("shared.alreadySignedUp")}
        </Button>
      ) : (
        <Button
          variant={meta.status === "ambre" ? "outline" : "brand"}
          size="sm"
          onClick={onToggle}
          className="w-32"
        >
          {t("shared.participate")}
        </Button>
      )}
    </div>
  );
}
