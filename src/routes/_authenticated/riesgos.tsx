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
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/riesgos")({
  component: RiskPage,
});

const RISK_COLOR: Record<string, string> = {
  baja: "bg-success/15 text-success",
  media: "bg-warning/20 text-warning-foreground",
  alta: "bg-destructive/15 text-destructive",
  critica: "bg-destructive text-destructive-foreground",
};

function RiskPage() {
  const { user } = useAuth();
  const { currentCompanyId, currentRole } = useCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ process: "", activity: "", hazard: "", risk_level: "media", controls: "", responsible: "" });

  const isAdmin = currentRole === "admin" || currentRole === "supervisor";

  const { data } = useQuery({
    queryKey: ["risks", currentCompanyId],
    enabled: !!currentCompanyId,
    queryFn: async () => {
      const { data, error } = await supabase.from("risk_matrix").select("*").eq("company_id", currentCompanyId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("risk_matrix").insert({
        company_id: currentCompanyId!,
        created_by: user!.id,
        process: form.process,
        activity: form.activity,
        hazard: form.hazard,
        risk_level: form.risk_level as any,
        controls: form.controls || null,
        responsible: form.responsible || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Riesgo registrado");
      setOpen(false);
      setForm({ process: "", activity: "", hazard: "", risk_level: "media", controls: "", responsible: "" });
      qc.invalidateQueries({ queryKey: ["risks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("risk_matrix").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["risks"] }),
  });

  if (!currentCompanyId) return <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">Selecciona empresa.</div>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Matriz de riesgos</h1>
          <p className="text-sm text-muted-foreground">Identifica peligros y registra controles.</p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nuevo riesgo</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Identificar riesgo</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Proceso *</Label><Input required value={form.process} onChange={(e) => setForm({ ...form, process: e.target.value })} /></div>
                  <div><Label>Actividad *</Label><Input required value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value })} /></div>
                </div>
                <div><Label>Peligro / amenaza *</Label><Input required value={form.hazard} onChange={(e) => setForm({ ...form, hazard: e.target.value })} /></div>
                <div><Label>Nivel de riesgo</Label>
                  <Select value={form.risk_level} onValueChange={(v) => setForm({ ...form, risk_level: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baja">Baja</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="critica">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Controles</Label><Textarea value={form.controls} onChange={(e) => setForm({ ...form, controls: e.target.value })} /></div>
                <div><Label>Responsable</Label><Input value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} /></div>
                <Button type="submit" className="w-full" disabled={create.isPending}>Guardar</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-secondary-foreground">
            <tr>
              <th className="px-4 py-2 text-left">Proceso</th>
              <th className="px-4 py-2 text-left">Actividad</th>
              <th className="px-4 py-2 text-left">Peligro</th>
              <th className="px-4 py-2 text-left">Nivel</th>
              <th className="px-4 py-2 text-left">Controles</th>
              <th className="px-4 py-2 text-left">Responsable</th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((r: any) => (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="px-4 py-2">{r.process}</td>
                <td className="px-4 py-2">{r.activity}</td>
                <td className="px-4 py-2">{r.hazard}</td>
                <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-xs capitalize ${RISK_COLOR[r.risk_level]}`}>{r.risk_level}</span></td>
                <td className="px-4 py-2 max-w-xs">{r.controls ?? "—"}</td>
                <td className="px-4 py-2">{r.responsible ?? "—"}</td>
                {isAdmin && <td className="px-4 py-2 text-right"><Button variant="ghost" size="sm" onClick={() => remove.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button></td>}
              </tr>
            ))}
            {(data ?? []).length === 0 && <tr><td colSpan={isAdmin ? 7 : 6} className="px-4 py-10 text-center text-muted-foreground">Sin riesgos identificados</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
