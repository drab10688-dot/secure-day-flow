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
import { Plus, FileText, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/documentos")({
  component: DocsPage,
});

function DocsPage() {
  const { user } = useAuth();
  const { currentCompanyId, currentRole } = useCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", category: "", description: "", url: "" });

  const isAdmin = currentRole === "admin" || currentRole === "supervisor";

  const { data } = useQuery({
    queryKey: ["documents", currentCompanyId],
    enabled: !!currentCompanyId,
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*").eq("company_id", currentCompanyId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("documents").insert({
        company_id: currentCompanyId!,
        uploaded_by: user!.id,
        title: form.title,
        category: form.category || null,
        description: form.description || null,
        url: form.url || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Documento agregado");
      setOpen(false);
      setForm({ title: "", category: "", description: "", url: "" });
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });

  if (!currentCompanyId) return <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">Selecciona empresa.</div>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documentos</h1>
          <p className="text-sm text-muted-foreground">Políticas, manuales y registros del SG-SST.</p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Agregar</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Agregar documento</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3">
                <div><Label>Título *</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>Categoría</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Política, Manual, Acta..." /></div>
                <div><Label>Descripción</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div><Label>Enlace al archivo (URL)</Label><Input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." /></div>
                <Button type="submit" className="w-full" disabled={create.isPending}>Guardar</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((d: any) => (
          <div key={d.id} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-primary">
                <FileText className="h-5 w-5" />
              </div>
              {isAdmin && <Button variant="ghost" size="sm" onClick={() => remove.mutate(d.id)}><Trash2 className="h-4 w-4" /></Button>}
            </div>
            <h3 className="mt-3 font-semibold">{d.title}</h3>
            {d.category && <p className="text-xs text-muted-foreground">{d.category}</p>}
            {d.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{d.description}</p>}
            {d.url && (
              <a href={d.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm text-primary">
                Abrir <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        ))}
        {(data ?? []).length === 0 && <div className="col-span-full rounded-xl border border-dashed p-10 text-center text-muted-foreground">Sin documentos</div>}
      </div>
    </div>
  );
}
