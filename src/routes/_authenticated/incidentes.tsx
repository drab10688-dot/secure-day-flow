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
import { Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/incidentes")({
  component: IncidentsPage,
});

const SEV_COLORS: Record<string, string> = {
  baja: "bg-success/15 text-success",
  media: "bg-warning/20 text-warning-foreground",
  alta: "bg-destructive/15 text-destructive",
  critica: "bg-destructive text-destructive-foreground",
};

function IncidentsPage() {
  const { user } = useAuth();
  const { currentCompanyId, currentRole } = useCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    type: "incidente", severity: "baja", location: "", description: "", immediate_actions: "",
  });

  const { data } = useQuery({
    queryKey: ["incidents", currentCompanyId],
    enabled: !!currentCompanyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incidents").select("*")
        .eq("company_id", currentCompanyId!)
        .order("occurred_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("incidents").insert({
        company_id: currentCompanyId!,
        reported_by: user!.id,
        type: form.type as any,
        severity: form.severity as any,
        location: form.location || null,
        description: form.description,
        immediate_actions: form.immediate_actions || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Incidente reportado");
      setOpen(false);
      setForm({ type: "incidente", severity: "baja", location: "", description: "", immediate_actions: "" });
      qc.invalidateQueries({ queryKey: ["incidents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("incidents").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["incidents"] }),
  });

  if (!currentCompanyId) return <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">Selecciona empresa.</div>;

  const isAdmin = currentRole === "admin" || currentRole === "supervisor";

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Incidentes y accidentes</h1>
          <p className="text-sm text-muted-foreground">Reporta y da seguimiento a eventos de seguridad.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Reportar</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Reportar evento</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Tipo</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="incidente">Incidente</SelectItem>
                      <SelectItem value="accidente">Accidente</SelectItem>
                      <SelectItem value="casi_accidente">Casi accidente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Severidad</Label>
                  <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baja">Baja</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="critica">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Lugar</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              <div><Label>Descripción *</Label><Textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>Acciones inmediatas</Label><Textarea value={form.immediate_actions} onChange={(e) => setForm({ ...form, immediate_actions: e.target.value })} /></div>
              <Button type="submit" className="w-full" disabled={create.isPending}>Guardar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 space-y-3">
        {(data ?? []).map((i: any) => (
          <div key={i.id} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-primary">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold capitalize">{i.type.replace("_", " ")}</h3>
                  <p className="text-xs text-muted-foreground">{new Date(i.occurred_at).toLocaleString()} · {i.location ?? "Sin lugar"}</p>
                </div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${SEV_COLORS[i.severity]}`}>{i.severity}</span>
            </div>
            <p className="mt-3 text-sm">{i.description}</p>
            {i.immediate_actions && <p className="mt-2 text-sm text-muted-foreground"><strong>Acciones:</strong> {i.immediate_actions}</p>}
            <div className="mt-3 flex items-center justify-between">
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize">{i.status.replace("_", " ")}</span>
              {isAdmin && (
                <Select value={i.status} onValueChange={(v) => updateStatus.mutate({ id: i.id, status: v })}>
                  <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="abierto">Abierto</SelectItem>
                    <SelectItem value="en_revision">En revisión</SelectItem>
                    <SelectItem value="cerrado">Cerrado</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        ))}
        {(data ?? []).length === 0 && <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">Sin eventos reportados</div>}
      </div>
    </div>
  );
}
