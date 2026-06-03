import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompany";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/examenes")({
  component: ExamsPage,
});

const TYPES = [
  { v: "ingreso", l: "Ingreso" },
  { v: "periodico", l: "Periódico" },
  { v: "egreso", l: "Egreso" },
  { v: "reintegro", l: "Reintegro" },
  { v: "post_incapacidad", l: "Post-incapacidad" },
];

function ExamsPage() {
  const { user } = useAuth();
  const { currentCompanyId, currentRole } = useCompany();
  const qc = useQueryClient();
  const canEdit = currentRole === "admin" || currentRole === "supervisor";
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ user_id: "", type: "ingreso", performed_at: "", expires_at: "", provider: "", restrictions: "", result: "" });

  const { data } = useQuery({
    queryKey: ["medical_exams", currentCompanyId],
    enabled: !!currentCompanyId,
    queryFn: async () => {
      const { data, error } = await supabase.from("medical_exams").select("*, profiles:user_id(full_name)").eq("company_id", currentCompanyId!).order("performed_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: members } = useQuery({
    queryKey: ["company_members_list", currentCompanyId],
    enabled: !!currentCompanyId && canEdit,
    queryFn: async () => {
      const { data, error } = await supabase.from("company_members").select("user_id, profiles:user_id(full_name)").eq("company_id", currentCompanyId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("medical_exams").insert({
        company_id: currentCompanyId!,
        user_id: form.user_id,
        type: form.type as any,
        performed_at: form.performed_at,
        expires_at: form.expires_at || null,
        provider: form.provider || null,
        restrictions: form.restrictions || null,
        result: form.result || null,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Examen registrado"); setOpen(false); setForm({ user_id: "", type: "ingreso", performed_at: "", expires_at: "", provider: "", restrictions: "", result: "" }); qc.invalidateQueries({ queryKey: ["medical_exams"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!currentCompanyId) return <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">Selecciona empresa.</div>;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Exámenes médicos ocupacionales</h1>
          <p className="text-sm text-muted-foreground">Ingreso, periódicos, egreso y restricciones.</p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Registrar examen</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nuevo examen ocupacional</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3">
                <div><Label>Trabajador *</Label>
                  <Select value={form.user_id} onValueChange={(v) => setForm({ ...form, user_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                    <SelectContent>{(members ?? []).map((m: any) => <SelectItem key={m.user_id} value={m.user_id}>{m.profiles?.full_name ?? m.user_id.slice(0,8)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Tipo *</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TYPES.map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Proveedor / IPS</Label><Input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Fecha *</Label><Input type="date" required value={form.performed_at} onChange={(e) => setForm({ ...form, performed_at: e.target.value })} /></div>
                  <div><Label>Vence</Label><Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></div>
                </div>
                <div><Label>Restricciones / recomendaciones</Label><Textarea value={form.restrictions} onChange={(e) => setForm({ ...form, restrictions: e.target.value })} /></div>
                <div><Label>Resultado / concepto</Label><Input value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} /></div>
                <Button type="submit" className="w-full">Guardar</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-secondary-foreground"><tr><th className="px-4 py-2 text-left">Trabajador</th><th className="px-4 py-2 text-left">Tipo</th><th className="px-4 py-2 text-left">Fecha</th><th className="px-4 py-2 text-left">Vence</th><th className="px-4 py-2 text-left">Proveedor</th><th className="px-4 py-2 text-left">Restricciones</th></tr></thead>
          <tbody>
            {(data ?? []).map((e: any) => {
              const expired = e.expires_at && e.expires_at < today;
              const soon = e.expires_at && !expired && e.expires_at < new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
              return (
                <tr key={e.id} className="border-t border-border">
                  <td className="px-4 py-2">{e.profiles?.full_name ?? e.user_id.slice(0, 8)}</td>
                  <td className="px-4 py-2 capitalize">{e.type.replace("_", " ")}</td>
                  <td className="px-4 py-2">{e.performed_at}</td>
                  <td className={`px-4 py-2 ${expired ? "text-destructive font-semibold" : soon ? "text-warning-foreground" : ""}`}>{e.expires_at ?? "—"}{expired && " (vencido)"}</td>
                  <td className="px-4 py-2">{e.provider ?? "—"}</td>
                  <td className="px-4 py-2 max-w-xs">{e.restrictions ?? "—"}</td>
                </tr>
              );
            })}
            {(data ?? []).length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Sin exámenes registrados</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
