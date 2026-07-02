import { and, eq, isNull } from "drizzle-orm";
import { inscriptions, settings } from "@ensemble/db";
import type { Db } from "@ensemble/db/node";
import type { EmailService } from "./email.js";
import { creneauStartInstant } from "./scheduling.js";

export interface DueInscriptionRow {
  creneauId: string;
  volunteerId: string;
  creneau: {
    debut: string;
    fin: string;
    tache: { nom: string; pole: { nom: string; event: { statut: string; dateIso: string | null; nom: string; lieu: string } } };
  };
  volunteer: { email: string | null; nom: string; statut: string };
}

/**
 * Pure filter: given unsent inscriptions (already joined with créneau/event/volunteer),
 * returns those whose event is published, whose volunteer is confirmed, and whose créneau
 * starts within [now, now + hoursBefore].
 */
export function selectDueReminders(rows: DueInscriptionRow[], now: number, hoursBefore: number): DueInscriptionRow[] {
  const windowEnd = now + hoursBefore * 60 * 60 * 1000;
  return rows.filter((row) => {
    const { event } = row.creneau.tache.pole;
    if (event.statut !== "publie" || row.volunteer.statut !== "confirme") return false;
    const start = creneauStartInstant(event.dateIso, row.creneau.debut);
    return !!start && start.getTime() >= now && start.getTime() <= windowEnd;
  });
}

/**
 * Sends reminder emails for every inscription whose créneau starts within the next
 * `hoursBefore` hours and hasn't been reminded yet, then marks it as sent. Only
 * considers published events and confirmed volunteers. Returns the number of emails sent.
 */
export async function sendDueReminders(db: Db, email: EmailService, hoursBefore?: number): Promise<number> {
  const lead = hoursBefore ?? (await readReminderHoursBefore(db));

  const unsent = await db.query.inscriptions.findMany({
    where: isNull(inscriptions.reminderSentAt),
    with: {
      creneau: { with: { tache: { with: { pole: { with: { event: true } } } } } },
      volunteer: true,
    },
  });

  const due = selectDueReminders(unsent, Date.now(), lead);

  let sent = 0;
  for (const row of due) {
    const { creneau, volunteer } = row;
    if (!volunteer.email) continue; // Bénévole ajouté par l'admin sans email : pas de rappel possible.
    const { event } = creneau.tache.pole;

    await email.send(
      volunteer.email,
      `Rappel — ton créneau approche (${event.nom})`,
      reminderHtml(volunteer.nom, event.nom, creneau.tache.nom, creneau.tache.pole.nom, creneau.debut, creneau.fin, event.lieu),
      reminderText(volunteer.nom, event.nom, creneau.tache.nom, creneau.tache.pole.nom, creneau.debut, creneau.fin, event.lieu),
    );

    await db
      .update(inscriptions)
      .set({ reminderSentAt: new Date() })
      .where(and(eq(inscriptions.creneauId, row.creneauId), eq(inscriptions.volunteerId, row.volunteerId)));

    sent++;
  }

  return sent;
}

/** Reads the configured reminder lead time (hours before start), defaulting to 24. */
async function readReminderHoursBefore(db: Db): Promise<number> {
  const [row] = await db.select().from(settings);
  return row?.reminderHoursBefore ?? 24;
}

// ── Templates email ───────────────────────────────────────────────────────

/** Generates the HTML body for the slot-reminder email. */
function reminderHtml(nom: string, eventNom: string, tacheNom: string, poleNom: string, debut: string, fin: string, lieu: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>Rappel de créneau</title></head>
<body style="font-family:system-ui,sans-serif;background:#f9f9f9;margin:0;padding:40px 0">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:36px;border:1px solid #e8e8e8">
    <p style="font-size:22px;font-weight:800;color:#111;margin:0 0 8px">Bonjour ${nom} 👋</p>
    <p style="color:#555;margin:0 0 24px">Petit rappel : ton créneau approche pour <strong>${eventNom}</strong>.</p>
    <div style="background:#f5f5f5;border-radius:8px;padding:16px 20px;margin:0 0 24px">
      <p style="margin:0 0 4px;color:#111;font-weight:700">${poleNom} — ${tacheNom}</p>
      <p style="margin:0;color:#555">${debut} – ${fin}${lieu ? ` · ${lieu}` : ""}</p>
    </div>
    <p style="color:#aaa;font-size:12px;margin:0">Merci pour ton engagement !</p>
  </div>
</body>
</html>`;
}

/** Generates the plain-text body for the slot-reminder email. */
function reminderText(nom: string, eventNom: string, tacheNom: string, poleNom: string, debut: string, fin: string, lieu: string): string {
  return `Bonjour ${nom},

Petit rappel : ton créneau approche pour ${eventNom}.

${poleNom} — ${tacheNom}
${debut} – ${fin}${lieu ? ` · ${lieu}` : ""}

Merci pour ton engagement !

Ensemble`;
}
