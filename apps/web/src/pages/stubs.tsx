// Stubs des écrans (étape 4). Les écrans complets sont implémentés à l'étape 6.
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

function Stub({ title }: { title: string }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-start gap-4 px-6 py-16">
      <Logo className="h-9" />
      <h1 className="text-3xl font-800 tracking-tighter2 text-ink">{title}</h1>
      <p className="text-label">Écran à venir (étape 6).</p>
      <Link to="/e/vinalmont-gots-talent" className="text-brand font-700 underline-offset-4 hover:underline">
        → Voir la page événement
      </Link>
    </div>
  );
}

export const PoleSelectionPage = () => <Stub title="Sélection des créneaux" />;
export const AdminDashboardPage = () => <Stub title="Admin · Tableau de bord & création" />;
export const AdminPolesPage = () => <Stub title="Admin · Pôles & créneaux" />;
export const AdminVolunteersPage = () => <Stub title="Admin · Bénévoles" />;
export const NotFoundPage = () => <Stub title="Page introuvable" />;
