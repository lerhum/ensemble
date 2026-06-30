import * as React from "react";
import { Upload, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

/** Admin settings page for site title, logo, and GDPR contact email. */
export default function AdminSettingsPage() {
  const { siteTitle, siteLogo, rgpdEmail, refresh } = useAuth();
  const [title, setTitle] = React.useState(siteTitle);
  const [logo, setLogo] = React.useState<string | null>(siteLogo);
  const [rgpd, setRgpd] = React.useState(rgpdEmail);
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // Sync si les valeurs globales changent (ex. après install)
  React.useEffect(() => { setTitle(siteTitle); }, [siteTitle]);
  React.useEffect(() => { setLogo(siteLogo); }, [siteLogo]);
  React.useEffect(() => { setRgpd(rgpdEmail); }, [rgpdEmail]);

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

  return (
    <AdminLayout title="Paramètres">
      <div className="max-w-lg space-y-8">
        <section>
          <p className="mb-4 text-[11px] font-800 uppercase tracking-[.1em] text-label2">
            Site public
          </p>
          <div className="space-y-6">
            <div className="space-y-1.5">
              <Label htmlFor="siteTitle">Nom du site</Label>
              <Input
                id="siteTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveTitle}
                placeholder="Comité scolaire"
              />
              <p className="text-[12px] text-label">
                Affiché dans la navigation publique à la place du logo Ensemble.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rgpdEmail">Email de contact RGPD</Label>
              <Input
                id="rgpdEmail"
                type="email"
                value={rgpd}
                onChange={(e) => setRgpd(e.target.value)}
                onBlur={saveRgpd}
                placeholder="dpo@ecole.be"
              />
              <p className="text-[12px] text-label">
                Affiché aux bénévoles lors de l'inscription pour exercer leurs droits (accès, suppression, rectification).
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Logo de l'école</Label>
              <div className="overflow-hidden rounded-[14px] border border-hair bg-surface">
                {logo ? (
                  <div className="flex h-24 items-center justify-center p-4">
                    <img src={logo} alt="Logo" className="h-full w-auto object-contain" />
                  </div>
                ) : (
                  <div className="flex h-24 items-center justify-center text-sm text-label2">
                    Aucun logo
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
                  {logo ? "Remplacer" : "Choisir un logo"}
                </Button>
                {logo && (
                  <Button variant="outline" size="sm" onClick={removeLogo}>
                    <X className="h-4 w-4" />
                    Supprimer
                  </Button>
                )}
              </div>
              <p className="text-[12px] text-label">
                Affiché à la place du nom dans la navigation publique si défini.
              </p>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
