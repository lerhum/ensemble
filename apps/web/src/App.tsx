import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth-context";
import { RequireAdmin } from "@/components/RequireAdmin";
import InstallPage from "@/pages/InstallPage";
import LoginPage from "@/pages/LoginPage";
import EventParentPage from "@/pages/EventParentPage";
import EventRedirectPage from "@/pages/EventRedirectPage";
import PoleSelectionPage from "@/pages/PoleSelectionPage";
import AdminEventsListPage from "@/pages/admin/AdminEventsListPage";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import AdminPolesPage from "@/pages/admin/AdminPolesPage";
import AdminVolunteersPage from "@/pages/admin/AdminVolunteersPage";
import { NotFoundPage } from "@/pages/stubs";

function A({ children }: { children: React.ReactNode }) {
  return <RequireAdmin>{children}</RequireAdmin>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<EventRedirectPage />} />
          <Route path="/e/:slug" element={<EventParentPage />} />
          <Route path="/e/:slug/pole/:poleId" element={<PoleSelectionPage />} />

          {/* Auth / installeur */}
          <Route path="/install" element={<InstallPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Admin : liste des événements */}
          <Route path="/admin" element={<A><AdminEventsListPage /></A>} />

          {/* Admin : édition d'un événement spécifique */}
          <Route path="/admin/events/:id" element={<A><AdminDashboardPage /></A>} />
          <Route path="/admin/events/:id/poles" element={<A><AdminPolesPage /></A>} />
          <Route path="/admin/events/:id/volunteers" element={<A><AdminVolunteersPage /></A>} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
