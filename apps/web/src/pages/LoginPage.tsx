import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";

/** Admin login page with email/password form. */
export default function LoginPage() {
  const { needsSetup, loading, login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation("auth");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  // Pas encore installé → vers l'installeur.
  React.useEffect(() => {
    if (!loading && needsSetup) navigate("/install", { replace: true });
  }, [loading, needsSetup, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("login.loginFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <Card className="w-full max-w-md p-8 shadow-card">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo className="h-10" />
          <h1 className="text-2xl font-800 tracking-tighter2 text-ink">{t("login.title")}</h1>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("shared.emailLabel")}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">{t("shared.passwordLabel")}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm font-600 text-danger">{error}</p>}
          <Button type="submit" variant="brand" size="lg" className="w-full" disabled={busy}>
            {busy ? t("shared.loggingIn") : t("shared.login")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
