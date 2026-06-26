import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function ConfirmPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const [state, setState] = React.useState<"loading" | "ok" | "already" | "error">("loading");

  React.useEffect(() => {
    if (!token) { setState("error"); return; }
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
      <Link to={`/mes-inscriptions/${token}`}>
        <Button variant="brand" className="mt-6">
          Voir mes inscriptions
        </Button>
      </Link>
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
