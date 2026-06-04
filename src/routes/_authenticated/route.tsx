import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompany";
import { supabase } from "@/integrations/supabase/client";
import { Shield, LayoutDashboard, Building2, Users, ClipboardCheck, AlertTriangle, FileText, ShieldAlert, LogOut, BookOpen, HardHat, Stethoscope, UsersRound, Siren, ClipboardList, BarChart3, CheckSquare, FileBarChart, UserCheck, Copy, Settings } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";


export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthedLayout,
});

type NavItem = { to: string; label: string; icon: any };

// Admin / supervisor full nav
const adminNav: NavItem[] = [
  { to: "/dashboard", label: "Panel", icon: LayoutDashboard },
  { to: "/empresas", label: "Empresas", icon: Building2 },
  { to: "/trabajadores", label: "Trabajadores", icon: Users },
  { to: "/aprobaciones", label: "Aprobaciones jornada", icon: UserCheck },
  { to: "/autoevaluacion", label: "Autoevaluación 0312", icon: CheckSquare },
  { to: "/riesgos", label: "Matriz de riesgos", icon: ShieldAlert },
  { to: "/incidentes", label: "Incidentes", icon: AlertTriangle },
  { to: "/inspecciones", label: "Inspecciones", icon: ClipboardList },
  { to: "/capacitaciones", label: "Capacitaciones", icon: BookOpen },
  { to: "/epp", label: "EPP", icon: HardHat },
  { to: "/examenes", label: "Exámenes médicos", icon: Stethoscope },
  { to: "/comites", label: "Comités", icon: UsersRound },
  { to: "/emergencias", label: "Emergencias", icon: Siren },
  { to: "/indicadores", label: "Indicadores", icon: BarChart3 },
  { to: "/reportes", label: "Reportes", icon: FileBarChart },
  { to: "/documentos", label: "Documentos", icon: FileText },
  { to: "/configuracion", label: "Configuración", icon: Settings },
];

// Simplified worker nav — only their workspace
const workerNav: NavItem[] = [
  { to: "/jornada", label: "Mi jornada", icon: ClipboardCheck },
  { to: "/incidentes", label: "Reportar incidente", icon: AlertTriangle },
  { to: "/capacitaciones", label: "Mis capacitaciones", icon: BookOpen },
  { to: "/epp", label: "Mi EPP", icon: HardHat },
  { to: "/examenes", label: "Mis exámenes", icon: Stethoscope },
  { to: "/documentos", label: "Documentos", icon: FileText },
  { to: "/configuracion", label: "Configuración", icon: Settings },
];

// Routes a worker is NOT allowed to load
const workerBlocked = ["/dashboard","/empresas","/trabajadores","/aprobaciones","/autoevaluacion","/riesgos","/inspecciones","/comites","/emergencias","/indicadores","/reportes"];

