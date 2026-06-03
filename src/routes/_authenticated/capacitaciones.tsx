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
import { Plus, Trash2, UserCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/capacitaciones")({
  component: TrainingsPage,
});

function TrainingsPage() {
  const { user } = useAuth();
  const { currentCompanyId, currentRole } = useCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", topic: "", trainer: "", scheduled_at: "", duration_hours: "1", notes: "" });
  const canEdit = currentRole === "admin" || currentRole === "supervisor";

  const { data } = useQuery({
    queryKey: ["trainings", currentCompanyId],
    enabled: !!currentCompanyId,
    queryFn: async () => {
      const { data, error } = await supabase.from("trainings").select("*, training_attendees(id, user_id, attended)").eq("company_id", currentCompanyId!).order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("trainings").insert({
        company_id: currentCompanyId!,
        created_by: user!.id,
        title: form.title,
        topic: form.topic || null,
        trainer: form.trainer || null,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        duration_hours: Number(form.duration_hours),
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Capacitación creada");
      setOpen(false);
      setForm({ title: "", topic: "", trainer: "", scheduled_at: "", duration_hours: "1", notes: "" });
      qc.invalidateQueries({ queryKey: ["trainings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markAttendance = useMutation({
    mutationFn: async (training_id: string) => {
      const { error } = await supabase.from("training_attendees").upsert({
        training_id,
        user_id: user!.id,
        attended: true,
        signature: user!.email ?? "firmado",
      }, { onConflict: "training_id,user_id" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Asistencia registrada"); qc.invalidateQueries({ queryKey: ["trainings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("trainings").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trainings"] }),
  });

  if (!currentCompanyId) return <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">Selecciona empresa.</div>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Capacitaciones</h1>
          <p className="text-sm text-muted-foreground">Plan anual, asistencia y evidencias.</p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Programar</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nueva capacitación</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3">
                <div><Label>Título *</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Tema</Label><Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} /></div>
                  <div><Label>Facilitador</Label><Input value={form.trainer} onChange={(e) => setForm({ ...form, trainer: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Fecha y hora *</Label><Input type="datetime-local" required value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} /></div>
                  <div><Label>Duración (h)</Label><Input type="number" step="0.5" value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: e.target.value })} /></div>
                </div>
                <div><Label>Notas</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                <Button type="submit" className="w-full" disabled={create.isPending}>Guardar</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="mt-6 grid gap-3">
        {(data ?? []).map((t: any) => {
          const myAttendance = t.training_attendees?.find((a: any) => a.user_id === user?.id);
          return (
            <div key={t.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{new Date(t.scheduled_at).toLocaleString()} · {t.duration_hours}h · {t.trainer ?? "—"}</div>
                  {t.topic && <div className="mt-1 text-sm">{t.topic}</div>}
                  <div className="mt-2 text-xs text-muted-foreground">{t.training_attendees?.filter((a: any) => a.attended).length ?? 0} asistentes</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant={myAttendance?.attended ? "secondary" : "default"} onClick={() => markAttendance.mutate(t.id)} disabled={myAttendance?.attended}>
                    <UserCheck className="mr-2 h-4 w-4" /> {myAttendance?.attended ? "Asistí" : "Firmar asistencia"}
                  </Button>
                  {canEdit && <Button variant="ghost" size="sm" onClick={() => remove.mutate(t.id)}><Trash2 className="h-4 w-4" /></Button>}
                </div>
              </div>
            </div>
          );
        })}
        {(data ?? []).length === 0 && <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">Sin capacitaciones programadas</div>}
      </div>
    </div>
  );
}
