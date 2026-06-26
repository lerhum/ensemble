import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/lib/auth-context";
import { RequireAdmin } from "@/components/RequireAdmin";
import InstallPage from "@/pages/InstallPage";
import LoginPage from "@/pages/LoginPage";
import EventParentPage from "@/pages/EventParentPage";
import PoleSelectionPage from "@/pages/PoleSelectionPage";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import AdminPolesPage from "@/pages/admin/AdminPolesPage";
import AdminVolunteersPage from "@/pages/admin/AdminVolunteersPage";
import { NotFoundPage } from "@/pages/stubs";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Navigate to="/e/vinalmont-gots-talent" replace />} />
          <Route path="/e/:slug" element={<EventParentPage />} />
          <Route path="/e/:slug/pole/:poleId" element={<PoleSelectionPage />} />

          {/* Auth / installeur */}
          <Route path="/install" element={<InstallPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Admin (protégé) */}
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminDashboardPage />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/poles"
            element={
              <RequireAdmin>
                <AdminPolesPage />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/volunteers"
            element={
              <RequireAdmin>
                <AdminVolunteersPage />
              </RequireAdmin>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
