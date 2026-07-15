import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";

/** First-time setup wizard. Creates the first admin account and site settings (WordPress-style). */
export default function InstallPage() {
  const { needsSetup, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation("auth");
  const [form, setForm] = React.useState({
    orgNom: "",
    rgpdEmail: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [logoWarning, setLogoWarning] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!loading && !needsSetup) navigate("/login", { replace: true });
  }, [loading, needsSetup, navigate]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setLogoFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setLogoPreview(url);
    } else {
      setLogoPreview(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLogoWarning(null);
    setBusy(true);
    try {
      await api.install({
        orgNom: form.orgNom,
        rgpdEmail: form.rgpdEmail,
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("install.installFailed"));
      setBusy(false);
      return;
    }
    if (logoFile) {
      try {
        await api.uploadSiteLogo(logoFile);
      } catch {
        setLogoWarning(t("install.logoUploadFailed"));
      }
    }
    await refresh();
    navigate("/admin", { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <Card className="w-full max-w-md p-8 shadow-card">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo className="h-10" />
          <div>
            <h1 className="text-2xl font-800 tracking-tighter2 text-ink">{t("install.title")}</h1>
            <p className="mt-1 text-sm text-label">{t("install.subtitle")}</p>
          </div>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="orgNom">{t("install.orgNomLabel")}</Label>
            <Input
              id="orgNom"
              value={form.orgNom}
              onChange={set("orgNom")}
              placeholder={t("install.orgNomPlaceholder")}
              required
            />
            <p className="text-[12px] text-label">{t("install.orgNomHint")}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="siteLogo">{t("install.logoLabel")}</Label>
            <div className="flex items-center gap-3">
              {logoPreview && (
                <img
                  src={logoPreview}
                  alt={t("install.logoPreviewAlt")}
                  className="h-10 w-auto rounded object-contain"
                />
              )}
              <label
                htmlFor="siteLogo"
                className="cursor-pointer rounded-[10px] border border-hair px-3.5 py-2 text-sm font-700 text-ink hover:bg-surface"
              >
                {logoFile ? t("install.logoChange") : t("install.logoChoose")}
              </label>
              {logoFile && (
                <button
                  type="button"
                  className="text-[12px] text-label hover:text-danger"
                  onClick={() => {
                    setLogoFile(null);
                    setLogoPreview(null);
                  }}
                >
                  {t("install.logoRemove")}
                </button>
              )}
            </div>
            <input
              id="siteLogo"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleLogoChange}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rgpdEmail">{t("install.rgpdEmailLabel")}</Label>
            <Input
              id="rgpdEmail"
              type="email"
              value={form.rgpdEmail}
              onChange={set("rgpdEmail")}
              placeholder={t("install.rgpdEmailPlaceholder")}
              required
            />
            <p className="text-[12px] text-label">{t("install.rgpdEmailHint")}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("install.adminEmailLabel")}</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder={t("install.adminEmailPlaceholder")}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">{t("shared.passwordLabel")}</Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={set("password")}
              placeholder={t("shared.passwordMinLengthPlaceholder")}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">{t("shared.confirmPasswordLabel")}</Label>
            <Input
              id="confirm"
              type="password"
              value={form.confirmPassword}
              onChange={set("confirmPassword")}
              required
            />
          </div>
          {error && <p className="text-sm font-600 text-danger">{error}</p>}
          {logoWarning && <p className="text-sm text-warn">{logoWarning}</p>}
          <Button type="submit" variant="brand" size="lg" className="w-full" disabled={busy}>
            {busy ? t("install.submitBusy") : t("install.submit")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
