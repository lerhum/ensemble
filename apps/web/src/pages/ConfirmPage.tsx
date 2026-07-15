import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, KeyRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { useVolunteer } from "@/lib/volunteer-context";
import { Button } from "@/components/ui/button";

/** Page displayed when a volunteer clicks the email confirmation link. Confirms participation via token. */
export default function ConfirmPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const { session } = useVolunteer();
  const { t } = useTranslation("public");
  const [state, setState] = React.useState<"loading" | "ok" | "already" | "error">("loading");

  React.useEffect(() => {
    if (!token) {
      setState("error");
      return;
    }
    api
      .confirmerToken(token)
      .then((r) => setState(r.ok ? (r.alreadyConfirmed ? "already" : "ok") : "error"))
      .catch(() => setState("error"));
  }, [token]);

  if (state === "loading") {
    return (
      <Center>
        <Loader2 className="h-8 w-8 animate-spin text-label" />
        <p className="mt-3 text-label">{t("confirm.verifying")}</p>
      </Center>
    );
  }

  if (state === "error") {
    return (
      <Center>
        <XCircle className="h-10 w-10 text-danger" />
        <h1 className="mt-3 text-xl font-800 text-ink">{t("confirm.invalidLinkTitle")}</h1>
        <p className="mt-1 text-sm text-label">{t("confirm.invalidLinkBody")}</p>
        <Button variant="outline" className="mt-6" onClick={() => navigate("/")}>
          {t("confirm.backToHome")}
        </Button>
      </Center>
    );
  }

  return (
    <Center>
      <CheckCircle2 className="h-10 w-10 text-success" />
      <h1 className="mt-3 text-xl font-800 text-ink">
        {state === "already" ? t("confirm.alreadyConfirmedTitle") : t("confirm.confirmedTitle")}
      </h1>
      <p className="mt-1 text-sm text-label">
        {state === "already" ? t("confirm.alreadyConfirmedBody") : t("confirm.confirmedBody")}
      </p>

      <Link to={session ? "/mes-inscriptions" : `/mes-inscriptions/${token}`} className="mt-6">
        <Button variant="brand">{t("confirm.viewMySignups")}</Button>
      </Link>

      {/* Proposer la création d'un compte si pas encore connecté */}
      {!session && (
        <div className="mt-6 w-full rounded-card border border-hair bg-[#F9F9F8] px-4 py-4 text-center">
          <KeyRound className="mx-auto h-5 w-5 text-label" />
          <p className="mt-2 text-sm font-700 text-ink">{t("confirm.createAccessTitle")}</p>
          <p className="mt-0.5 text-[13px] text-label">{t("confirm.createAccessBody")}</p>
          <Link to={`/definir-mot-de-passe/${token}`} className="mt-3 inline-block">
            <Button variant="outline" size="sm">
              {t("confirm.setPassword")}
            </Button>
          </Link>
        </div>
      )}
    </Center>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-white">
      <div className="flex flex-col items-center text-center px-4 max-w-sm">{children}</div>
    </div>
  );
}
