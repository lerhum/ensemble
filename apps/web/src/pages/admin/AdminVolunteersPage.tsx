import * as React from "react";
import { Download, Mail, Plus, Search, Trash2, X } from "lucide-react";
import type { EventDetailDTO, VolunteerDTO, VolunteerFilter } from "@ensemble/db/shared";
import { useParams } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useAdminEvent } from "@/lib/useEvent";
import { initials } from "@/lib/utils";
import { AdminLayout, StatCard } from "@/components/admin/AdminLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const ALL = "all";

/** Admin volunteer management page: filterable list with CSV export and delete action. */
export default function AdminVolunteersPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { event, loading } = useAdminEvent(id);
  if (loading || !event) {
    return (
      <AdminLayout eyebrow="Bénévoles" title="Bénévoles">
        <p className="text-label">Chargement…</p>
      </AdminLayout>
    );
  }
  return <VolunteersInner event={event} />;
}

/** Inner component for the volunteer list, rendered once event data is loaded. Manages filters, table, and CSV export. */
function VolunteersInner({ event }: { event: EventDetailDTO }) {
  const [all, setAll] = React.useState<VolunteerDTO[]>([]);
  const [rows, setRows] = React.useState<VolunteerDTO[]>([]);
  const [filter, setFilter] = React.useState<VolunteerFilter>({});
  const [q, setQ] = React.useState("");
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [confirmId, setConfirmId] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [showBroadcast, setShowBroadcast] = React.useState(false);
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [lastSent, setLastSent] = React.useState<number | null>(null);

  const [showAddVolunteer, setShowAddVolunteer] = React.useState(false);
  const [addCreneauId, setAddCreneauId] = React.useState("");
  const [addNom, setAddNom] = React.useState("");
  const [addEmail, setAddEmail] = React.useState("");
  const [addTel, setAddTel] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [addError, setAddError] = React.useState<string | null>(null);

  const creneauOptions = React.useMemo(
    () =>
      event.poles.flatMap((p) =>
        p.taches.flatMap((t) =>
          t.creneaux.map((cr) => ({
            id: cr.id,
            label: `${t.nom} · ${cr.debut.replace(":", "h")}–${cr.fin.replace(":", "h")}`,
          })),
        ),
      ),
    [event],
  );

  const tacheOptions = React.useMemo(
    () => event.poles.flatMap((p) => p.taches.map((t) => ({ id: t.id, label: t.nom }))),
    [event],
  );

  // Une sélection ne survit pas à un changement de filtre ou d'événement (ids potentiellement obsolètes).
  React.useEffect(() => {
    setSelected(new Set());
  }, [event.id, filter]);

  // Liste non filtrée → statistiques.
  React.useEffect(() => {
    api.getVolunteers(event.id).then((r) => setAll(r.volunteers));
  }, [event.id]);

  // Recherche debouncée.
  React.useEffect(() => {
    const t = setTimeout(() => setFilter((f) => ({ ...f, q: q || undefined })), 250);
    return () => clearTimeout(t);
  }, [q]);

  // Liste filtrée (côté serveur) → table.
  React.useEffect(() => {
    api.getVolunteers(event.id, filter).then((r) => setRows(r.volunteers));
  }, [event.id, filter]);

  const stats = React.useMemo(
    () => ({
      total: all.length,
      confirmes: all.filter((v) => v.statut === "confirme").length,
      attente: all.filter((v) => v.statut === "attente").length,
      inscriptions: all.reduce((n, v) => n + v.creneaux.length, 0),
    }),
    [all],
  );

  const poleName = (id?: string) => event.poles.find((p) => p.id === id)?.nom;
  const tacheName = (id?: string) => tacheOptions.find((t) => t.id === id)?.label;
  const creneauName = (id?: string) => creneauOptions.find((c) => c.id === id)?.label;

  async function deleteVolunteer(id: string) {
    setDeletingId(id);
    try {
      await api.deleteVolunteer(id);
      const refresh = () => api.getVolunteers(event.id, filter).then((r) => setRows(r.volunteers));
      const refreshAll = () => api.getVolunteers(event.id).then((r) => setAll(r.volunteers));
      await Promise.all([refresh(), refreshAll()]);
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  }

  function resetAddForm() {
    setAddCreneauId("");
    setAddNom("");
    setAddEmail("");
    setAddTel("");
    setAddError(null);
  }

  async function addVolunteer() {
    setAdding(true);
    setAddError(null);
    try {
      await api.addVolunteerToCreneau(addCreneauId, {
        nom: addNom.trim(),
        email: addEmail.trim() || undefined,
        tel: addTel.trim() || undefined,
      });
      const refresh = () => api.getVolunteers(event.id, filter).then((r) => setRows(r.volunteers));
      const refreshAll = () => api.getVolunteers(event.id).then((r) => setAll(r.volunteers));
      await Promise.all([refresh(), refreshAll()]);
      setShowAddVolunteer(false);
      resetAddForm();
    } catch (e) {
      setAddError(e instanceof ApiError ? e.message : "Erreur lors de l'ajout.");
    } finally {
      setAdding(false);
    }
  }

  const chips = [
    filter.pole && { key: "pole", label: `Pôle : ${poleName(filter.pole)}` },
    filter.tache && { key: "tache", label: `Tâche : ${tacheName(filter.tache)}` },
    filter.creneau && { key: "creneau", label: `Créneau : ${creneauName(filter.creneau)}` },
    filter.statut && {
      key: "statut",
      label: `Statut : ${filter.statut === "confirme" ? "Confirmé" : "En attente"}`,
    },
    filter.q && { key: "q", label: `« ${filter.q} »` },
  ].filter(Boolean) as { key: string; label: string }[];

  const clearChip = (key: string) => {
    if (key === "q") setQ("");
    setFilter((f) => ({ ...f, [key]: undefined }));
  };
  const reset = () => {
    setQ("");
    setFilter({});
  };

  const setSel = (key: keyof VolunteerFilter) => (v: string) =>
    setFilter((f) => ({ ...f, [key]: v === ALL ? undefined : v }));

  const toggleAll = (checked: boolean) =>
    setSelected(checked ? new Set(rows.map((v) => v.id)) : new Set());
  const toggleOne = (id: string, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const recipientCount = selected.size > 0 ? selected.size : rows.length;

  async function handleBroadcast() {
    setSending(true);
    try {
      const { sent } = await api.broadcastVolunteers(event.id, {
        subject,
        message,
        ...(selected.size > 0 ? { volunteerIds: [...selected] } : { filter }),
      });
      setLastSent(sent);
      setShowBroadcast(false);
      setSubject("");
      setMessage("");
    } finally {
      setSending(false);
    }
  }

  return (
    <AdminLayout
      eyebrow={event.nom}
      title="Bénévoles"
      actions={
        <>
          <Button variant="outline" onClick={() => setShowBroadcast(true)}>
            <Mail className="h-4 w-4" /> Envoyer un message
          </Button>
          <Button variant="outline" asChild>
            <a href={api.volunteersCsvUrl(event.id, filter)}>
              <Download className="h-4 w-4" /> Exporter CSV
            </a>
          </Button>
          <Button variant="default" onClick={() => setShowAddVolunteer(true)}>
            <Plus className="h-4 w-4" /> Inviter
          </Button>
        </>
      }
    >
      {/* Stats */}
      <div className="mb-7 flex flex-wrap gap-x-12 gap-y-4 rounded-card border border-hair bg-white px-6 py-5">
        <StatCard value={stats.total} label="Bénévoles" />
        <StatCard value={stats.confirmes} label="Confirmés" accent="green" />
        <StatCard value={stats.attente} label="En attente" accent="amber" />
        <StatCard value={stats.inscriptions} label="Inscriptions créneaux" />
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-label2" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un parent…"
            className="pl-9"
          />
        </div>
        <Select value={filter.pole ?? ALL} onValueChange={setSel("pole")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Pôle : Tous" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Pôle : Tous</SelectItem>
            {event.poles.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filter.tache ?? ALL} onValueChange={setSel("tache")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tâche : Toutes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tâche : Toutes</SelectItem>
            {tacheOptions.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filter.creneau ?? ALL} onValueChange={setSel("creneau")}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Créneau : Tous" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Créneau : Tous</SelectItem>
            {creneauOptions.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filter.statut ?? ALL} onValueChange={setSel("statut")}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Statut : Tous" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Statut : Tous</SelectItem>
            <SelectItem value="confirme">Confirmé</SelectItem>
            <SelectItem value="attente">En attente</SelectItem>
          </SelectContent>
        </Select>
        {chips.length > 0 && (
          <button onClick={reset} className="text-sm font-700 text-coral hover:underline">
            Réinitialiser
          </button>
        )}
      </div>

      {/* Chips actifs */}
      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <span
              key={c.key}
              className="inline-flex items-center gap-1.5 rounded-full bg-chip px-3 py-1 text-[13px] font-600 text-navy"
            >
              {c.label}
              <button onClick={() => clearChip(c.key)} aria-label="Retirer le filtre">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          <span className="text-[13px] text-label">
            {rows.length} bénévole{rows.length > 1 ? "s" : ""} sur {stats.total}
          </span>
        </div>
      )}

      {lastSent !== null && (
        <p className="mt-3 text-[13px] font-600 text-[#2F7E59]">
          Message envoyé à {lastSent} bénévole{lastSent > 1 ? "s" : ""}.
        </p>
      )}

      {/* Table */}
      <div className="mt-5 overflow-hidden rounded-card border border-hair bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface hover:bg-surface">
              <TableHead className="w-10">
                <Checkbox
                  aria-label="Tout sélectionner"
                  checked={rows.length > 0 && selected.size === rows.length}
                  onCheckedChange={(checked) => toggleAll(checked === true)}
                />
              </TableHead>
              <TableHead>Bénévole</TableHead>
              <TableHead>Pôle</TableHead>
              <TableHead>Créneaux</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-label">
                  Aucun bénévole ne correspond aux filtres.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((v) => (
                <TableRow key={v.id} className={v.statut === "attente" ? "bg-surface2" : ""}>
                  <TableCell>
                    <Checkbox
                      aria-label={`Sélectionner ${v.nom}`}
                      checked={selected.has(v.id)}
                      onCheckedChange={(checked) => toggleOne(v.id, checked === true)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{initials(v.nom)}</AvatarFallback>
                      </Avatar>
                      <div className="leading-tight">
                        <div className="font-700 text-ink">{v.nom}</div>
                        <div className="text-[13px] text-label">{v.email || "—"}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-ink2">
                    {v.poles.map((p) => p.nom).join(", ") || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="default">
                      {v.creneaux.length} créneau{v.creneaux.length > 1 ? "x" : ""}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-ink2">{v.tel || "—"}</TableCell>
                  <TableCell>
                    {v.statut === "confirme" ? (
                      <Badge variant="success">Confirmé</Badge>
                    ) : (
                      <Badge variant="warn">En attente</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {confirmId === v.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          className="rounded px-2 py-0.5 text-[12px] font-700 text-danger hover:bg-danger/5 disabled:opacity-50"
                          disabled={deletingId === v.id}
                          onClick={() => deleteVolunteer(v.id)}
                        >
                          {deletingId === v.id ? "…" : "Confirmer"}
                        </button>
                        <button
                          className="text-[12px] text-label hover:text-ink"
                          onClick={() => setConfirmId(null)}
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        className="rounded p-1 text-label2 hover:text-danger"
                        aria-label="Supprimer ce bénévole"
                        onClick={() => setConfirmId(v.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showBroadcast} onOpenChange={setShowBroadcast}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Envoyer un message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-[13px] text-label">
              {selected.size > 0
                ? `${recipientCount} bénévole${recipientCount > 1 ? "s" : ""} sélectionné${recipientCount > 1 ? "s" : ""}`
                : `${recipientCount} bénévole${recipientCount > 1 ? "s" : ""} filtré${recipientCount > 1 ? "s" : ""}`}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="broadcast-subject">Sujet *</Label>
              <Input
                id="broadcast-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex : Rappel pour ton créneau"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="broadcast-message">Message *</Label>
              <Textarea
                id="broadcast-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ton message…"
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBroadcast(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleBroadcast}
              disabled={!subject.trim() || !message.trim() || sending || recipientCount === 0}
            >
              {sending ? "Envoi…" : "Envoyer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showAddVolunteer}
        onOpenChange={(open) => {
          setShowAddVolunteer(open);
          if (!open) resetAddForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un bénévole</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-[13px] text-label">
              Un simple prénom suffit — l'email et le téléphone sont facultatifs.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="add-creneau">Créneau *</Label>
              <Select value={addCreneauId} onValueChange={setAddCreneauId}>
                <SelectTrigger id="add-creneau">
                  <SelectValue placeholder="Choisir un créneau" />
                </SelectTrigger>
                <SelectContent>
                  {creneauOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-nom">Prénom ou nom complet *</Label>
              <Input
                id="add-nom"
                value={addNom}
                onChange={(e) => setAddNom(e.target.value)}
                placeholder="Ex : Julie ou Julie Dupont"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-email">Email (optionnel)</Label>
              <Input
                id="add-email"
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="julie@exemple.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-tel">Téléphone (optionnel)</Label>
              <Input
                id="add-tel"
                value={addTel}
                onChange={(e) => setAddTel(e.target.value)}
                placeholder="04 12 34 56 78"
              />
            </div>
            {addError && <p className="text-[13px] font-600 text-danger">{addError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddVolunteer(false)}>
              Annuler
            </Button>
            <Button onClick={addVolunteer} disabled={!addCreneauId || !addNom.trim() || adding}>
              {adding ? "Ajout…" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
