import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompany";
import { Shield, LayoutDashboard, Building2, Users, ClipboardCheck, AlertTriangle, FileText, ShieldAlert, LogOut } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthedLayout,
});

const nav = [
  { to: "/dashboard", label: "Panel", icon: LayoutDashboard },
  { to: "/empresas", label: "Empresas", icon: Building2 },
  { to: "/trabajadores", label: "Trabajadores", icon: Users },
  { to: "/jornada", label: "Inicio de jornada", icon: ClipboardCheck },
  { to: "/incidentes", label: "Incidentes", icon: AlertTriangle },
  { to: "/riesgos", label: "Matriz de riesgos", icon: ShieldAlert },
  { to: "/documentos", label: "Documentos", icon: FileText },
] as const;

function AuthedLayout() {
  const { user, loading, signOut } = useAuth();
  const { memberships, currentCompanyId, setCurrentCompanyId, currentRole } = useCompany();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Cargando…</div>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex items-center gap-2 border-b border-sidebar-border px-5 py-4">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Shield className="h-4 w-4" />
          </div>
          <span className="font-semibold text-sidebar-foreground">SafeWork</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((n) => {
            const active = pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="mb-2 truncate text-xs text-muted-foreground">{user.email}</div>
          <Button variant="outline" size="sm" className="w-full" onClick={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4" /> Salir
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
          <div className="flex items-center gap-3">
            {memberships.length > 0 ? (
              <Select value={currentCompanyId ?? undefined} onValueChange={setCurrentCompanyId}>
                <SelectTrigger className="w-[260px]">
                  <SelectValue placeholder="Selecciona empresa" />
                </SelectTrigger>
                <SelectContent>
                  {memberships.map((m) => (
                    <SelectItem key={m.company_id} value={m.company_id}>
                      {m.companies?.name ?? "Sin nombre"} · {m.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-sm text-muted-foreground">
                Aún no perteneces a ninguna empresa. Crea una en <Link to="/empresas" className="text-primary underline">Empresas</Link>.
              </span>
            )}
            {currentRole && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground capitalize">
                {currentRole}
              </span>
            )}
          </div>
          <nav className="flex gap-3 md:hidden">
            <Link to="/dashboard" className="text-sm text-primary">Panel</Link>
            <button onClick={() => signOut()} className="text-sm">Salir</button>
          </nav>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
