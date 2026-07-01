const BRUSSELS_TZ = "Europe/Brussels";

/** Returns the UTC offset (in minutes) in effect for Europe/Brussels at the given naive instant. */
function brusselsOffsetMinutes(naiveUtc: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BRUSSELS_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(naiveUtc);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return (asUtc - naiveUtc.getTime()) / 60_000;
}

/**
 * Returns the absolute UTC instant a créneau starts, given the event's `dateIso`
 * ("YYYY-MM-DD") and the créneau's `debut` ("HH:MM"), interpreted in Europe/Brussels
 * time (DST-aware). Returns null if either input is malformed or the event has no dateIso.
 */
export function creneauStartInstant(dateIso: string | null, debut: string): Date | null {
  if (!dateIso || !/^\d{4}-\d{2}-\d{2}$/.test(dateIso) || !/^\d{2}:\d{2}$/.test(debut)) return null;
  const naiveUtc = new Date(`${dateIso}T${debut}:00Z`);
  if (Number.isNaN(naiveUtc.getTime())) return null;
  const offsetMinutes = brusselsOffsetMinutes(naiveUtc);
  return new Date(naiveUtc.getTime() - offsetMinutes * 60_000);
}
