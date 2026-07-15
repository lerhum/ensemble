import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Check, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { EventDetailDTO } from "@ensemble/db/shared";
import { api } from "@/lib/api";
import { useAdminEvent } from "@/lib/useEvent";
import { applyAccent } from "@/lib/theme";
import { cn, formatFullDate } from "@/lib/utils";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const SWATCHES = ["#1C3A5E", "#DA4A40", "#2F7E59", "#E8A13A", "#7A5CC0"];

/** Admin event dashboard: edit event details, banner, theme color, and view live coverage stats. */
export default function AdminDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { event, loading, error, reload } = useAdminEvent(id ?? "");
  const { t } = useTranslation("admin");

  if (!id) {
    navigate("/admin");
    return null;
  }

  if (loading) {
    return (
      <AdminLayout eyebrow={t("dashboard.eyebrow")} title={t("shared.loading")}>
        <p className="text-label">{t("shared.loading")}</p>
      </AdminLayout>
    );
  }

  if (error || !event) {
    return (
      <AdminLayout eyebrow={t("dashboard.eyebrow")} title={t("dashboard.eventNotFound")}>
        <p className="text-label">{error ?? t("dashboard.eventNotFoundBody")}</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate("/admin")}>
          {t("dashboard.backToEvents")}
        </Button>
      </AdminLayout>
    );
  }

  return <DashboardInner event={event} reload={reload} />;
}

