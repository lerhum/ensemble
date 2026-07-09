// Page « introuvable » (404).
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

export const NotFoundPage = () => (
  <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-start gap-4 px-6 py-16">
    <Logo className="h-9" />
    <h1 className="text-3xl font-800 tracking-tighter2 text-ink">Page introuvable</h1>
    <p className="text-label">Cette page n'existe pas (ou plus).</p>
    <Link
      to="/e/demo-gots-talent"
      className="text-brand font-700 underline-offset-4 hover:underline"
    >
      → Retour à l'événement
    </Link>
  </div>
);
