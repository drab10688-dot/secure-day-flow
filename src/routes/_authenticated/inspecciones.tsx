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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/inspecciones")({
  component: InspectionsPage,
});

function InspectionsPage() {
  const { user } = useAuth();
  const { currentCompanyId, currentRole } = useCompany();
  const qc = useQueryClient();
  const canEdit = currentRole === "admin" || currentRole === "supervisor";
  const [open, setOpen] = useState(false);
  const [findingFor, setFindingFor] = useState<string | null>(null);
  const [form, setForm] = useState({ area: "", inspection_type: "", scheduled_at: "", observations: "" });
  const [findingForm, setFindingForm] = useState({ description: "", severity: "media", action_plan: "", responsible: "", due_date: "" });

  const { data } = useQuery({
    queryKey: ["inspections", currentCompanyId],
    enabled: !!currentCompanyId,
    queryFn: async () => {
      const { data, error } = await supabase.from("inspections").select("*, inspection_findings(id, description, severity, status, action_plan, responsible, due_date)").eq("company_id", currentCompanyId!).order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("inspections").insert({
        company_id: currentCompanyId!,
        created_by: user!.id,
        area: form.area,
        inspection_type: form.inspection_type,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        observations: form.observations || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Inspección creada"); setOpen(false); setForm({ area: "", inspection_type: "", scheduled_at: "", observations: "" }); qc.invalidateQueries({ queryKey: ["inspections"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const addFinding = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("inspection_findings").insert({
        inspection_id: findingFor!,
        description: findingForm.description,
        severity: findingForm.severity as any,
        action_plan: findingForm.action_plan || null,
        responsible: findingForm.responsible || null,
        due_date: findingForm.due_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Hallazgo agregado"); setFindingFor(null); setFindingForm({ description: "", severity: "media", action_plan: "", responsible: "", due_date: "" }); qc.invalidateQueries({ queryKey: ["inspections"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!currentCompanyId) return <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">Selecciona empresa.</div>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inspecciones de seguridad</h1>
          <p className="text-sm text-muted-foreground">Extintores, botiquines, herramientas, áreas y planes de acción.</p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Nueva inspección</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Programar inspección</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Área *</Label><Input required value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} /></div>
                  <div><Label>Tipo *</Label><Input required placeholder="Extintores, EPP, orden y aseo…" value={form.inspection_type} onChange={(e) => setForm({ ...form, inspection_type: e.target.value })} /></div>
                </div>
                <div><Label>Fecha *</Label><Input type="datetime-local" required value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} /></div>
                <div><Label>Observaciones</Label><Textarea value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} /></div>
                <Button type="submit" className="w-full">Guardar</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="mt-6 grid gap-3">
        {(data ?? []).map((i: any) => (
          <div key={i.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold">{i.area} · {i.inspection_type}</div>
                <div className="text-xs text-muted-foreground">{new Date(i.scheduled_at).toLocaleString()} · {i.status}</div>
              </div>
              {canEdit && <Button size="sm" variant="outline" onClick={() => setFindingFor(i.id)}>Agregar hallazgo</Button>}
            </div>
            <div className="mt-3 space-y-1">
              {(i.inspection_findings ?? []).map((f: any) => (
                <div key={f.id} className="rounded border border-border bg-background p-3 text-sm">
                  <div className="flex justify-between"><span className="font-medium">{f.description}</span><span className="text-xs uppercase">{f.severity} · {f.status}</span></div>
                  {f.action_plan && <div className="text-xs"><b>Acción:</b> {f.action_plan} · <b>Resp:</b> {f.responsible ?? "—"} · <b>Vence:</b> {f.due_date ?? "—"}</div>}
                </div>
              ))}
              {(i.inspection_findings ?? []).length === 0 && <div className="text-xs text-muted-foreground">Sin hallazgos.</div>}
            </div>
          </div>
        ))}
        {(data ?? []).length === 0 && <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">Sin inspecciones</div>}
      </div>

      <Dialog open={!!findingFor} onOpenChange={(o) => !o && setFindingFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo hallazgo</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); addFinding.mutate(); }} className="space-y-3">
            <div><Label>Descripción *</Label><Textarea required value={findingForm.description} onChange={(e) => setFindingForm({ ...findingForm, description: e.target.value })} /></div>
            <div><Label>Severidad</Label>
              <Select value={findingForm.severity} onValueChange={(v) => setFindingForm({ ...findingForm, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baja">Baja</SelectItem><SelectItem value="media">Media</SelectItem><SelectItem value="alta">Alta</SelectItem><SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Plan de acción</Label><Textarea value={findingForm.action_plan} onChange={(e) => setFindingForm({ ...findingForm, action_plan: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Responsable</Label><Input value={findingForm.responsible} onChange={(e) => setFindingForm({ ...findingForm, responsible: e.target.value })} /></div>
              <div><Label>Vence</Label><Input type="date" value={findingForm.due_date} onChange={(e) => setFindingForm({ ...findingForm, due_date: e.target.value })} /></div>
            </div>
            <Button type="submit" className="w-full">Guardar</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
