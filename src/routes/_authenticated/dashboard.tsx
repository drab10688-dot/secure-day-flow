import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { Building2, Users, ClipboardCheck, AlertTriangle, FileText, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { currentCompanyId, memberships } = useCompany();

  const { data: stats } = useQuery({
    queryKey: ["stats", currentCompanyId],
    enabled: !!currentCompanyId,
    queryFn: async () => {
      const [w, i, d, r, s] = await Promise.all([
        supabase.from("company_members").select("id", { count: "exact", head: true }).eq("company_id", currentCompanyId!),
        supabase.from("incidents").select("id", { count: "exact", head: true }).eq("company_id", currentCompanyId!),
        supabase.from("documents").select("id", { count: "exact", head: true }).eq("company_id", currentCompanyId!),
        supabase.from("risk_matrix").select("id", { count: "exact", head: true }).eq("company_id", currentCompanyId!),
        supabase.from("shift_approvals").select("id", { count: "exact", head: true }).eq("company_id", currentCompanyId!)
          .gte("started_at", new Date(new Date().setHours(0,0,0,0)).toISOString()),
      ]);
      return {
        workers: w.count ?? 0,
        incidents: i.count ?? 0,
        documents: d.count ?? 0,
        risks: r.count ?? 0,
        shiftsToday: s.count ?? 0,
      };
    },
  });

  if (!memberships.length) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center">
        <h2 className="text-lg font-semibold">Comienza creando una empresa</h2>
        <p className="mt-2 text-sm text-muted-foreground">Aún no perteneces a ninguna empresa.</p>
        <Link to="/empresas" className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Crear empresa
        </Link>
      </div>
    );
  }

  const items = [
    { label: "Trabajadores", value: stats?.workers ?? "—", icon: Users, to: "/trabajadores" as const },
    { label: "Jornadas hoy", value: stats?.shiftsToday ?? "—", icon: ClipboardCheck, to: "/jornada" as const },
    { label: "Incidentes", value: stats?.incidents ?? "—", icon: AlertTriangle, to: "/incidentes" as const },
    { label: "Riesgos identificados", value: stats?.risks ?? "—", icon: ShieldAlert, to: "/riesgos" as const },
    { label: "Documentos", value: stats?.documents ?? "—", icon: FileText, to: "/documentos" as const },
    { label: "Empresas", value: memberships.length, icon: Building2, to: "/empresas" as const },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Panel</h1>
      <p className="text-sm text-muted-foreground">Resumen de tu Sistema SG-SST.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => (
          <Link key={i.label} to={i.to} className="rounded-xl border border-border bg-card p-5 hover:border-primary transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{i.label}</span>
              <i.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="mt-2 text-3xl font-bold">{i.value}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
