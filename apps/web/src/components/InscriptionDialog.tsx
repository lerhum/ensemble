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
import { api } from "@/lib/api";

export interface Identite {
  nom: string;
  email: string;
  tel?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  creneauId: string; // pour le lookup email
  onConfirm: (identite: Identite) => Promise<void>;
}

// Collecte l'identité du bénévole avant de valider l'inscription multi-créneaux.
// Sur blur de l'email, tente de pré-remplir nom et tel si déjà connu.
export function InscriptionDialog({ open, onOpenChange, count, creneauId, onConfirm }: Props) {
  const [form, setForm] = React.useState({ nom: "", email: "", tel: "" });
  const [prefilled, setPrefilled] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Réinitialise quand on ferme.
  React.useEffect(() => {
    if (!open) {
      setForm({ nom: "", email: "", tel: "" });
      setPrefilled(false);
      setError(null);
    }
  }, [open]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onEmailBlur() {
    const email = form.email.trim();
    if (!email || !email.includes("@")) return;
    try {
      const known = await api.lookupVolunteer(creneauId, email);
      if (known) {
        setForm((f) => ({
          ...f,
          nom: known.nom || f.nom,
          tel: known.tel || f.tel,
        }));
        setPrefilled(true);
      }
    } catch {
      // lookup silencieux
    }
  }

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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={set("email")}
              onBlur={onEmailBlur}
              required
            />
          </div>
          {prefilled && (
            <p className="rounded-md bg-[#EEF1F4] px-3 py-2 text-[13px] text-navy">
              Nous t'avons retrouvé·e — tes infos sont pré-remplies.
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="nom">Nom complet</Label>
            <Input id="nom" value={form.nom} onChange={set("nom")} required />
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
