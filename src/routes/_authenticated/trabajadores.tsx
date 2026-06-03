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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/trabajadores")({
  component: WorkersPage,
});

function WorkersPage() {
  const { user } = useAuth();
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
        .select("id, user_id, role, position, status, created_at")
        .eq("company_id", currentCompanyId!)
        .order("status", { ascending: true });
      if (error) throw error;
      const ids = (data ?? []).map((m: any) => m.user_id);
      const [{ data: profiles }, { data: supers }] = await Promise.all([
        ids.length
          ? supabase.from("profiles").select("id, full_name, document_id, phone").in("id", ids)
          : Promise.resolve({ data: [] as any[] }),
        ids.length
          ? supabase.from("super_admins" as any).select("user_id").in("user_id", ids)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      const superSet = new Set((supers ?? []).map((s: any) => s.user_id));
      return (data ?? [])
        .filter((m: any) => !superSet.has(m.user_id))
        .map((m: any) => ({ ...m, profiles: profileMap.get(m.user_id) ?? null }));
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
        status: "pendiente" as any,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitud creada — pendiente de aprobación");
      setOpen(false); setForm({ userId: "", role: "worker", position: "" });
      qc.invalidateQueries({ queryKey: ["workers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "aprobado" | "rechazado" }) => {
      const { error } = await supabase
        .from("company_members")
        .update({
          status: status as any,
          approved_at: new Date().toISOString(),
          approved_by: user?.id ?? null,
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.status === "aprobado" ? "Trabajador aprobado" : "Solicitud rechazada");
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

  const pending = (workers ?? []).filter((w: any) => w.status === "pendiente");
  const approved = (workers ?? []).filter((w: any) => w.status === "aprobado");
  const rejected = (workers ?? []).filter((w: any) => w.status === "rechazado");

  const statusBadge = (s: string) => {
    const cls = s === "aprobado"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
      : s === "pendiente"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
      : "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300";
    return <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${cls}`}>{s}</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trabajadores</h1>
          <p className="text-sm text-muted-foreground">
            Personas vinculadas a la empresa actual. Las nuevas solicitudes quedan pendientes hasta tu aprobación.
          </p>
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
                  La persona debe haber creado su cuenta en la plataforma. Pídele su ID de usuario (UUID) que aparece en su pantalla de bienvenida.
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

      {isAdmin && pending.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Pendientes de aprobación ({pending.length})</h2>
          <div className="overflow-hidden rounded-xl border border-amber-200 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/10">
            <table className="w-full text-sm">
              <thead className="bg-amber-100/60 dark:bg-amber-950/30">
                <tr>
                  <th className="px-4 py-2 text-left">Nombre</th>
                  <th className="px-4 py-2 text-left">Cargo</th>
                  <th className="px-4 py-2 text-left">Rol</th>
                  <th className="px-4 py-2 text-left">User ID</th>
                  <th className="px-4 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((w: any) => (
                  <tr key={w.id} className="border-t border-border">
                    <td className="px-4 py-2">{w.profiles?.full_name || "(sin perfil)"}</td>
                    <td className="px-4 py-2">{w.position ?? "—"}</td>
                    <td className="px-4 py-2 capitalize">{w.role}</td>
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{w.user_id.slice(0, 8)}…</td>
                    <td className="px-4 py-2 text-right">
                      <Button size="sm" className="mr-2" onClick={() => setStatus.mutate({ id: w.id, status: "aprobado" })}>
                        <Check className="mr-1 h-3 w-3" /> Aprobar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: w.id, status: "rechazado" })}>
                        <X className="mr-1 h-3 w-3" /> Rechazar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Activos ({approved.length})</h2>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-secondary-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Nombre</th>
                <th className="px-4 py-2 text-left">Cargo</th>
                <th className="px-4 py-2 text-left">Rol</th>
                <th className="px-4 py-2 text-left">Estado</th>
                <th className="px-4 py-2 text-left">User ID</th>
                {isAdmin && <th className="px-4 py-2"></th>}
              </tr>
            </thead>
            <tbody>
              {[...approved, ...rejected].map((w: any) => (
                <tr key={w.id} className="border-t border-border">
                  <td className="px-4 py-2">{w.profiles?.full_name ?? "—"}</td>
                  <td className="px-4 py-2">{w.position ?? "—"}</td>
                  <td className="px-4 py-2 capitalize">{w.role}</td>
                  <td className="px-4 py-2">{statusBadge(w.status)}</td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{w.user_id.slice(0, 8)}…</td>
                  {isAdmin && (
                    <td className="px-4 py-2 text-right">
                      {w.status === "rechazado" && (
                        <Button size="sm" variant="outline" className="mr-2" onClick={() => setStatus.mutate({ id: w.id, status: "aprobado" })}>
                          <Check className="mr-1 h-3 w-3" /> Aprobar
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => remove.mutate(w.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
              {approved.length + rejected.length === 0 && (
                <tr><td colSpan={isAdmin ? 6 : 5} className="px-4 py-10 text-center text-muted-foreground">Sin trabajadores activos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Empty() {
  return <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">Selecciona una empresa.</div>;
}
