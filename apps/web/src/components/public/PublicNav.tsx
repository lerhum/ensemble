import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

// Barre de navigation publique (desktop, écrans 6/7).
export function PublicNav({ orgNom, accent }: { orgNom: string; accent: string }) {
  return (
    <nav className="flex items-center justify-between border-b border-hair px-8 py-4">
      <div className="flex items-center gap-3">
        <Logo className="h-8" color={accent} />
        {orgNom && (
          <>
            <span className="h-5 w-px bg-hair" />
            <span className="text-[13px] font-700 text-label">{orgNom}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-6 text-sm font-700 text-ink2">
        <span className="hidden cursor-pointer hover:text-ink sm:inline">Le programme</span>
        <span className="hidden cursor-pointer hover:text-ink sm:inline">Mes inscriptions</span>
        <Link
          to="/login"
          className="rounded-[10px] border border-hair px-3.5 py-2 text-ink hover:bg-surface"
        >
          Se connecter
        </Link>
      </div>
    </nav>
  );
}
