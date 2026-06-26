import * as React from "react";
import { Check, Upload } from "lucide-react";
import type { EventDetailDTO } from "@ensemble/db/shared";
import { api } from "@/lib/api";
import { useEvent, DEMO_SLUG } from "@/lib/useEvent";
import { applyAccent } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const SWATCHES = ["#1C3A5E", "#DA4A40", "#2F7E59", "#E8A13A", "#7A5CC0"];

export default function AdminDashboardPage() {
  const { event, loading, reload } = useEvent(DEMO_SLUG);
  if (loading || !event) {
    return (
      <AdminLayout eyebrow="Événements · Édition" title="Créer un événement">
        <p className="text-label">Chargement…</p>
      </AdminLayout>
    );
  }
  return <DashboardInner event={event} reload={reload} />;
}

function DashboardInner({ event, reload }: { event: EventDetailDTO; reload: () => Promise<void> }) {
  const [form, setForm] = React.useState({
    nom: event.nom,
    date: event.date,
    horaires: event.horaires,
    lieu: event.lieu,
    histoire: event.histoire,
    couleurTheme: event.couleurTheme,
  });
  const [banniere, setBanniere] = React.useState(event.banniere);
  const [statut, setStatut] = React.useState(event.statut);
  const [saving, setSaving] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    applyAccent(form.couleurTheme);
  }, [form.couleurTheme]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

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
      eyebrow="Événements · Nouveau"
      title="Créer un événement"
      actions={
        <>
          <Button variant="outline" onClick={() => publish("brouillon")} disabled={saving}>
            Brouillon
          </Button>
          <Button variant="default" onClick={() => publish("publie")} disabled={saving}>
            {statut === "publie" ? "Mettre à jour" : "Publier l'événement"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        {/* Informations */}
        <div>
          <p className="mb-4 text-[11px] font-800 uppercase tracking-[.1em] text-label2">
            Informations
          </p>
          <div className="space-y-5">
            <Field label="Nom de l'événement">
              <Input value={form.nom} onChange={set("nom")} onBlur={() => persist({ nom: form.nom })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date">
                <Input value={form.date} onChange={set("date")} onBlur={() => persist({ date: form.date })} />
              </Field>
              <Field label="Horaires">
                <Input value={form.horaires} onChange={set("horaires")} onBlur={() => persist({ horaires: form.horaires })} />
              </Field>
            </div>
            <Field label="Lieu">
              <Input value={form.lieu} onChange={set("lieu")} onBlur={() => persist({ lieu: form.lieu })} />
            </Field>
            <Field label="L'histoire de la fête">
              <Textarea
                value={form.histoire}
                onChange={set("histoire")}
                onBlur={() => persist({ histoire: form.histoire })}
                maxLength={600}
                rows={5}
              />
              <div className="mt-1 text-right text-[12px] text-label">
                {form.histoire.length} / 600 caractères
              </div>
            </Field>
          </div>
        </div>

        {/* Personnalisation */}
        <div>
          <p className="mb-4 text-[11px] font-800 uppercase tracking-[.1em] text-label2">
            Personnalisation
          </p>

          <Label className="mb-1.5 block">Bannière</Label>
          <div className="overflow-hidden rounded-[14px] border border-hair bg-surface">
            {banniere ? (
              <img src={banniere} alt="Bannière" className="h-36 w-full object-cover" />
            ) : (
              <div className="flex h-36 items-center justify-center text-sm text-label2">
                Aucune bannière
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onUpload} />
          <Button variant="outline" size="sm" className="mt-2" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" /> Remplacer
          </Button>

          <Label className="mb-1.5 mt-6 block">Couleur du thème</Label>
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
                aria-label={`Couleur ${color}`}
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
            Aperçu page publique
          </p>
          <div className="overflow-hidden rounded-card border border-hair bg-white shadow-soft">
            {banniere ? (
              <img src={banniere} alt="" className="h-28 w-full object-cover" />
            ) : (
              <div className="h-28 w-full bg-chip" />
            )}
            <div className="p-4">
              <p className="text-[11px] font-800 uppercase tracking-[.1em] text-label2">
                Fête de l'école
              </p>
              <h3 className="mt-1 text-lg font-800 leading-tight tracking-tighter2 text-ink">
                {form.nom}
              </h3>
              <p className="mt-0.5 text-[13px] text-label">
                {form.date} · {form.horaires}
              </p>
              <Button variant="brand" size="sm" className="mt-3 w-full">
                Je participe
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
