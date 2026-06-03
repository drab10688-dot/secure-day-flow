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

export const Route = createFileRoute("/_authenticated/comites")({
  component: CommitteesPage,
});

const TYPES = [
  { v: "copasst", l: "COPASST" },
  { v: "convivencia", l: "Convivencia laboral" },
  { v: "brigada", l: "Brigada de emergencia" },
];

function CommitteesPage() {
  const { user } = useAuth();
  const { currentCompanyId, currentRole } = useCompany();
  const qc = useQueryClient();
  const canEdit = currentRole === "admin" || currentRole === "supervisor";
  const [open, setOpen] = useState(false);
  const [meetingFor, setMeetingFor] = useState<string | null>(null);
  const [form, setForm] = useState({ type: "copasst", name: "", period_start: "", period_end: "" });
  const [meetingForm, setMeetingForm] = useState({ held_at: "", topics: "", decisions: "" });

  const { data } = useQuery({
    queryKey: ["committees", currentCompanyId],
    enabled: !!currentCompanyId,
    queryFn: async () => {
      const { data, error } = await supabase.from("committees").select("*, committee_meetings(id, held_at, topics, decisions)").eq("company_id", currentCompanyId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("committees").insert({
        company_id: currentCompanyId!,
        type: form.type as any,
        name: form.name,
        period_start: form.period_start || null,
        period_end: form.period_end || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Comité creado"); setOpen(false); setForm({ type: "copasst", name: "", period_start: "", period_end: "" }); qc.invalidateQueries({ queryKey: ["committees"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const addMeeting = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("committee_meetings").insert({
        committee_id: meetingFor!,
        held_at: new Date(meetingForm.held_at).toISOString(),
        topics: meetingForm.topics || null,
        decisions: meetingForm.decisions || null,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Acta registrada"); setMeetingFor(null); setMeetingForm({ held_at: "", topics: "", decisions: "" }); qc.invalidateQueries({ queryKey: ["committees"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!currentCompanyId) return <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">Selecciona empresa.</div>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Comités</h1>
          <p className="text-sm text-muted-foreground">COPASST, Convivencia y Brigadas con actas de reunión.</p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Nuevo comité</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Crear comité</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3">
                <div><Label>Tipo *</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPES.map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Nombre *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Vigencia desde</Label><Input type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} /></div>
                  <div><Label>Hasta</Label><Input type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} /></div>
                </div>
                <Button type="submit" className="w-full">Guardar</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="mt-6 grid gap-3">
        {(data ?? []).map((c: any) => (
          <div key={c.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs uppercase text-secondary-foreground">{c.type}</span>
                <div className="mt-1 text-lg font-semibold">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.period_start ?? "—"} → {c.period_end ?? "—"}</div>
              </div>
              {canEdit && <Button size="sm" variant="outline" onClick={() => setMeetingFor(c.id)}>Nueva acta</Button>}
            </div>
            <div className="mt-3 space-y-1">
              {(c.committee_meetings ?? []).slice().sort((a: any, b: any) => b.held_at.localeCompare(a.held_at)).map((m: any) => (
                <div key={m.id} className="rounded border border-border bg-background p-3 text-sm">
                  <div className="text-xs text-muted-foreground">{new Date(m.held_at).toLocaleString()}</div>
                  {m.topics && <div className="mt-1"><b>Temas:</b> {m.topics}</div>}
                  {m.decisions && <div><b>Decisiones:</b> {m.decisions}</div>}
                </div>
              ))}
              {(c.committee_meetings ?? []).length === 0 && <div className="text-xs text-muted-foreground">Sin actas registradas.</div>}
            </div>
          </div>
        ))}
        {(data ?? []).length === 0 && <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">Sin comités conformados</div>}
      </div>

      <Dialog open={!!meetingFor} onOpenChange={(o) => !o && setMeetingFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva acta de reunión</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); addMeeting.mutate(); }} className="space-y-3">
            <div><Label>Fecha y hora *</Label><Input type="datetime-local" required value={meetingForm.held_at} onChange={(e) => setMeetingForm({ ...meetingForm, held_at: e.target.value })} /></div>
            <div><Label>Temas tratados</Label><Textarea value={meetingForm.topics} onChange={(e) => setMeetingForm({ ...meetingForm, topics: e.target.value })} /></div>
            <div><Label>Decisiones / compromisos</Label><Textarea value={meetingForm.decisions} onChange={(e) => setMeetingForm({ ...meetingForm, decisions: e.target.value })} /></div>
            <Button type="submit" className="w-full">Guardar acta</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
