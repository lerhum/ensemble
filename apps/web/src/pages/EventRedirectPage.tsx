import * as React from "react";
import { Navigate } from "react-router-dom";
import { api } from "@/lib/api";
import type { EventDetailDTO } from "@ensemble/db/shared";

/** Root redirect: fetches the current active event and navigates to its public page. Shows nothing while loading. */
export default function EventRedirectPage() {
  const [event, setEvent] = React.useState<EventDetailDTO | null | undefined>(undefined);

  React.useEffect(() => {
    api.getCurrentEvent().then(setEvent).catch(() => setEvent(null));
  }, []);

  if (event === undefined) return null;
  if (event) return <Navigate to={`/e/${event.slug}`} replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="text-center">
        <p className="text-[15px] font-700 text-ink">Aucun événement en cours</p>
        <p className="mt-1 text-[13px] text-label">Revenez prochainement.</p>
      </div>
    </div>
  );
}
