import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface Identite {
  nom: string;
  email: string;
  tel?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  onConfirm: (identite: Identite) => Promise<void>;
}

// Collecte l'identité du bénévole avant de valider l'inscription multi-créneaux.
export function InscriptionDialog({ open, onOpenChange, count, onConfirm }: Props) {
  const [form, setForm] = React.useState({ nom: "", email: "", tel: "" });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onConfirm({ nom: form.nom, email: form.email, tel: form.tel || undefined });
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
          <DialogDescription>
            Tu t'inscris à {count} créneau{count > 1 ? "x" : ""}. Laisse-nous tes coordonnées.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="nom">Nom complet</Label>
            <Input id="nom" value={form.nom} onChange={set("nom")} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={set("email")} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tel">Téléphone (optionnel)</Label>
            <Input id="tel" value={form.tel} onChange={set("tel")} placeholder="0470 00 00 00" />
          </div>
          {error && <p className="text-sm font-600 text-danger">{error}</p>}
          <Button type="submit" variant="brand" size="lg" className="w-full" disabled={busy}>
            {busy ? "Inscription…" : `Je participe (${count})`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
