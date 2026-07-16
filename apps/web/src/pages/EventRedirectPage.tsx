import * as React from "react";
import { Navigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { PublicNav } from "@/components/public/PublicNav";
import { DEFAULT_ACCENT } from "@/lib/theme";
import type { EventDetailDTO } from "@ensemble/db/shared";

/** Root redirect: fetches the current active event and navigates to its public page. Shows nothing while loading. */
export default function EventRedirectPage() {
  const { t } = useTranslation("public");
  const { siteTitle, siteLogo } = useAuth();
  const [event, setEvent] = React.useState<EventDetailDTO | null | undefined>(undefined);

  React.useEffect(() => {
    api
      .getCurrentEvent()
      .then(setEvent)
      .catch(() => setEvent(null));
  }, []);

  if (event === undefined) return null;
  if (event) return <Navigate to={`/e/${event.slug}`} replace />;

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <PublicNav
        orgNom={siteTitle || t("eventRedirect.brandFallback")}
        accent={DEFAULT_ACCENT}
        siteLogo={siteLogo}
      />
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-[15px] font-700 text-ink">{t("eventRedirect.noEvent")}</p>
          <p className="mt-1 text-[13px] text-label">{t("eventRedirect.comeBackLater")}</p>
          <Link
            to="/confidentialite"
            className="mt-4 inline-block text-[13px] text-label hover:underline"
          >
            {t("eventParent.confidentiality")}
          </Link>
        </div>
      </div>
    </div>
  );
}
