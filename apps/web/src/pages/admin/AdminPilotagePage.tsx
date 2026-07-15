import * as React from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { EventDetailDTO, VolunteerDTO } from "@ensemble/db/shared";
import { STATUS_COLORS, slotStatus } from "@ensemble/db/shared";
import { api } from "@/lib/api";
import { useAdminEvent } from "@/lib/useEvent";
import { AdminLayout, StatCard } from "@/components/admin/AdminLayout";
import { Jauge } from "@/components/primitives/Jauge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/lib/utils";

/** Admin pilotage dashboard: coverage by pole/task/slot and pending volunteers with contact info. */
export default function AdminPilotagePage() {
  const { id = "" } = useParams<{ id: string }>();
  const { event, loading, reload } = useAdminEvent(id);
  const { t } = useTranslation("admin");

  if (loading || !event) {
    return (
      <AdminLayout eyebrow={t("shared.pilotage")} title={t("layout.dashboard")}>
        <p className="text-label">{t("shared.loading")}</p>
      </AdminLayout>
    );
  }

  return <PilotageInner event={event} reload={reload} />;
}

function PilotageInner({ event, reload }: { event: EventDetailDTO; reload: () => Promise<void> }) {
  const { t } = useTranslation("admin");
  const [attente, setAttente] = React.useState<VolunteerDTO[]>([]);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchAttente = React.useCallback(async () => {
    const r = await api.getVolunteers(event.id, { statut: "attente" });
    setAttente(r.volunteers);
  }, [event.id]);

  React.useEffect(() => {
    fetchAttente();
  }, [fetchAttente]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([reload(), fetchAttente()]);
    } finally {
      setRefreshing(false);
    }
  };

  // Compteurs dérivés
  const c = event.counters;
  const completsCount = event.poles.flatMap((p) =>
    p.taches.flatMap((t) =>
      t.creneaux.filter((cr) => slotStatus(cr.inscrits, cr.necessaires) === "complet"),
    ),
  ).length;
  const urgentsCount = event.poles.flatMap((p) =>
    p.taches.flatMap((t) =>
      t.creneaux.filter((cr) => slotStatus(cr.inscrits, cr.necessaires) === "urgent"),
    ),
  ).length;
  const pct = c.necessaires ? Math.round((c.inscrits / c.necessaires) * 100) : 0;

  return (
    <AdminLayout
      eyebrow={event.nom}
      title={t("layout.dashboard")}
      actions={
        <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {t("pilotage.refresh")}
        </Button>
      }
    >
      {/* Stats */}
      <div className="mb-7 flex flex-wrap gap-x-12 gap-y-4 rounded-card border border-hair bg-white px-6 py-5">
        <StatCard
          value={
            <>
              <span>{c.inscrits}</span>
              <span className="text-label"> / {c.necessaires}</span>
            </>
          }
          label={t("pilotage.statVolunteers")}
        />
        <StatCard
          value={`${pct} %`}
          label={t("pilotage.statCoverage")}
          accent={pct >= 100 ? "green" : pct >= 60 ? "default" : "coral"}
        />
        <StatCard value={completsCount} label={t("pilotage.statSlotsComplete")} accent="green" />
        <StatCard
          value={urgentsCount}
          label={t("pilotage.statSlotsUrgent")}
          accent={urgentsCount > 0 ? "coral" : "default"}
        />
        <StatCard
          value={attente.length}
          label={t("pilotage.statPendingConfirmation")}
          accent={attente.length > 0 ? "amber" : "default"}
        />
      </div>

      {/* Couverture par pôle */}
      <section className="mb-10">
        <p className="mb-4 text-[11px] font-800 uppercase tracking-[.1em] text-label2">
          {t("pilotage.coverageByPole")}
        </p>
        {event.poles.length === 0 ? (
          <p className="text-sm text-label">{t("pilotage.noPolesConfigured")}</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {event.poles.map((pole) => (
              <div key={pole.id} className="rounded-card border border-hair bg-white p-5">
                {/* En-tête pôle */}
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="font-800 text-ink">{pole.nom}</h3>
                  <span className="text-[13px] font-600 text-label">
                    {pole.inscrits} / {pole.necessaires}
                  </span>
                </div>
                <Jauge inscrits={pole.inscrits} necessaires={pole.necessaires} showValue={false} />

                {/* Tâches */}
                <div className="mt-4 space-y-3">
                  {pole.taches.map((tache) => (
                    <div key={tache.id}>
                      <p className="mb-1.5 text-[12px] font-700 text-label2 uppercase tracking-[.06em]">
                        {tache.nom}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {tache.creneaux.map((cr) => {
                          const st = slotStatus(cr.inscrits, cr.necessaires);
                          const colors = STATUS_COLORS[st];
                          return (
                            <span
                              key={cr.id}
                              style={{ color: colors.fg, background: colors.bg }}
                              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-700"
                            >
                              {cr.debut.replace(":", "h")}–{cr.fin.replace(":", "h")}
                              <span className="opacity-70">
                                {cr.inscrits}/{cr.necessaires}
                              </span>
                            </span>
                          );
                        })}
                        {tache.creneaux.length === 0 && (
                          <span className="text-[12px] text-label2">{t("pilotage.noSlots")}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {pole.taches.length === 0 && (
                    <p className="text-[12px] text-label2">{t("pilotage.noTasks")}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* À confirmer */}
      <section>
        <p className="mb-4 text-[11px] font-800 uppercase tracking-[.1em] text-label2">
          {t("pilotage.toConfirm")}
          {attente.length > 0 && <span className="ml-2 text-warn">{attente.length}</span>}
        </p>

        {attente.length === 0 ? (
          <div className="flex items-center gap-3 rounded-card border border-hair bg-white px-6 py-5 text-success">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p className="text-sm font-700">{t("pilotage.allConfirmed")}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-card border border-hair bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-surface hover:bg-surface">
                  <TableHead>{t("pilotage.tableVolunteer")}</TableHead>
                  <TableHead>{t("pilotage.tablePhone")}</TableHead>
                  <TableHead>{t("pilotage.tablePoles")}</TableHead>
                  <TableHead>{t("pilotage.tableSlots")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attente.map((v) => (
                  <TableRow key={v.id}>
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
                    <TableCell className="text-sm font-600 text-ink2">
                      {v.tel || <span className="text-label2">—</span>}
                    </TableCell>
                    <TableCell className="text-sm text-ink2">
                      {v.poles.map((p) => p.nom).join(", ") || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {v.creneaux.map((cr) => (
                          <Badge key={cr.id} variant="default">
                            {cr.tache} · {cr.debut.replace(":", "h")}–{cr.fin.replace(":", "h")}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </AdminLayout>
  );
}
