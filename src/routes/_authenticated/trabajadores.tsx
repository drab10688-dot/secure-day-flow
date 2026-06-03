import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/trabajadores")({
  component: WorkersPage,
});

function WorkersPage() {
  const { currentCompanyId, currentRole } = useCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ userId: "", role: "worker", position: "" });

  const isAdmin = currentRole === "admin" || currentRole === "supervisor";

  const { data: workers } = useQuery({
    queryKey: ["workers", currentCompanyId],
    enabled: !!currentCompanyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_members")
        .select("id, user_id, role, position, created_at")
        .eq("company_id", currentCompanyId!);
      if (error) throw error;
      const ids = (data ?? []).map((m) => m.user_id);
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id, full_name, document_id, phone").in("id", ids)
        : { data: [] as any[] };
      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      return (data ?? []).map((m: any) => ({ ...m, profiles: profileMap.get(m.user_id) ?? null }));
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!form.userId.trim()) throw new Error("Ingresa el ID del usuario.");
      const { error } = await supabase.from("company_members").insert({
        company_id: currentCompanyId!,
        user_id: form.userId.trim(),
        role: form.role as any,
        position: form.position || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Trabajador agregado");
      setOpen(false); setForm({ userId: "", role: "worker", position: "" });
      qc.invalidateQueries({ queryKey: ["workers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("company_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Eliminado");
      qc.invalidateQueries({ queryKey: ["workers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!currentCompanyId) return <Empty />;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trabajadores</h1>
          <p className="text-sm text-muted-foreground">Personas vinculadas a la empresa actual.</p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><UserPlus className="mr-2 h-4 w-4" /> Agregar trabajador</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar trabajador</DialogTitle>
                <DialogDescription>
                  La persona debe haber creado su cuenta. Pide su ID de usuario (UUID) — visible en su perfil.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="space-y-3">
                <div><Label>User ID (UUID)</Label>
                  <Input required value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} placeholder="00000000-0000-..." />
                </div>
                <div><Label>Cargo</Label>
                  <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
                </div>
                <div><Label>Rol</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="worker">Trabajador</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={add.isPending}>Agregar</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-secondary-foreground">
            <tr>
              <th className="px-4 py-2 text-left">Nombre</th>
              <th className="px-4 py-2 text-left">Cargo</th>
              <th className="px-4 py-2 text-left">Rol</th>
              <th className="px-4 py-2 text-left">User ID</th>
              {isAdmin && <th className="px-4 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {(workers ?? []).map((w: any) => (
              <tr key={w.id} className="border-t border-border">
                <td className="px-4 py-2">{w.profiles?.full_name ?? "—"}</td>
                <td className="px-4 py-2">{w.position ?? "—"}</td>
                <td className="px-4 py-2 capitalize">{w.role}</td>
                <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{w.user_id.slice(0, 8)}…</td>
                {isAdmin && (
                  <td className="px-4 py-2 text-right">
                    <Button variant="ghost" size="sm" onClick={() => remove.mutate(w.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
            {(workers ?? []).length === 0 && (
              <tr><td colSpan={isAdmin ? 5 : 4} className="px-4 py-10 text-center text-muted-foreground">Sin trabajadores</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Empty() {
  return <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">Selecciona una empresa.</div>;
}
