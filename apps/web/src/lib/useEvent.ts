import * as React from "react";
import type { EventDetailDTO } from "@ensemble/db/shared";
import { api, ApiError } from "./api";

// Slug de l'événement de démo (un seul événement dans le seed).
export const DEMO_SLUG = "vinalmont-gots-talent";

interface EventState {
  event: EventDetailDTO | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  setEvent: React.Dispatch<React.SetStateAction<EventDetailDTO | null>>;
}

export function useEvent(slug: string): EventState {
  const [event, setEvent] = React.useState<EventDetailDTO | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Ne bascule pas `loading` (réservé au chargement initial) : un reload après
  // mutation ne doit pas démonter l'écran ni faire clignoter « Chargement… ».
  const reload = React.useCallback(async () => {
    setError(null);
    try {
      setEvent(await api.getEvent(slug));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  return { event, loading, error, reload, setEvent };
}
