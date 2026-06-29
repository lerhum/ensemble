import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Identite } from "@/components/InscriptionDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creneauLabel: string;
  identite: Identite;
  onConfirm: () => Promise<void>;
  onEditIdentite: () => void;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  creneauLabel,
  identite,
  onConfirm,
  onEditIdentite,
}: Props) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setBusy(false);
      setError(null);
    }
  }, [open]);

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch {
      setError("L'inscription a échoué. Réessaie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirme ta participation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md bg-[#EEF1F4] px-3 py-3">
            <p className="text-[13px] font-700 text-navy">{creneauLabel}</p>
          </div>
          <p className="text-sm text-ink2">
            Confirmer l'inscription en tant que{" "}
            <span className="font-700 text-ink">{identite.nom}</span>{" "}
            <span className="text-label">({identite.email})</span> ?
          </p>
          {error && <p className="text-sm font-600 text-danger">{error}</p>}
          <Button
            type="button"
            variant="brand"
            size="lg"
            className="w-full"
            disabled={busy}
            onClick={handleConfirm}
          >
            {busy ? "Inscription…" : "Confirmer"}
          </Button>
          <button
            type="button"
            onClick={onEditIdentite}
            className="block w-full text-center text-[13px] text-label underline-offset-2 hover:text-ink hover:underline"
          >
            Modifier mes informations
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
