import * as React from "react";
import { useTranslation } from "react-i18next";
import type { EventDetailDTO } from "@ensemble/db/shared";
import { api, ApiError } from "./api";

interface EventState {
  event: EventDetailDTO | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  setEvent: React.Dispatch<React.SetStateAction<EventDetailDTO | null>>;
}

/** Fetches and tracks a public event by slug. Returns event, loading state, error, and a reload callback. */
export function useEvent(slug: string): EventState {
  const [event, setEvent] = React.useState<EventDetailDTO | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { t } = useTranslation("common");

  const reload = React.useCallback(async () => {
    setError(null);
    try {
      setEvent(await api.getEvent(slug));
    } catch (err) {
      setError(err instanceof ApiError ? t(err.message, { ns: "errors" }) : t("errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [slug, t]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  return { event, loading, error, reload, setEvent };
}

/** Fetches and tracks an admin event by id. Returns event, loading state, error, and a reload callback. */
export function useAdminEvent(id: string): EventState {
  const [event, setEvent] = React.useState<EventDetailDTO | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { t } = useTranslation("common");

  const reload = React.useCallback(async () => {
    setError(null);
    try {
      setEvent(await api.getAdminEvent(id));
    } catch (err) {
      setError(err instanceof ApiError ? t(err.message, { ns: "errors" }) : t("errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  return { event, loading, error, reload, setEvent };
}
