import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, KeyRound } from "lucide-react";
import { api } from "@/lib/api";
import { useVolunteer } from "@/lib/volunteer-context";
import { Button } from "@/components/ui/button";

/** Page displayed when a volunteer clicks the email confirmation link. Confirms participation via token. */
export default function ConfirmPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const { session } = useVolunteer();
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
        <p className="mt-3 text-label">Vérification en cours…</p>
      </Center>
    );
  }

  if (state === "error") {
    return (
      <Center>
        <XCircle className="h-10 w-10 text-danger" />
        <h1 className="mt-3 text-xl font-800 text-ink">Lien invalide ou expiré</h1>
        <p className="mt-1 text-sm text-label">
          Ce lien de confirmation n'est plus valide. Contacte l'organisateur si nécessaire.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => navigate("/")}>
          Retour à l'accueil
        </Button>
      </Center>
    );
  }

  return (
    <Center>
      <CheckCircle2 className="h-10 w-10 text-success" />
      <h1 className="mt-3 text-xl font-800 text-ink">
        {state === "already" ? "Participation déjà confirmée" : "Participation confirmée !"}
      </h1>
      <p className="mt-1 text-sm text-label">
        {state === "already"
          ? "Ta participation avait déjà été confirmée."
          : "Merci ! Ta participation est bien enregistrée."}
      </p>

      <Link to={session ? "/mes-inscriptions" : `/mes-inscriptions/${token}`} className="mt-6">
        <Button variant="brand">Voir mes inscriptions</Button>
      </Link>

      {/* Proposer la création d'un compte si pas encore connecté */}
      {!session && (
        <div className="mt-6 w-full rounded-card border border-hair bg-[#F9F9F8] px-4 py-4 text-center">
          <KeyRound className="mx-auto h-5 w-5 text-label" />
          <p className="mt-2 text-sm font-700 text-ink">Crée ton accès personnel</p>
          <p className="mt-0.5 text-[13px] text-label">
            Définis un mot de passe pour retrouver tes inscriptions et t'inscrire en un clic.
          </p>
          <Link to={`/definir-mot-de-passe/${token}`} className="mt-3 inline-block">
            <Button variant="outline" size="sm">
              Définir mon mot de passe
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