function AuthedLayout() {
  const { user, loading, signOut } = useAuth();
  const { memberships, pendingMemberships, currentCompanyId, setCurrentCompanyId, currentRole, loading: companyLoading } = useCompany();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { data: isSuperAdmin, isLoading: superLoading } = useQuery({
    queryKey: ["is-super-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("super_admins" as any)
        .select("user_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) return false;
      return !!data;
    },
  });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [loading, user, navigate]);

  // Super-admin can browse every company
  const { data: allCompanies } = useQuery({
    queryKey: ["all-companies-super", user?.id],
    enabled: !!user && !!isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Block workers from admin pages
  useEffect(() => {
    if (!isSuperAdmin && currentRole === "worker" && workerBlocked.includes(pathname)) {
      navigate({ to: "/jornada", replace: true });
    }
  }, [currentRole, pathname, navigate, isSuperAdmin]);

  // If no company is selected, force user onto /empresas so they pick one
  useEffect(() => {
    if (loading || companyLoading || superLoading) return;
    if (!user) return;
    if (currentCompanyId) return;
    // For non-super-admin with exactly 1 membership, useCompany auto-selects; wait one tick
    if (!isSuperAdmin && memberships.length === 1) return;
    if (pathname !== "/empresas") {
      navigate({ to: "/empresas", replace: true });
    }
  }, [loading, companyLoading, superLoading, user, currentCompanyId, pathname, navigate, isSuperAdmin, memberships.length]);

  if (loading || !user || companyLoading || superLoading) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Cargando…</div>;
  }

  // Super-admin bypasses the pending screen
  if (!isSuperAdmin && memberships.length === 0) {
    return <PendingApproval userId={user.id} email={user.email ?? ""} pending={pendingMemberships} onSignOut={signOut} />;
  }

  const isWorker = !isSuperAdmin && currentRole === "worker";
  const fullNav = isWorker ? workerNav : adminNav;
  // Until a company is selected, only show Empresas (admins) or nothing (workers)
  const onlyEmpresasNav: NavItem[] = [{ to: "/empresas", label: "Empresas", icon: Building2 }];
  const nav = !currentCompanyId && !isWorker ? onlyEmpresasNav : fullNav;
  const companyOptions = isSuperAdmin
    ? (allCompanies ?? []).map((c) => ({ id: c.id, name: c.name, role: "super-admin" }))
    : memberships.map((m) => ({ id: m.company_id, name: m.companies?.name ?? "Sin nombre", role: m.role }));




  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex items-center gap-2 border-b border-sidebar-border px-5 py-4">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Shield className="h-4 w-4" />
          </div>
          <span className="font-semibold text-sidebar-foreground">
            SafeWork {isWorker && <span className="text-xs text-muted-foreground">· Trabajador</span>}
          </span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
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
            {companyOptions.length > 1 ? (
              <Select value={currentCompanyId ?? companyOptions[0]?.id ?? ""} onValueChange={setCurrentCompanyId}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="Selecciona empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companyOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} · {c.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : companyOptions.length === 1 ? (
              <span className="text-sm font-medium">{companyOptions[0].name}</span>
            ) : isSuperAdmin ? (
              <span className="text-sm text-muted-foreground">
                Aún no hay empresas. Crea una en <Link to="/empresas" className="text-primary underline">Empresas</Link>.
              </span>
            ) : null}
            {(isSuperAdmin || currentRole) && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium capitalize text-primary">
                {isSuperAdmin ? "super-admin" : currentRole}
              </span>
            )}

          </div>
          <nav className="flex gap-3 md:hidden">
            <Link to={isWorker ? "/jornada" : "/dashboard"} className="text-sm text-primary">Inicio</Link>
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

function PendingApproval({ userId, email, pending, onSignOut }: { userId: string; email: string; pending: any[]; onSignOut: () => void }) {
  const qc = useQueryClient();
  const { data: companies } = useQuery({
    queryKey: ["join-companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id, name, nit").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const pendingIds = new Set(pending.map((p: any) => p.company_id));
  const request = async (companyId: string) => {
    const { error } = await supabase.from("company_members").insert({
      company_id: companyId, user_id: userId, role: "worker" as any, status: "pendiente" as any,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Solicitud enviada — espera la aprobación del administrador");
    qc.invalidateQueries({ queryKey: ["memberships"] });
  };
  const copy = () => { navigator.clipboard.writeText(userId); toast.success("ID copiado"); };
  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Shield className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold">Bienvenido</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Hola {email}. Solicita unirte a una empresa para acceder a la plataforma.
        </p>

        <div className="mt-5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Empresas disponibles</div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(companies ?? []).map((c: any) => {
              const already = pendingIds.has(c.id);
              return (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <div className="text-sm font-medium">{c.name}</div>
                    {c.nit && <div className="text-xs text-muted-foreground">NIT: {c.nit}</div>}
                  </div>
                  <Button size="sm" variant={already ? "outline" : "default"} disabled={already} onClick={() => request(c.id)}>
                    {already ? "Solicitado" : "Solicitar"}
                  </Button>
                </div>
              );
            })}
            {(companies ?? []).length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                Aún no hay empresas registradas.
              </div>
            )}
          </div>
        </div>

        {pending.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            Tienes {pending.length} solicitud{pending.length === 1 ? "" : "es"} pendiente{pending.length === 1 ? "" : "s"}.
          </div>
        )}

        <details className="mt-4 text-xs text-muted-foreground">
          <summary className="cursor-pointer">¿Tu administrador te pidió tu ID?</summary>
          <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 p-3">
            <code className="break-all text-xs">{userId}</code>
            <Button size="sm" variant="outline" onClick={copy}><Copy className="h-3 w-3" /></Button>
          </div>
        </details>

        <Button variant="outline" className="mt-6 w-full" onClick={onSignOut}>
          <LogOut className="mr-2 h-4 w-4" /> Salir
        </Button>
      </div>
    </div>
  );
}
