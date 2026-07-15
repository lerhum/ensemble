import { Route } from "react-router-dom";
import { RequireAdmin } from "@/components/RequireAdmin";
import { LocaleBoundary } from "@/lib/locale-boundary";
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

function AdminRoute({ children }: { children: React.ReactNode }) {
  return <RequireAdmin>{children}</RequireAdmin>;
}

/**
 * The page route tree, with paths relative to whichever ancestor consumed the locale segment
 * (none for the bare/French branch, "nl"/"en" otherwise) — see routeElements().
 */
function appRouteElements() {
  return (
    <>
      {/* Public */}
      <Route index element={<EventRedirectPage />} />
      <Route path="e/:slug" element={<EventParentPage />} />
      <Route path="e/:slug/pole/:poleId" element={<PoleSelectionPage />} />
      <Route path="confirmer/:token" element={<ConfirmPage />} />
      <Route path="mes-inscriptions" element={<MesInscriptionsPage />} />
      <Route path="mes-inscriptions/:token" element={<MesInscriptionsPage />} />
      <Route path="definir-mot-de-passe/:token" element={<SetPasswordPage />} />
      <Route path="confidentialite" element={<PrivacyPage />} />

      {/* Auth / installeur */}
      <Route path="install" element={<InstallPage />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="benevole/connexion" element={<VolunteerLoginPage />} />

      {/* Admin : liste des événements */}
      <Route
        path="admin"
        element={
          <AdminRoute>
            <AdminEventsListPage />
          </AdminRoute>
        }
      />

      {/* Admin : pilotage + édition d'un événement spécifique */}
      <Route
        path="admin/events/:id"
        element={
          <AdminRoute>
            <AdminPilotagePage />
          </AdminRoute>
        }
      />
      <Route
        path="admin/events/:id/edition"
        element={
          <AdminRoute>
            <AdminEventEditPage />
          </AdminRoute>
        }
      />
      <Route
        path="admin/events/:id/poles"
        element={
          <AdminRoute>
            <AdminPolesPage />
          </AdminRoute>
        }
      />
      <Route
        path="admin/events/:id/volunteers"
        element={
          <AdminRoute>
            <AdminVolunteersPage />
          </AdminRoute>
        }
      />
      <Route
        path="admin/settings"
        element={
          <AdminRoute>
            <AdminSettingsPage />
          </AdminRoute>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </>
  );
}

/**
 * Full route tree: "nl"/"en" are literal path segments (not a dynamic ":lng" param) so they can
 * never collide with an existing bare route's first segment ("e", "confirmer", "admin", ...) — see
 * the plan for A2 for why a dynamic locale param was rejected. The French branch is a pathless
 * layout route: it wraps the same page routes without consuming a URL segment, so every bare path
 * already in production (including links already emailed to users) resolves unchanged.
 */
export function routeElements() {
  return (
    <>
      <Route path="nl" element={<LocaleBoundary lng="nl" />}>
        {appRouteElements()}
      </Route>
      <Route path="en" element={<LocaleBoundary lng="en" />}>
        {appRouteElements()}
      </Route>
      <Route element={<LocaleBoundary lng="fr" />}>{appRouteElements()}</Route>
    </>
  );
}
