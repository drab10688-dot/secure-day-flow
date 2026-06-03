import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompany";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/emergencias")({
  component: DrillsPage,
});

function DrillsPage() {
  const { user } = useAuth();
  const { currentCompanyId, currentRole } = useCompany();
  const qc = useQueryClient();
  const canEdit = currentRole === "admin" || currentRole === "supervisor";
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ scenario: "", scheduled_at: "", conducted_at: "", participants: "", evacuation_time_sec: "", observations: "", improvements: "" });

  const { data } = useQuery({
    queryKey: ["drills", currentCompanyId],
    enabled: !!currentCompanyId,
    queryFn: async () => {
      const { data, error } = await supabase.from("drills").select("*").eq("company_id", currentCompanyId!).order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("drills").insert({
        company_id: currentCompanyId!,
        created_by: user!.id,
        scenario: form.scenario,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        conducted_at: form.conducted_at ? new Date(form.conducted_at).toISOString() : null,
        participants: form.participants ? Number(form.participants) : null,
        evacuation_time_sec: form.evacuation_time_sec ? Number(form.evacuation_time_sec) : null,
        observations: form.observations || null,
        improvements: form.improvements || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Simulacro registrado"); setOpen(false); setForm({ scenario: "", scheduled_at: "", conducted_at: "", participants: "", evacuation_time_sec: "", observations: "", improvements: "" }); qc.invalidateQueries({ queryKey: ["drills"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!currentCompanyId) return <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">Selecciona empresa.</div>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Plan de emergencias y simulacros</h1>
          <p className="text-sm text-muted-foreground">Cronograma, ejecución y mejoras.</p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Programar simulacro</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nuevo simulacro</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3">
                <div><Label>Escenario *</Label><Input required placeholder="Sismo, incendio, evacuación…" value={form.scenario} onChange={(e) => setForm({ ...form, scenario: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Programado *</Label><Input type="datetime-local" required value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} /></div>
                  <div><Label>Realizado</Label><Input type="datetime-local" value={form.conducted_at} onChange={(e) => setForm({ ...form, conducted_at: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Participantes</Label><Input type="number" value={form.participants} onChange={(e) => setForm({ ...form, participants: e.target.value })} /></div>
                  <div><Label>Tiempo evacuación (s)</Label><Input type="number" value={form.evacuation_time_sec} onChange={(e) => setForm({ ...form, evacuation_time_sec: e.target.value })} /></div>
                </div>
                <div><Label>Observaciones</Label><Textarea value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} /></div>
                <div><Label>Acciones de mejora</Label><Textarea value={form.improvements} onChange={(e) => setForm({ ...form, improvements: e.target.value })} /></div>
                <Button type="submit" className="w-full">Guardar</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="mt-6 grid gap-3">
        {(data ?? []).map((d: any) => (
          <div key={d.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold">{d.scenario}</div>
                <div className="text-xs text-muted-foreground">Programado: {new Date(d.scheduled_at).toLocaleString()}{d.conducted_at && ` · Realizado: ${new Date(d.conducted_at).toLocaleString()}`}</div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs ${d.conducted_at ? "bg-success/15 text-success" : "bg-warning/20 text-warning-foreground"}`}>{d.conducted_at ? "Ejecutado" : "Pendiente"}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div><span className="text-muted-foreground">Participantes:</span> {d.participants ?? "—"}</div>
              <div><span className="text-muted-foreground">Tiempo:</span> {d.evacuation_time_sec ? `${d.evacuation_time_sec}s` : "—"}</div>
            </div>
            {d.observations && <div className="mt-2 text-sm"><b>Observaciones:</b> {d.observations}</div>}
            {d.improvements && <div className="text-sm"><b>Mejoras:</b> {d.improvements}</div>}
          </div>
        ))}
        {(data ?? []).length === 0 && <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">Sin simulacros</div>}
      </div>
    </div>
  );
}
