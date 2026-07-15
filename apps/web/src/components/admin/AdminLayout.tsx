import { NavLink, useParams, Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ListTodo,
  Users,
  Megaphone,
  Settings,
  ChevronLeft,
  CalendarDays,
  LogOut,
  Pencil,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/Logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { initials } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  eyebrow?: string;
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/** Admin shell: left sidebar with navigation and user card, main content area with a page header. */
export function AdminLayout({ eyebrow, title, actions, children }: AdminLayoutProps) {
  const { user, refresh } = useAuth();
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation("admin");

  const NAV_DISABLED = [{ label: t("layout.communications"), icon: Megaphone }];

  /** Signs out the current admin and redirects to the login page. */
  async function logout() {
    await api.logout();
    await refresh();
    navigate("/login");
  }

  const eventNav = id
    ? [
        {
          to: `/admin/events/${id}`,
          label: t("layout.dashboard"),
          icon: LayoutDashboard,
          end: true,
        },
        {
          to: `/admin/events/${id}/edition`,
          label: t("layout.editEvent"),
          icon: Pencil,
          end: false,
        },
        {
          to: `/admin/events/${id}/poles`,
          label: t("layout.polesAndSlots"),
          icon: ListTodo,
          end: false,
        },
        {
          to: `/admin/events/${id}/volunteers`,
          label: t("layout.volunteers"),
          icon: Users,
          end: false,
        },
      ]
    : null;

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-hair bg-white px-4 py-6 lg:flex">
        <div className="px-2">
          <Logo className="h-8" color="#1C3A5E" />
        </div>

        {eventNav ? (
          <>
            <Link
              to="/admin"
              className="mt-6 flex items-center gap-1.5 px-3 text-[12px] font-700 text-label hover:text-ink transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {t("layout.backToEvents")}
            </Link>
            <p className="mt-5 px-3 text-[11px] font-800 uppercase tracking-[.1em] text-label2">
              {t("shared.pilotage")}
            </p>
            <nav className="mt-2 flex flex-col gap-1">
              {eventNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm font-700 transition-colors",
                      isActive ? "bg-ink text-white" : "text-ink2 hover:bg-surface",
                    )
                  }
                >
                  <item.icon className="h-[18px] w-[18px]" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </>
        ) : (
          <>
            <p className="mt-8 px-3 text-[11px] font-800 uppercase tracking-[.1em] text-label2">
              {t("shared.pilotage")}
            </p>
            <nav className="mt-2 flex flex-col gap-1">
              <NavLink
                to="/admin"
                end
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm font-700 transition-colors",
                    isActive ? "bg-ink text-white" : "text-ink2 hover:bg-surface",
                  )
                }
              >
                <CalendarDays className="h-[18px] w-[18px]" />
                {t("layout.events")}
              </NavLink>
            </nav>
          </>
        )}

        <div className="mt-auto">
          <nav className="mb-2 flex flex-col gap-1">
            <NavLink
              to="/admin/settings"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm font-700 transition-colors",
                  isActive ? "bg-ink text-white" : "text-ink2 hover:bg-surface",
                )
              }
            >
              <Settings className="h-[18px] w-[18px]" />
              {t("layout.settings")}
            </NavLink>
            {NAV_DISABLED.map((item) => (
              <span
                key={item.label}
                className="flex cursor-not-allowed items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm font-700 text-label2"
              >
                <item.icon className="h-[18px] w-[18px]" />
                {item.label}
              </span>
            ))}
          </nav>
          <div className="flex items-center gap-3 px-2 pt-4 border-t border-hair">
            <Avatar className="h-9 w-9">
              <AvatarFallback>
                {initials(user?.nom || t("layout.committeeFallback"))}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-sm font-700 text-ink truncate">
                {user?.nom || t("layout.committeeFallback")}
              </p>
              <p className="text-[12px] text-label">{t("layout.administrator")}</p>
            </div>
            <button
              onClick={logout}
              className="shrink-0 rounded-lg p-1.5 text-label2 hover:bg-surface hover:text-danger"
              title={t("layout.logout")}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Contenu */}
      <main className="min-w-0 flex-1 px-6 py-6 lg:px-10 lg:py-8">
        <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            {eyebrow && <p className="text-[12px] font-700 text-label">{eyebrow}</p>}
            <h1 className="mt-1 text-[28px] font-800 leading-none tracking-tighter2 text-ink">
              {title}
            </h1>
          </div>
          {actions && <div className="flex items-center gap-2.5">{actions}</div>}
        </header>
        {children}
      </main>
    </div>
  );
}

/** Stat card used in the admin dashboard stats bar. */
export function StatCard({
  value,
  label,
  accent,
}: {
  value: React.ReactNode;
  label: string;
  accent?: "default" | "coral" | "green" | "amber";
}) {
  const color =
    accent === "coral"
      ? "text-coral"
      : accent === "green"
        ? "text-success"
        : accent === "amber"
          ? "text-warn"
          : "text-ink";
  return (
    <div>
      <div className={cn("text-[28px] font-800 leading-none", color)}>{value}</div>
      <div className="mt-1.5 text-[13px] text-label">{label}</div>
    </div>
  );
}
