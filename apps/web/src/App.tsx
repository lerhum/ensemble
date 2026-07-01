import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth-context";
import { VolunteerProvider } from "@/lib/volunteer-context";
import { RequireAdmin } from "@/components/RequireAdmin";
import InstallPage from "@/pages/InstallPage";
import LoginPage from "@/pages/LoginPage";
import VolunteerLoginPage from "@/pages/VolunteerLoginPage";
import SetPasswordPage from "@/pages/SetPasswordPage";
import EventParentPage from "@/pages/EventParentPage";
import EventRedirectPage from "@/pages/EventRedirectPage";
import PoleSelectionPage from "@/pages/PoleSelectionPage";
import ConfirmPage from "@/pages/ConfirmPage";
import MesInscriptionsPage from "@/pages/MesInscriptionsPage";
import AdminEventsListPage from "@/pages/admin/AdminEventsListPage";
import AdminPilotagePage from "@/pages/admin/AdminPilotagePage";
import AdminEventEditPage from "@/pages/admin/AdminEventEditPage";
import AdminPolesPage from "@/pages/admin/AdminPolesPage";
import AdminVolunteersPage from "@/pages/admin/AdminVolunteersPage";
import AdminSettingsPage from "@/pages/admin/AdminSettingsPage";
import PrivacyPage from "@/pages/PrivacyPage";
import { NotFoundPage } from "@/pages/stubs";

function A({ children }: { children: React.ReactNode }) {
  return <RequireAdmin>{children}</RequireAdmin>;
}

export default function App() {
  return (
    <AuthProvider>
      <VolunteerProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<EventRedirectPage />} />
            <Route path="/e/:slug" element={<EventParentPage />} />
            <Route path="/e/:slug/pole/:poleId" element={<PoleSelectionPage />} />
            <Route path="/confirmer/:token" element={<ConfirmPage />} />
            <Route path="/mes-inscriptions" element={<MesInscriptionsPage />} />
            <Route path="/mes-inscriptions/:token" element={<MesInscriptionsPage />} />
            <Route path="/definir-mot-de-passe/:token" element={<SetPasswordPage />} />
            <Route path="/confidentialite" element={<PrivacyPage />} />

            {/* Auth / installeur */}
            <Route path="/install" element={<InstallPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/benevole/connexion" element={<VolunteerLoginPage />} />

            {/* Admin : liste des événements */}
            <Route path="/admin" element={<A><AdminEventsListPage /></A>} />

            {/* Admin : pilotage + édition d'un événement spécifique */}
            <Route path="/admin/events/:id" element={<A><AdminPilotagePage /></A>} />
            <Route path="/admin/events/:id/edition" element={<A><AdminEventEditPage /></A>} />
            <Route path="/admin/events/:id/poles" element={<A><AdminPolesPage /></A>} />
            <Route path="/admin/events/:id/volunteers" element={<A><AdminVolunteersPage /></A>} />
            <Route path="/admin/settings" element={<A><AdminSettingsPage /></A>} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </VolunteerProvider>
    </AuthProvider>
  );
}
