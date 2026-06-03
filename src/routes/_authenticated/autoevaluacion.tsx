import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompany";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/autoevaluacion")({
  component: AutoevalPage,
});

const CYCLES = ["planear", "hacer", "verificar", "actuar"] as const;
const STATUSES = [
  { v: "no_evaluado", l: "Sin evaluar" },
  { v: "cumple", l: "Cumple" },
  { v: "no_cumple", l: "No cumple" },
  { v: "no_aplica", l: "No aplica" },
] as const;

function AutoevalPage() {
  const { user } = useAuth();
  const { currentCompanyId, currentRole } = useCompany();
  const qc = useQueryClient();
  const canEdit = currentRole === "admin" || currentRole === "supervisor";

  const { data: standards } = useQuery({
    queryKey: ["autoeval_standards"],
    queryFn: async () => {
      const { data, error } = await supabase.from("autoeval_standards").select("*").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: responses } = useQuery({
    queryKey: ["autoeval_responses", currentCompanyId],
    enabled: !!currentCompanyId,
    queryFn: async () => {
      const { data, error } = await supabase.from("autoeval_responses").select("*").eq("company_id", currentCompanyId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const upsert = useMutation({
    mutationFn: async (p: { standard_id: string; status: string }) => {
      const { error } = await supabase.from("autoeval_responses").upsert({
        company_id: currentCompanyId!,
        standard_id: p.standard_id,
        status: p.status as any,
        updated_by: user!.id,
      }, { onConflict: "company_id,standard_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["autoeval_responses"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const responseMap = useMemo(() => {
    const m = new Map<string, string>();
    (responses ?? []).forEach((r: any) => m.set(r.standard_id, r.status));
    return m;
  }, [responses]);

  const stats = useMemo(() => {
    const byCycle: Record<string, { earned: number; total: number }> = {};
    let earned = 0, total = 0;
    (standards ?? []).forEach((s: any) => {
      const status = responseMap.get(s.id) ?? "no_evaluado";
      if (status === "no_aplica") return;
      byCycle[s.cycle] ??= { earned: 0, total: 0 };
      byCycle[s.cycle].total += Number(s.weight);
      total += Number(s.weight);
      if (status === "cumple") {
        byCycle[s.cycle].earned += Number(s.weight);
        earned += Number(s.weight);
      }
    });
    return { byCycle, earned, total };
  }, [standards, responseMap]);

  if (!currentCompanyId) return <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">Selecciona empresa.</div>;

  const pct = stats.total ? Math.round((stats.earned / stats.total) * 100) : 0;
  const grade = pct >= 86 ? { l: "Aceptable", c: "text-success" } : pct >= 61 ? { l: "Moderadamente aceptable", c: "text-warning-foreground" } : { l: "Crítico", c: "text-destructive" };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Autoevaluación SG-SST (Res. 0312/2019)</h1>
        <p className="text-sm text-muted-foreground">60 estándares mínimos · ciclo PHVA</p>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground">Cumplimiento total</div>
          <div className={`mt-1 text-3xl font-bold ${grade.c}`}>{pct}%</div>
          <div className={`text-xs ${grade.c}`}>{grade.l}</div>
        </div>
        {CYCLES.map((c) => {
          const s = stats.byCycle[c] ?? { earned: 0, total: 0 };
          const p = s.total ? Math.round((s.earned / s.total) * 100) : 0;
          return (
            <div key={c} className="rounded-xl border border-border bg-card p-4">
              <div className="text-xs uppercase text-muted-foreground">{c}</div>
              <div className="mt-1 text-2xl font-semibold">{p}%</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded bg-muted">
                <div className="h-full bg-primary" style={{ width: `${p}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {CYCLES.map((cycle) => (
        <div key={cycle} className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border bg-secondary px-4 py-2 text-sm font-semibold uppercase text-secondary-foreground">{cycle}</div>
          <table className="w-full text-sm">
            <tbody>
              {(standards ?? []).filter((s: any) => s.cycle === cycle).map((s: any) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground w-20">{s.code}</td>
                  <td className="px-4 py-2">{s.item}</td>
                  <td className="px-4 py-2 w-16 text-right text-xs text-muted-foreground">{s.weight}</td>
                  <td className="px-4 py-2 w-48">
                    <Select
                      value={responseMap.get(s.id) ?? "no_evaluado"}
                      disabled={!canEdit}
                      onValueChange={(v) => upsert.mutate({ standard_id: s.id, status: v })}
                    >
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((st) => <SelectItem key={st.v} value={st.v}>{st.l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
