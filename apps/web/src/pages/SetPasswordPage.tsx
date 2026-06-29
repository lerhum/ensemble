import * as React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { useVolunteer } from "@/lib/volunteer-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DefinirMotDePassePage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const { refreshSession } = useVolunteer();

  const [form, setForm] = React.useState({ password: "", confirmPassword: "" });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.volunteerDefinePassword({ token, password: form.password, confirmPassword: form.confirmPassword });
      await refreshSession();
      setDone(true);
      setTimeout(() => navigate("/mes-inscriptions"), 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Une erreur est survenue.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Center>
        <CheckCircle2 className="h-10 w-10 text-success" />
        <p className="mt-4 text-lg font-700 text-ink">Mot de passe défini !</p>
        <p className="mt-1 text-sm text-label">Redirection vers tes inscriptions…</p>
      </Center>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F9F8] py-10 px-4">
      <div className="mx-auto max-w-sm space-y-6">
        <div>
          <Link to="/" className="text-[13px] text-label hover:underline">
            ‹ Retour à l'accueil
          </Link>
          <h1 className="mt-3 text-2xl font-800 tracking-tighter2 text-ink">
            Crée ton accès
          </h1>
          <p className="mt-1 text-sm text-label">
            Définis un mot de passe pour retrouver tes inscriptions à tout moment.
          </p>
        </div>

        <div className="rounded-card border border-hair bg-white p-6">
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={set("password")}
                placeholder="8 caractères minimum"
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={set("confirmPassword")}
                required
              />
            </div>
            {error && <p className="text-sm font-600 text-danger">{error}</p>}
            <Button type="submit" variant="brand" size="lg" className="w-full" disabled={busy}>
              {busy ? "Enregistrement…" : "Définir mon mot de passe"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-white">
      <div className="flex flex-col items-center text-center px-4">{children}</div>
    </div>
  );
}
