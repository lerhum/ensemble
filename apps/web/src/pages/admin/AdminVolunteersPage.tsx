import * as React from "react";
import { Download, Plus, Search, X } from "lucide-react";
import type { EventDetailDTO, VolunteerDTO, VolunteerFilter } from "@ensemble/db/shared";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useAdminEvent } from "@/lib/useEvent";
import { initials } from "@/lib/utils";
import { AdminLayout, StatCard } from "@/components/admin/AdminLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ALL = "all";

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

function VolunteersInner({ event }: { event: EventDetailDTO }) {
  const [all, setAll] = React.useState<VolunteerDTO[]>([]);
  const [rows, setRows] = React.useState<VolunteerDTO[]>([]);
  const [filter, setFilter] = React.useState<VolunteerFilter>({});
  const [q, setQ] = React.useState("");

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
  const creneauName = (id?: string) => creneauOptions.find((c) => c.id === id)?.label;

  const chips = [
    filter.pole && { key: "pole", label: `Pôle : ${poleName(filter.pole)}` },
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

  return (
    <AdminLayout
      eyebrow="Vinalmont Got's Talent"
      title="Bénévoles"
      actions={
        <>
          <Button variant="outline" asChild>
            <a href={api.volunteersCsvUrl(event.id, filter)}>
              <Download className="h-4 w-4" /> Exporter CSV
            </a>
          </Button>
          <Button variant="default">
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

      {/* Table */}
      <div className="mt-5 overflow-hidden rounded-card border border-hair bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface hover:bg-surface">
              <TableHead className="w-10">
                <Checkbox aria-label="Tout sélectionner" />
              </TableHead>
              <TableHead>Bénévole</TableHead>
              <TableHead>Pôle</TableHead>
              <TableHead>Créneaux</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-label">
                  Aucun bénévole ne correspond aux filtres.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((v) => (
                <TableRow key={v.id} className={v.statut === "attente" ? "bg-surface2" : ""}>
                  <TableCell>
                    <Checkbox aria-label={`Sélectionner ${v.nom}`} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{initials(v.nom)}</AvatarFallback>
                      </Avatar>
                      <div className="leading-tight">
                        <div className="font-700 text-ink">{v.nom}</div>
                        <div className="text-[13px] text-label">{v.email}</div>
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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
