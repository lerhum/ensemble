import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Plus, Archive, Pencil } from "lucide-react";
import type { EventDTO } from "@ensemble/db/shared";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  brouillon: "Brouillon",
  publie: "Publié",
  archive: "Archivé",
};

const STATUS_CLASS: Record<string, string> = {
  brouillon: "bg-chip text-ink2",
  publie: "bg-[#EAF4EF] text-[#2F7E59]",
  archive: "bg-surface text-label",
};

function formatDate(dateIso: string | null, dateTxt: string): string {
  if (dateIso) {
    return new Intl.DateTimeFormat("fr-BE", { dateStyle: "full" }).format(new Date(dateIso + "T12:00:00"));
  }
  return dateTxt || "—";
}

export default function AdminEventsListPage() {
  const navigate = useNavigate();
  const [events, setEvents] = React.useState<EventDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [showDialog, setShowDialog] = React.useState(false);
  const [nom, setNom] = React.useState("");
  const [dateIso, setDateIso] = React.useState("");

  React.useEffect(() => {
    api.listAdminEvents().then(setEvents).finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!nom.trim()) return;
    setCreating(true);
    try {
      const ev = await api.createEvent({
        nom: nom.trim(),
        dateIso: dateIso || null,
        date: dateIso
          ? new Intl.DateTimeFormat("fr-BE", { dateStyle: "full" }).format(new Date(dateIso + "T12:00:00"))
          : "",
      });
      navigate(`/admin/events/${ev.id}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    const ev = await api.duplicateEvent(id);
    navigate(`/admin/events/${ev.id}`);
  };

  const handleArchive = async (id: string) => {
    await api.updateEvent(id, { statut: "archive" });
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, statut: "archive" } : e)));
  };

  const sorted = [
    ...events.filter((e) => e.statut === "publie"),
    ...events.filter((e) => e.statut === "brouillon"),
    ...events.filter((e) => e.statut === "archive"),
  ];

  return (
    <AdminLayout eyebrow="Pilotage" title="Événements">
      <div className="flex items-center justify-between mb-6">
        <p className="text-[13px] text-label">
          {loading ? "Chargement…" : `${events.length} événement${events.length !== 1 ? "s" : ""}`}
        </p>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4" />
          Créer un événement
        </Button>
      </div>

      {!loading && sorted.length === 0 && (
        <div className="rounded-card border border-dashed border-hair py-16 text-center">
          <p className="text-[15px] font-700 text-ink">Aucun événement</p>
          <p className="mt-1 text-[13px] text-label">Créez votre premier événement pour commencer.</p>
          <Button className="mt-5" onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4" />
            Créer un événement
          </Button>
        </div>
      )}

      {sorted.length > 0 && (
        <div className="space-y-3">
          {sorted.map((ev) => (
            <div
              key={ev.id}
              className={cn(
                "flex items-center justify-between rounded-card border border-hair bg-white px-5 py-4",
                ev.statut === "archive" && "opacity-60",
              )}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="text-[15px] font-700 text-ink truncate">{ev.nom}</span>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-700", STATUS_CLASS[ev.statut])}>
                    {STATUS_LABEL[ev.statut]}
                  </span>
                </div>
                <p className="mt-0.5 text-[13px] text-label">
                  {formatDate(ev.dateIso, ev.date)}
                  {ev.lieu && ` · ${ev.lieu}`}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDuplicate(ev.id)}
                  title="Dupliquer"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                {ev.statut !== "archive" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleArchive(ev.id)}
                    title="Archiver"
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button size="sm" onClick={() => navigate(`/admin/events/${ev.id}`)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Modifier
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un événement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="create-nom">Nom de l'événement *</Label>
              <Input
                id="create-nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex : Fête de l'école 2027"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-date">Date</Label>
              <Input
                id="create-date"
                type="date"
                value={dateIso}
                onChange={(e) => setDateIso(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={!nom.trim() || creating}>
              {creating ? "Création…" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
