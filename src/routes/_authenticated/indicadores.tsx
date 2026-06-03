import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/indicadores")({
  component: IndicatorsPage,
});

function IndicatorsPage() {
  const { currentCompanyId } = useCompany();

  const { data } = useQuery({
    queryKey: ["indicators", currentCompanyId],
    enabled: !!currentCompanyId,
    queryFn: async () => {
      const [incidents, members, shifts, trainings] = await Promise.all([
        supabase.from("incidents").select("type, severity, occurred_at, status").eq("company_id", currentCompanyId!),
        supabase.from("company_members").select("id").eq("company_id", currentCompanyId!),
        supabase.from("shift_approvals").select("id, started_at").eq("company_id", currentCompanyId!),
        supabase.from("trainings").select("id, training_attendees(attended)").eq("company_id", currentCompanyId!),
      ]);
      return {
        incidents: incidents.data ?? [],
        membersCount: members.data?.length ?? 0,
        shiftsCount: shifts.data?.length ?? 0,
        trainings: trainings.data ?? [],
      };
    },
  });

  const k = useMemo(() => {
    if (!data) return null;
    const HHT = data.shiftsCount * 8; // horas hombre trabajadas (aprox jornada=8h)
    const accidentes = data.incidents.filter(i => i.type === "accidente").length;
    const incidentes = data.incidents.filter(i => i.type === "incidente").length;
    const dias_perdidos = 0; // futuro: campo en incidents
    const frecuencia = HHT > 0 ? ((accidentes * 200000) / HHT).toFixed(2) : "0";
    const severidad = HHT > 0 ? ((dias_perdidos * 200000) / HHT).toFixed(2) : "0";
    const totalAttend = data.trainings.reduce((s: number, t: any) => s + (t.training_attendees?.filter((a: any) => a.attended).length ?? 0), 0);
    return { HHT, accidentes, incidentes, frecuencia, severidad, totalAttend, miembros: data.membersCount, jornadas: data.shiftsCount };
  }, [data]);

  if (!currentCompanyId) return <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">Selecciona empresa.</div>;
  if (!k) return <div className="text-muted-foreground">Cargando indicadores…</div>;

  const cards = [
    { l: "Trabajadores", v: k.miembros },
    { l: "Jornadas aprobadas", v: k.jornadas },
    { l: "Horas-hombre trabajadas", v: k.HHT },
    { l: "Accidentes", v: k.accidentes },
    { l: "Incidentes / casi-accidentes", v: k.incidentes },
    { l: "Asistencias a capacitación", v: k.totalAttend },
    { l: "Índice de frecuencia (AT)", v: k.frecuencia, sub: "× 200.000 HHT" },
    { l: "Índice de severidad", v: k.severidad, sub: "× 200.000 HHT" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Indicadores SST</h1>
      <p className="text-sm text-muted-foreground">Calculados automáticamente sobre los datos de la empresa.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.l} className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">{c.l}</div>
            <div className="mt-1 text-3xl font-bold">{c.v}</div>
            {c.sub && <div className="text-xs text-muted-foreground">{c.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
