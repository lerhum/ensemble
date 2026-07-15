import * as React from "react";
import { Upload, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

/** Admin settings page for site title, logo, and GDPR contact email. */
export default function AdminSettingsPage() {
  const { siteTitle, siteLogo, rgpdEmail, refresh } = useAuth();
  const { t } = useTranslation("admin");
  const [title, setTitle] = React.useState(siteTitle);
  const [logo, setLogo] = React.useState<string | null>(siteLogo);
  const [rgpd, setRgpd] = React.useState(rgpdEmail);
  const [reminderHoursBefore, setReminderHoursBefore] = React.useState(24);
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // Sync si les valeurs globales changent (ex. après install)
  React.useEffect(() => {
    setTitle(siteTitle);
  }, [siteTitle]);
  React.useEffect(() => {
    setLogo(siteLogo);
  }, [siteLogo]);
  React.useEffect(() => {
    setRgpd(rgpdEmail);
  }, [rgpdEmail]);

  React.useEffect(() => {
    api.getSettings().then((s) => setReminderHoursBefore(s.reminderHoursBefore));
  }, []);

  async function saveTitle() {
    if (!title.trim()) return;
    await api.updateSettings({ siteTitle: title.trim() });
    await refresh();
  }

  async function saveRgpd() {
    if (!rgpd.trim()) return;
    await api.updateSettings({ rgpdEmail: rgpd.trim() });
    await refresh();
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await api.uploadSiteLogo(file);
      setLogo(url);
      await refresh();
    } finally {
      setUploading(false);
      // reset l'input pour permettre de re-sélectionner le même fichier
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeLogo() {
    await api.updateSettings({ siteLogo: null });
    setLogo(null);
    await refresh();
  }

  async function saveReminderHoursBefore() {
    if (!Number.isInteger(reminderHoursBefore) || reminderHoursBefore < 1) return;
    await api.updateSettings({ reminderHoursBefore });
  }

  return (
    <AdminLayout title={t("settings.title")}>
      <div className="max-w-lg space-y-8">
        <section>
          <p className="mb-4 text-[11px] font-800 uppercase tracking-[.1em] text-label2">
            {t("settings.publicSiteSection")}
          </p>
          <div className="space-y-6">
            <div className="space-y-1.5">
              <Label htmlFor="siteTitle">{t("settings.siteNameLabel")}</Label>
              <Input
                id="siteTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveTitle}
                placeholder={t("settings.siteNamePlaceholder")}
              />
              <p className="text-[12px] text-label">{t("settings.siteNameHint")}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rgpdEmail">{t("settings.rgpdEmailLabel")}</Label>
              <Input
                id="rgpdEmail"
                type="email"
                value={rgpd}
                onChange={(e) => setRgpd(e.target.value)}
                onBlur={saveRgpd}
                placeholder={t("settings.rgpdEmailPlaceholder")}
              />
              <p className="text-[12px] text-label">{t("settings.rgpdEmailHint")}</p>
            </div>

            <div className="space-y-1.5">
              <Label>{t("settings.logoLabel")}</Label>
              <div className="overflow-hidden rounded-[14px] border border-hair bg-surface">
                {logo ? (
                  <div className="flex h-24 items-center justify-center p-4">
                    <img
                      src={logo}
                      alt={t("settings.logoLabel")}
                      className="h-full w-auto object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-24 items-center justify-center text-sm text-label2">
                    {t("settings.noLogo")}
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onUpload} />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  {logo ? t("shared.replace") : t("settings.chooseLogo")}
                </Button>
                {logo && (
                  <Button variant="outline" size="sm" onClick={removeLogo}>
                    <X className="h-4 w-4" />
                    {t("settings.removeLogo")}
                  </Button>
                )}
              </div>
              <p className="text-[12px] text-label">{t("settings.logoHint")}</p>
            </div>
          </div>
        </section>

        <section>
          <p className="mb-4 text-[11px] font-800 uppercase tracking-[.1em] text-label2">
            {t("settings.remindersSection")}
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="reminderHoursBefore">{t("settings.reminderHoursLabel")}</Label>
            <Input
              id="reminderHoursBefore"
              type="number"
              min={1}
              max={168}
              value={reminderHoursBefore}
              onChange={(e) => setReminderHoursBefore(Number(e.target.value))}
              onBlur={saveReminderHoursBefore}
            />
            <p className="text-[12px] text-label">{t("settings.reminderHoursHint")}</p>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
