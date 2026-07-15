import * as React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "@/lib/api";
import { useVolunteer } from "@/lib/volunteer-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Volunteer login page with email/password form. */
export default function VolunteerLoginPage() {
  const navigate = useNavigate();
  const { refreshSession } = useVolunteer();
  const { t } = useTranslation("auth");

  const [form, setForm] = React.useState({ email: "", password: "" });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.volunteerLogin({ email: form.email, password: form.password });
      await refreshSession();
      navigate("/mes-inscriptions");
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        setError(t("volunteerLogin.invalidCredentials"));
      } else {
        setError(t("volunteerLogin.genericError"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F9F9F8] py-10 px-4">
      <div className="mx-auto max-w-sm space-y-6">
        <div>
          <Link to="/" className="text-[13px] text-label hover:underline">
            {t("shared.backToHome")}
          </Link>
          <h1 className="mt-3 text-2xl font-800 tracking-tighter2 text-ink">
            {t("volunteerLogin.title")}
          </h1>
          <p className="mt-1 text-sm text-label">{t("volunteerLogin.subtitle")}</p>
        </div>

        <div className="rounded-card border border-hair bg-white p-6">
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("shared.emailLabel")}</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={set("email")}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t("shared.passwordLabel")}</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={set("password")}
                required
              />
            </div>
            {error && <p className="text-sm font-600 text-danger">{error}</p>}
            <Button type="submit" variant="brand" size="lg" className="w-full" disabled={busy}>
              {busy ? t("shared.loggingIn") : t("shared.login")}
            </Button>
          </form>
        </div>

        <p className="text-center text-[13px] text-label">
          {t("volunteerLogin.noPasswordYet")}{" "}
          <span className="text-navy">{t("volunteerLogin.noPasswordHint")}</span>
        </p>
      </div>
    </div>
  );
}
