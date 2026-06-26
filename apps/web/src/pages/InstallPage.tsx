import * as React from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";

// Installeur « à la WordPress » : crée le premier admin au premier lancement.
export default function InstallPage() {
  const { needsSetup, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = React.useState({ orgNom: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  // Si l'app est déjà installée, l'installeur est verrouillé → login.
  React.useEffect(() => {
    if (!loading && !needsSetup) navigate("/login", { replace: true });
  }, [loading, needsSetup, navigate]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.install(form);
      await refresh();
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Échec de l'installation");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <Card className="w-full max-w-md p-8 shadow-card">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo className="h-10" />
          <div>
            <h1 className="text-2xl font-800 tracking-tighter2 text-ink">Bienvenue sur Ensemble</h1>
            <p className="mt-1 text-sm text-label">
              Créez le compte administrateur de votre comité pour démarrer.
            </p>
          </div>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="orgNom">Nom du comité</Label>
            <Input id="orgNom" value={form.orgNom} onChange={set("orgNom")} placeholder="Comité Vinalmont" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={set("email")} placeholder="admin@ecole.be" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" type="password" value={form.password} onChange={set("password")} placeholder="8 caractères minimum" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirmer le mot de passe</Label>
            <Input id="confirm" type="password" value={form.confirmPassword} onChange={set("confirmPassword")} required />
          </div>
          {error && <p className="text-sm font-600 text-danger">{error}</p>}
          <Button type="submit" variant="brand" size="lg" className="w-full" disabled={busy}>
            {busy ? "Création…" : "Créer mon compte"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
