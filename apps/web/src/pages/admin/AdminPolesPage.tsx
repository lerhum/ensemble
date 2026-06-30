import * as React from "react";
import { ChevronDown, GripVertical, Plus, X } from "lucide-react";
import type { EventDetailDTO, PoleDTO, TacheDTO } from "@ensemble/db/shared";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useAdminEvent } from "@/lib/useEvent";
import { cn, initials } from "@/lib/utils";
import { useDnd, move } from "@/lib/useDnd";
import { AdminLayout, StatCard } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Jauge } from "@/components/primitives/Jauge";
import { BadgeStatut } from "@/components/primitives/BadgeStatut";
import { statusMeta } from "@/components/primitives/status";

/** Admin poles and slots editor: create/edit/reorder poles, tasks, and slots with drag-and-drop. */
export default function AdminPolesPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { event, loading, reload } = useAdminEvent(id);
  if (loading || !event) {
    return (
      <AdminLayout eyebrow="Configuration" title="Pôles & créneaux">
        <p className="text-label">Chargement…</p>
      </AdminLayout>
    );
  }
  return <PolesInner event={event} reload={reload} />;
}

/** Inner component for the poles editor, rendered once event data is loaded. */
function PolesInner({ event, reload }: { event: EventDetailDTO; reload: () => Promise<void> }) {
  const c = event.counters;
  const [open, setOpen] = React.useState<string | null>(event.poles[0]?.id ?? null);

  const addPole = async () => {
    const pole = await api.createPole({ eventId: event.id, nom: "Nouveau pôle", description: "" }) as { id: string };
    await reload();
    setOpen(pole.id);
  };

  const reorderPoles = async (from: number, to: number) => {
    const ids = move(event.poles, from, to).map((p) => p.id);
    await api.reorderPoles(ids);
    await reload();
  };
  const dnd = useDnd(reorderPoles);

  return (
    <AdminLayout
      eyebrow={`${event.nom} · Configuration`}
      title="Pôles & créneaux"
      actions={
        <Button variant="default" onClick={addPole}>
          <Plus className="h-4 w-4" /> Ajouter un pôle
        </Button>
      }
    >
      {/* Stats */}
      <div className="mb-7 flex flex-wrap gap-x-12 gap-y-4 rounded-card border border-hair bg-white px-6 py-5">
        <StatCard value={<><span>{c.inscrits}</span><span className="text-label"> / {c.necessaires}</span></>} label="Bénévoles inscrits" />
        <StatCard value={c.nbPoles} label="Pôles" />
        <StatCard value={c.nbCreneaux} label="Créneaux" />
        <StatCard value={c.aCompleter} label="À compléter" accent="coral" />
      </div>

      <div className="space-y-4">
        {event.poles.map((pole, i) => (
          <div key={pole.id} {...dnd(i)}>
            <PoleCard
              pole={pole}
              expanded={open === pole.id}
              onToggle={() => setOpen(open === pole.id ? null : pole.id)}
              reload={reload}
            />
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}

/** Expandable card for a pole: inline name/description editing, task list, drag-to-reorder, and delete. */
function PoleCard({
  pole,
  expanded,
  onToggle,
  reload,
}: {
  pole: PoleDTO;
  expanded: boolean;
  onToggle: () => void;
  reload: () => Promise<void>;
}) {
  const [nom, setNom] = React.useState(pole.nom);
  const [description, setDescription] = React.useState(pole.description);
  const meta = statusMeta(pole.inscrits, pole.necessaires);
  const poleLabel =
    pole.placesLibres === 0
      ? "Complet"
      : meta.status === "urgent"
        ? "À compléter"
        : `${pole.placesLibres} place${pole.placesLibres > 1 ? "s" : ""} à pourvoir`;

  const saveNom = async () => {
    if (nom.trim() && nom !== pole.nom) await api.updatePole(pole.id, { nom: nom.trim() });
  };
  const saveDescription = async () => {
    if (description !== pole.description) await api.updatePole(pole.id, { description });
  };
  const addTache = async () => {
    await api.createTache({ poleId: pole.id, nom: "Nouvelle tâche", description: "" });
    await reload();
  };
  const deletePole = async () => {
    if (confirm(`Supprimer le pôle « ${pole.nom} » ?`)) {
      await api.deletePole(pole.id);
      await reload();
    }
  };

  const reorderTaches = async (from: number, to: number) => {
    await api.reorderTaches(move(pole.taches, from, to).map((t) => t.id));
    await reload();
  };
  const dnd = useDnd(reorderTaches);

  return (
    <div className="overflow-hidden rounded-card border border-hair bg-white">
      {/* En-tête de pôle */}
      <div className="flex items-center gap-3 px-5 py-4">
        <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-label2" />
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-chip text-[12px] font-800 text-navy">
          {initials(nom)}
        </span>
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            onBlur={saveNom}
            onClick={(e) => e.stopPropagation()}
            className="min-w-0 flex-1 rounded-[8px] bg-transparent px-1 py-0.5 font-800 text-ink outline-none focus:bg-surface"
          />
          <span className="shrink-0 text-sm text-label">
            {pole.inscrits} / {pole.necessaires} inscrits
          </span>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-xs font-700"
          style={{ background: meta.bg, color: meta.fg }}
        >
          {poleLabel}
        </span>
        <button onClick={onToggle} aria-label="Déplier">
          <ChevronDown className={cn("h-5 w-5 text-label transition-transform", expanded && "rotate-180")} />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-hair px-5 pb-5">
          {/* Description du pôle */}
          <div className="py-3 border-b border-[#F1F3F5]">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={saveDescription}
              placeholder="Description du pôle (optionnelle)…"
              className="w-full rounded-[8px] bg-transparent px-1 py-0.5 text-sm text-ink2 outline-none placeholder:text-label2 focus:bg-surface"
            />
          </div>

          {/* En-têtes de colonnes */}
          <div className="grid grid-cols-[1fr_110px_110px_120px_140px_90px_28px] items-center gap-3 px-2 pb-2 pt-4 text-[11px] font-800 uppercase tracking-[.08em] text-label">
            <span>Tâche</span>
            <span>Début</span>
            <span>Fin</span>
            <span>Nécessaires</span>
            <span>Inscrits</span>
            <span>Statut</span>
            <span />
          </div>

          {pole.taches.map((tache, i) => (
            <div key={tache.id} {...dnd(i)}>
              <TacheGroup tache={tache} reload={reload} />
            </div>
          ))}

          <div className="mt-3 flex items-center justify-between">
            <button onClick={addTache} className="text-sm font-700 text-brand hover:underline">
              + Ajouter une tâche
            </button>
            <button onClick={deletePole} className="text-sm font-600 text-label hover:text-danger">
              Supprimer le pôle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Task group within a pole: inline name editing, slot rows, add slot button, and drag-to-reorder slots. */
function TacheGroup({ tache, reload }: { tache: TacheDTO; reload: () => Promise<void> }) {
  const [nom, setNom] = React.useState(tache.nom);

  const saveNom = async () => {
    if (nom.trim() && nom !== tache.nom) await api.updateTache(tache.id, { nom });
  };
  const addCreneau = async () => {
    const last = tache.creneaux.at(-1);
    let debut = "08:00";
    let fin = "09:00";
    if (last) {
      debut = last.fin;
      const [h, m] = last.fin.split(":").map(Number);
      fin = `${String(Math.min((h ?? 0) + 1, 23)).padStart(2, "0")}:${String(m ?? 0).padStart(2, "0")}`;
    }
    await api.createCreneau({ tacheId: tache.id, debut, fin, necessaires: 1 });
    await reload();
  };
  const reorderCreneaux = async (from: number, to: number) => {
    await api.reorderCreneaux(move(tache.creneaux, from, to).map((cr) => cr.id));
    await reload();
  };
  const dnd = useDnd(reorderCreneaux);

  return (
    <div className="border-t border-[#F1F3F5] py-3 first:border-t-0">
      <div className="mb-1 flex items-center gap-2 px-2">
        <GripVertical className="h-4 w-4 text-label2" />
        <input
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          onBlur={saveNom}
          className="rounded-[8px] bg-transparent px-1 py-0.5 font-700 text-ink outline-none focus:bg-surface"
        />
        <span className="rounded-full bg-chip px-2 py-0.5 text-[11px] font-700 text-navy">
          {tache.creneaux.length} créneau{tache.creneaux.length > 1 ? "x" : ""}
        </span>
        <button onClick={addCreneau} className="ml-auto text-sm font-700 text-brand hover:underline">
          + créneau
        </button>
      </div>
      {tache.creneaux.map((cr, i) => (
        <div key={cr.id} {...dnd(i)}>
          <CreneauRow creneau={cr} reload={reload} />
        </div>
      ))}
    </div>
  );
}

/** Slot row within a task: inline editing of start/end time and capacity, with a delete button. */
function CreneauRow({
  creneau,
  reload,
}: {
  creneau: TacheDTO["creneaux"][number];
  reload: () => Promise<void>;
}) {
  const [debut, setDebut] = React.useState(creneau.debut);
  const [fin, setFin] = React.useState(creneau.fin);
  const [nec, setNec] = React.useState(creneau.necessaires);

  const patch = async (body: { debut?: string; fin?: string; necessaires?: number }) => {
    await api.updateCreneau(creneau.id, body);
    await reload();
  };
  const del = async () => {
    await api.deleteCreneau(creneau.id);
    await reload();
  };

  return (
    <div className="grid grid-cols-[1fr_110px_110px_120px_140px_90px_28px] items-center gap-3 px-2 py-1.5">
      <span className="flex items-center gap-2 text-label2">
        <GripVertical className="h-4 w-4 cursor-grab" />
      </span>
      <Input
        value={debut}
        onChange={(e) => setDebut(e.target.value)}
        onBlur={() => debut !== creneau.debut && patch({ debut })}
        placeholder="13:00"
        inputMode="numeric"
        pattern="[0-2][0-9]:[0-5][0-9]"
        className="h-9"
      />
      <Input
        value={fin}
        onChange={(e) => setFin(e.target.value)}
        onBlur={() => fin !== creneau.fin && patch({ fin })}
        placeholder="14:00"
        inputMode="numeric"
        pattern="[0-2][0-9]:[0-5][0-9]"
        className="h-9"
      />
      <Input
        type="number"
        min={1}
        value={nec}
        onChange={(e) => setNec(Number(e.target.value))}
        onBlur={() => nec !== creneau.necessaires && patch({ necessaires: nec })}
        className="h-9 w-20"
      />
      <div className="flex items-center gap-2">
        <Jauge inscrits={creneau.inscrits} necessaires={creneau.necessaires} showValue={false} className="w-16" />
        <span className="text-sm font-600 text-ink">
          {creneau.inscrits}/{creneau.necessaires}
        </span>
      </div>
      <BadgeStatut inscrits={creneau.inscrits} necessaires={creneau.necessaires} />
      <button onClick={del} aria-label="Supprimer le créneau" className="text-label2 hover:text-danger">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