/** Inner component for the event dashboard, rendered once event data is loaded. */
function DashboardInner({ event, reload }: { event: EventDetailDTO; reload: () => Promise<void> }) {
  const { t, i18n } = useTranslation("admin");
  const [form, setForm] = React.useState({
    nom: event.nom,
    date: event.date,
    dateIso: event.dateIso ?? "",
    horaires: event.horaires,
    lieu: event.lieu,
    histoire: event.histoire,
    pourquoiTitre: event.pourquoiTitre,
    pourquoiTexte: event.pourquoiTexte,
    couleurTheme: event.couleurTheme,
  });
  const [banniere, setBanniere] = React.useState(event.banniere);
  const [statut, setStatut] = React.useState(event.statut);
  const [saving, setSaving] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    applyAccent(form.couleurTheme);
  }, [form.couleurTheme]);

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const setDateIso = (e: React.ChangeEvent<HTMLInputElement>) => {
    const iso = e.target.value;
    setForm((f) => ({
      ...f,
      dateIso: iso,
      date: iso ? formatFullDate(iso, i18n.language) : f.date,
    }));
  };

  const persist = (patch: Record<string, unknown>) => api.updateEvent(event.id, patch);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { url } = await api.uploadBanner(event.id, file);
    setBanniere(url);
  };

  const publish = async (next: "publie" | "brouillon") => {
    setSaving(true);
    try {
      await persist({ ...form, statut: next });
      setStatut(next);
      await reload();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      eyebrow={t("dashboard.eyebrow")}
      title={event.nom || t("dashboard.untitledEvent")}
      actions={
        <>
          <Button variant="outline" onClick={() => publish("brouillon")} disabled={saving}>
            {t("dashboard.saveDraft")}
          </Button>
          <Button variant="default" onClick={() => publish("publie")} disabled={saving}>
            {statut === "publie" ? t("dashboard.publishUpdate") : t("dashboard.publish")}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        {/* Informations */}
        <div>
          <p className="mb-4 text-[11px] font-800 uppercase tracking-[.1em] text-label2">
            {t("dashboard.infoSection")}
          </p>
          <div className="space-y-5">
            <Field label={t("dashboard.eventNameLabel")}>
              <Input
                value={form.nom}
                onChange={set("nom")}
                onBlur={() => persist({ nom: form.nom })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t("dashboard.dateLabel")}>
                <Input
                  type="date"
                  value={form.dateIso}
                  onChange={setDateIso}
                  onBlur={() => persist({ dateIso: form.dateIso || null, date: form.date })}
                />
                {form.date && <p className="mt-1 text-[12px] text-label capitalize">{form.date}</p>}
              </Field>
              <Field label={t("dashboard.scheduleLabel")}>
                <Input
                  value={form.horaires}
                  onChange={set("horaires")}
                  placeholder={t("dashboard.schedulePlaceholder")}
                  onBlur={() => persist({ horaires: form.horaires })}
                />
              </Field>
            </div>
            <Field label={t("dashboard.locationLabel")}>
              <Input
                value={form.lieu}
                onChange={set("lieu")}
                onBlur={() => persist({ lieu: form.lieu })}
              />
            </Field>
            <Field label={t("dashboard.storyLabel")}>
              <Textarea
                value={form.histoire}
                onChange={set("histoire")}
                onBlur={() => persist({ histoire: form.histoire })}
                maxLength={600}
                rows={5}
              />
              <div className="mt-1 text-right text-[12px] text-label">
                {t("dashboard.charCount", { count: form.histoire.length })}
              </div>
            </Field>
            <div className="mt-2 border-t border-hair pt-5">
              <p className="mb-4 text-[11px] font-800 uppercase tracking-[.1em] text-label2">
                {t("dashboard.whySection")}
              </p>
              <div className="space-y-4">
                <Field label={t("dashboard.titleLabel")}>
                  <Input
                    value={form.pourquoiTitre}
                    onChange={set("pourquoiTitre")}
                    onBlur={() => persist({ pourquoiTitre: form.pourquoiTitre })}
                    placeholder={t("dashboard.titlePlaceholder")}
                  />
                </Field>
                <Field label={t("dashboard.textLabel")}>
                  <Textarea
                    value={form.pourquoiTexte}
                    onChange={set("pourquoiTexte")}
                    onBlur={() => persist({ pourquoiTexte: form.pourquoiTexte })}
                    rows={4}
                    placeholder={t("dashboard.textPlaceholder")}
                  />
                </Field>
              </div>
            </div>
          </div>
        </div>

        {/* Personnalisation */}
        <div>
          <p className="mb-4 text-[11px] font-800 uppercase tracking-[.1em] text-label2">
            {t("dashboard.customizationSection")}
          </p>

          <Label className="mb-1.5 block">{t("dashboard.bannerLabel")}</Label>
          <div className="overflow-hidden rounded-[14px] border border-hair bg-surface">
            {banniere ? (
              <img
                src={banniere}
                alt={t("dashboard.bannerLabel")}
                className="h-36 w-full object-cover"
              />
            ) : (
              <div className="flex h-36 items-center justify-center text-sm text-label2">
                {t("dashboard.noBanner")}
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onUpload} />
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4" /> {t("shared.replace")}
          </Button>

          <Label className="mb-1.5 mt-6 block">{t("dashboard.themeColorLabel")}</Label>
          <div className="flex items-center gap-2.5">
            {SWATCHES.map((color) => (
              <button
                key={color}
                onClick={() => {
                  setForm((f) => ({ ...f, couleurTheme: color }));
                  persist({ couleurTheme: color });
                }}
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-full ring-offset-2 transition",
                  form.couleurTheme.toLowerCase() === color.toLowerCase() && "ring-2 ring-ink",
                )}
                style={{ background: color }}
                aria-label={t("dashboard.colorAriaLabel", { color })}
              >
                {form.couleurTheme.toLowerCase() === color.toLowerCase() && (
                  <Check className="h-4 w-4 text-white" />
                )}
              </button>
            ))}
            <Input
              value={form.couleurTheme}
              onChange={set("couleurTheme")}
              onBlur={() => persist({ couleurTheme: form.couleurTheme })}
              className="ml-1 h-9 w-28 font-600 uppercase"
            />
          </div>

          {/* Aperçu page publique */}
          <p className="mb-2 mt-6 text-[11px] font-800 uppercase tracking-[.1em] text-label2">
            {t("dashboard.publicPreview")}
          </p>
          <div className="overflow-hidden rounded-card border border-hair bg-white shadow-soft">
            {banniere ? (
              <img src={banniere} alt="" className="h-28 w-full object-cover" />
            ) : (
              <div className="h-28 w-full bg-chip" />
            )}
            <div className="p-4">
              <p className="text-[11px] font-800 uppercase tracking-[.1em] text-label2">
                {t("dashboard.previewKicker")}
              </p>
              <h3 className="mt-1 text-lg font-800 leading-tight tracking-tighter2 text-ink">
                {form.nom}
              </h3>
              <p className="mt-0.5 text-[13px] text-label">
                {form.date || t("eventsList.emptyValue")}
                {form.horaires ? ` · ${form.horaires}` : ""}
              </p>
              <Button variant="brand" size="sm" className="mt-3 w-full">
                {t("dashboard.previewParticipate")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

/** Form field wrapper with a label and child input. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
