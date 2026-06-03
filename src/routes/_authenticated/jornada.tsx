import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompany";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/jornada")({
  component: ShiftPage,
});

const EPP = [
  "Casco de seguridad",
  "Gafas / careta",
  "Protección auditiva",
  "Guantes",
  "Calzado de seguridad",
  "Uniforme / ropa de trabajo",
  "Arnés (si aplica)",
];

function ShiftPage() {
  const { user } = useAuth();
  const { currentCompanyId } = useCompany();
  const qc = useQueryClient();

  const [epp, setEpp] = useState<Record<string, boolean>>({});
  const [healthOk, setHealthOk] = useState(true);
  const [conditionsOk, setConditionsOk] = useState(true);
  const [notes, setNotes] = useState("");
  const [signature, setSignature] = useState("");

  const { data: today } = useQuery({
    queryKey: ["myShiftToday", currentCompanyId, user?.id],
    enabled: !!currentCompanyId && !!user,
    queryFn: async () => {
      const start = new Date(); start.setHours(0,0,0,0);
      const { data } = await supabase
        .from("shift_approvals")
        .select("*")
        .eq("company_id", currentCompanyId!)
        .eq("user_id", user!.id)
        .gte("started_at", start.toISOString())
        .order("started_at", { ascending: false })
        .limit(1);
      return data?.[0] ?? null;
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["shifts", currentCompanyId],
    enabled: !!currentCompanyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("shift_approvals")
        .select("id, started_at, user_id, health_ok, conditions_ok, signature, notes")
        .eq("company_id", currentCompanyId!)
        .order("started_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const approve = useMutation({
    mutationFn: async () => {
      if (!signature.trim()) throw new Error("Firma tu nombre completo para aprobar.");
      const { error } = await supabase.from("shift_approvals").insert({
        company_id: currentCompanyId!,
        user_id: user!.id,
        epp_checklist: epp,
        health_ok: healthOk,
        conditions_ok: conditionsOk,
        notes: notes || null,
        signature,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Jornada aprobada e iniciada");
      setNotes(""); setSignature(""); setEpp({});
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!currentCompanyId) {
    return <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Selecciona una empresa.</div>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-xl border border-border bg-card p-6">
        <h1 className="text-xl font-bold">Aprobar inicio de jornada</h1>
        <p className="text-sm text-muted-foreground">Confirma tus EPP y estado de salud para registrar tu entrada.</p>

        {today ? (
          <div className="mt-6 rounded-lg border border-success bg-success/10 p-4 text-success-foreground">
            <div className="flex items-center gap-2 font-medium text-success">
              <CheckCircle2 className="h-5 w-5" />
              Ya aprobaste tu jornada hoy
            </div>
            <p className="mt-1 text-sm text-foreground">
              Registrada a las {new Date(today.started_at).toLocaleTimeString()}.
            </p>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); approve.mutate(); }} className="mt-6 space-y-5">
            <div>
              <Label className="mb-2 block">Elementos de protección personal (EPP)</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {EPP.map((item) => (
                  <label key={item} className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm">
                    <Checkbox checked={!!epp[item]} onCheckedChange={(v) => setEpp({ ...epp, [item]: !!v })} />
                    {item}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
                <Checkbox checked={healthOk} onCheckedChange={(v) => setHealthOk(!!v)} />
                Me encuentro en buen estado de salud
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
                <Checkbox checked={conditionsOk} onCheckedChange={(v) => setConditionsOk(!!v)} />
                Las condiciones del área son seguras
              </label>
            </div>

            <div>
              <Label>Observaciones (opcional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="¿Algo que reportar?" />
            </div>

            <div>
              <Label>Firma (nombre completo) *</Label>
              <Input required value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Tu nombre completo" />
            </div>

            <Button type="submit" className="w-full" disabled={approve.isPending}>
              {approve.isPending ? "Registrando..." : "Aprobar y comenzar jornada"}
            </Button>
          </form>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> Últimas jornadas</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {(recent ?? []).map((s) => (
            <li key={s.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{s.signature}</span>
                <span className="text-xs text-muted-foreground">{new Date(s.started_at).toLocaleString()}</span>
              </div>
              <div className="mt-1 flex gap-2 text-xs">
                <span className={`rounded-full px-2 py-0.5 ${s.health_ok ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                  Salud {s.health_ok ? "OK" : "alerta"}
                </span>
                <span className={`rounded-full px-2 py-0.5 ${s.conditions_ok ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                  Área {s.conditions_ok ? "OK" : "alerta"}
                </span>
              </div>
              {s.notes && <p className="mt-1 text-xs text-muted-foreground">{s.notes}</p>}
            </li>
          ))}
          {(recent ?? []).length === 0 && <li className="text-center text-muted-foreground py-6">Sin registros aún</li>}
        </ul>
      </section>
    </div>
  );
}
